import type { CapturedInputContext, FuzzType } from "./types";

export interface BuiltFormRequest {
  url: string;
  init: RequestInit;
}

function appendFieldValue(target: URLSearchParams | FormData, name: string, value: string): void {
  target.append(name, value);
}

function scoreFieldName(name: string, taskType: "username" | "password"): number {
  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    return -1;
  }

  if (taskType === "password") {
    if (normalized === "password" || normalized === "passwd" || normalized === "pwd") {
      return 100;
    }

    if (normalized.includes("password") || normalized.includes("passwd") || normalized.includes("pwd")) {
      return 80;
    }

    if (normalized.includes("pass") || normalized.includes("secret")) {
      return 60;
    }

    return -1;
  }

  if (normalized === "username" || normalized === "user" || normalized === "login" || normalized === "email") {
    return 100;
  }

  if (
    normalized.includes("username") ||
    normalized.includes("login") ||
    normalized.includes("account") ||
    normalized.includes("email")
  ) {
    return 80;
  }

  if (
    normalized.includes("user") ||
    normalized.includes("name") ||
    normalized.includes("mail") ||
    normalized.includes("phone")
  ) {
    return 55;
  }

  return -1;
}

export function resolveTaskFieldName(context: CapturedInputContext, taskType: FuzzType): string {
  if (taskType !== "username" && taskType !== "password") {
    return context.fieldName;
  }

  const candidates = [context.fieldName, ...context.otherFields.map((field) => field.name)].filter(Boolean);
  let selectedFieldName = context.fieldName;
  let bestScore = scoreFieldName(context.fieldName, taskType);

  for (const candidate of candidates) {
    const score = scoreFieldName(candidate, taskType);

    if (score > bestScore) {
      bestScore = score;
      selectedFieldName = candidate;
    }
  }

  return selectedFieldName || context.fieldName;
}

export function buildFormRequest(
  context: CapturedInputContext,
  payload: string,
  targetFieldName: string = context.fieldName
): BuiltFormRequest {
  const requestUrl = new URL(context.formAction || context.pageUrl);
  const method = context.formMethod.toUpperCase() === "POST" ? "POST" : "GET";

  if (!targetFieldName) {
    throw new Error("目标输入框缺少字段名，无法构造请求。");
  }

  const mergedFields = context.fieldName
    ? [{ name: context.fieldName, value: context.fieldValue }, ...context.otherFields]
    : [...context.otherFields];
  const preservedFields = mergedFields.filter((field) => field.name !== targetFieldName);

  if (method === "GET") {
    const params = new URLSearchParams(requestUrl.search);

    for (const field of preservedFields) {
      appendFieldValue(params, field.name, field.value);
    }

    params.append(targetFieldName, payload);
    requestUrl.search = params.toString();

    return {
      url: requestUrl.toString(),
      init: {
        credentials: "include",
        method: "GET",
        redirect: "manual"
      }
    };
  }

  if (context.enctype.toLowerCase().startsWith("multipart/form-data")) {
    const formData = new FormData();

    for (const field of preservedFields) {
      appendFieldValue(formData, field.name, field.value);
    }

    appendFieldValue(formData, targetFieldName, payload);

    return {
      url: requestUrl.toString(),
      init: {
        body: formData,
        credentials: "include",
        method: "POST",
        redirect: "manual"
      }
    };
  }

  const body = new URLSearchParams();

  for (const field of preservedFields) {
    appendFieldValue(body, field.name, field.value);
  }

  appendFieldValue(body, targetFieldName, payload);

  return {
    url: requestUrl.toString(),
    init: {
      body,
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      method: "POST",
      redirect: "manual"
    }
  };
}
