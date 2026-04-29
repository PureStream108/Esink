export interface ResponseFingerprint {
  authSignal: "failure" | "success" | "unknown";
  bodyHash: string;
  bodyLength: number;
  clientRedirectTarget: string | null;
  contentLengthHeader: string | null;
  finalUrl: string;
  location: string | null;
  pageSignature: string;
  pageTitle: string;
  redirected: boolean;
  status: number;
}

export interface ResponseComparison {
  detail: string;
  likelyHit: boolean;
  verdict: "failed" | "maybe-success" | "success";
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function detectClientRedirectTarget(body: string): string | null {
  const match = body.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/iu);
  return match?.[1] ?? null;
}

function detectAuthSignal(body: string): ResponseFingerprint["authSignal"] {
  const normalized = body.toLowerCase();
  const failurePatterns = [
    /invalid/u,
    /invaild/u,
    /incorrect/u,
    /wrong/u,
    /failed/u,
    /failure/u,
    /denied/u,
    /用户名或密码错误/u,
    /密码错误/u,
    /登录失败/u,
    /认证失败/u,
    /无效/u,
    /错误/u
  ];
  const successPatterns = [
    /login successful/u,
    /logged in/u,
    /welcome/u,
    /dashboard/u,
    /success/u,
    /登录成功/u,
    /登陆成功/u,
    /欢迎/u
  ];

  if (failurePatterns.some((pattern) => pattern.test(normalized))) {
    return "failure";
  }

  if (successPatterns.some((pattern) => pattern.test(normalized))) {
    return "success";
  }

  return "unknown";
}

function stripMarkup(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function extractTitle(body: string): string {
  const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "";
  return stripMarkup(title);
}

function createPageSignature(body: string): string {
  const formCount = body.match(/<form\b/giu)?.length ?? 0;
  const passwordFieldCount = body.match(/<input\b[^>]*type=["']?password/giu)?.length ?? 0;
  const inputCount = body.match(/<input\b/giu)?.length ?? 0;
  const linkCount = body.match(/<a\b/giu)?.length ?? 0;
  const buttonCount = body.match(/<button\b/giu)?.length ?? 0;
  const normalizedText = stripMarkup(body);
  const textSample = normalizedText.slice(0, 2048);

  return hashString(
    [
      extractTitle(body),
      `forms:${formCount}`,
      `passwords:${passwordFieldCount}`,
      `inputs:${inputCount}`,
      `links:${linkCount}`,
      `buttons:${buttonCount}`,
      textSample
    ].join("|")
  );
}

export async function createResponseFingerprint(response: Response): Promise<ResponseFingerprint> {
  let body = "";

  try {
    body = await response.text();
  } catch {
    body = "";
  }

  return {
    authSignal: detectAuthSignal(body),
    bodyHash: hashString(body),
    bodyLength: body.length,
    clientRedirectTarget: detectClientRedirectTarget(body),
    contentLengthHeader: response.headers.get("content-length"),
    finalUrl: response.url,
    location: response.headers.get("location"),
    pageSignature: createPageSignature(body),
    pageTitle: extractTitle(body),
    redirected: response.redirected,
    status: response.status
  };
}

export function compareResponseToBaseline(
  current: ResponseFingerprint,
  baseline: ResponseFingerprint
): ResponseComparison {
  const strongSignals: string[] = [];
  const weakSignals: string[] = [];

  if (current.status !== baseline.status) {
    strongSignals.push(`status ${baseline.status}->${current.status}`);
  }

  if (current.location !== baseline.location) {
    strongSignals.push("location changed");
  }

  if (current.finalUrl !== baseline.finalUrl) {
    strongSignals.push("url changed");
  }

  if (current.redirected !== baseline.redirected) {
    strongSignals.push("redirect changed");
  }

  if (current.clientRedirectTarget !== baseline.clientRedirectTarget) {
    strongSignals.push(
      current.clientRedirectTarget
        ? `client redirect ${current.clientRedirectTarget}`
        : "client redirect removed"
    );
  }

  if (current.authSignal !== baseline.authSignal) {
    if (current.authSignal === "success") {
      strongSignals.push("success marker found");
    } else if (baseline.authSignal === "failure" && current.authSignal === "unknown") {
      strongSignals.push("failure marker disappeared");
    } else {
      weakSignals.push(`auth marker ${baseline.authSignal}->${current.authSignal}`);
    }
  }

  if (current.pageSignature !== baseline.pageSignature) {
    strongSignals.push(
      current.pageTitle && current.pageTitle !== baseline.pageTitle
        ? `page changed ${baseline.pageTitle || "untitled"}->${current.pageTitle}`
        : "page changed"
    );
  }

  const lengthDelta = Math.abs(current.bodyLength - baseline.bodyLength);
  const lengthThreshold = Math.max(32, Math.ceil(baseline.bodyLength * 0.05));

  if (lengthDelta >= lengthThreshold) {
    strongSignals.push(`body length ${baseline.bodyLength}->${current.bodyLength}`);
  } else if (current.bodyHash !== baseline.bodyHash) {
    weakSignals.push("body hash changed");
  }

  const successSignals = [
    current.authSignal === "success",
    Boolean(current.clientRedirectTarget && current.clientRedirectTarget !== baseline.clientRedirectTarget)
  ];
  const likelyHit = strongSignals.length > 0;
  const verdict = successSignals.some(Boolean) ? "success" : likelyHit ? "maybe-success" : "failed";
  const signals = likelyHit ? strongSignals : weakSignals;
  const prefix = verdict === "success" ? "Success" : verdict === "maybe-success" ? "Maybe Success" : "Failed";
  const detail = signals.length > 0 ? `${prefix}: ${signals.join(", ")}` : prefix;

  return {
    detail,
    likelyHit,
    verdict
  };
}
