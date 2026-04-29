import { compareResponseToBaseline, createResponseFingerprint } from "../../src/shared/response-analysis";

describe("createResponseFingerprint", () => {
  it("captures stable response properties and body metadata", async () => {
    const response = new Response("login failed", {
      headers: {
        "content-length": "12"
      },
      status: 200
    });

    const fingerprint = await createResponseFingerprint(response);

    expect(fingerprint.status).toBe(200);
    expect(fingerprint.authSignal).toBe("failure");
    expect(fingerprint.bodyLength).toBe("login failed".length);
    expect(fingerprint.bodyHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(fingerprint.clientRedirectTarget).toBeNull();
    expect(fingerprint.contentLengthHeader).toBe("12");
    expect(fingerprint.pageSignature).toMatch(/^[0-9a-f]{8}$/u);
    expect(fingerprint.pageTitle).toBe("");
  });

  it("detects client-side login redirects in 200 responses", async () => {
    const response = new Response("<script>alert('Login successful!');location.href='xxxxmleee.php';</script>", {
      status: 200
    });

    const fingerprint = await createResponseFingerprint(response);

    expect(fingerprint.status).toBe(200);
    expect(fingerprint.authSignal).toBe("success");
    expect(fingerprint.clientRedirectTarget).toBe("xxxxmleee.php");
  });

  it("creates different page signatures when login changes the rendered page", async () => {
    const loginPage = new Response(
      "<html><head><title>Login</title></head><body><form><input name='username'><input type='password'></form></body></html>",
      { status: 200 }
    );
    const accountPage = new Response(
      "<html><head><title>Account</title></head><body><h1>Control Panel</h1><p>signed session</p></body></html>",
      { status: 200 }
    );

    const loginFingerprint = await createResponseFingerprint(loginPage);
    const accountFingerprint = await createResponseFingerprint(accountPage);

    expect(loginFingerprint.pageTitle).toBe("login");
    expect(accountFingerprint.pageTitle).toBe("account");
    expect(accountFingerprint.pageSignature).not.toBe(loginFingerprint.pageSignature);
  });
});

describe("compareResponseToBaseline", () => {
  const baseline = {
    authSignal: "failure" as const,
    bodyHash: "aaaaaaaa",
    bodyLength: 1000,
    clientRedirectTarget: null,
    contentLengthHeader: "1000",
    finalUrl: "https://example.com/login",
    location: null,
    pageSignature: "11111111",
    pageTitle: "login",
    redirected: false,
    status: 200
  };

  it("marks redirect or location changes as likely hits", () => {
    const result = compareResponseToBaseline(
      {
        ...baseline,
        location: "/dashboard",
        status: 302
      },
      baseline
    );

    expect(result.likelyHit).toBe(true);
    expect(result.verdict).toBe("maybe-success");
    expect(result.detail).toContain("Maybe Success");
  });

  it("marks success text and client-side redirects as likely hits when status remains 200", () => {
    const result = compareResponseToBaseline(
      {
        ...baseline,
        authSignal: "success",
        bodyHash: "bbbbbbbb",
        bodyLength: 1016,
        clientRedirectTarget: "xxxxmleee.php"
      },
      baseline
    );

    expect(result.likelyHit).toBe(true);
    expect(result.verdict).toBe("success");
    expect(result.detail).toContain("Success");
    expect(result.detail).toContain("client redirect xxxxmleee.php");
    expect(result.detail).toContain("success marker found");
  });

  it("marks disappeared failure text as a likely hit", () => {
    const result = compareResponseToBaseline(
      {
        ...baseline,
        authSignal: "unknown",
        bodyHash: "bbbbbbbb",
        bodyLength: 1004
      },
      baseline
    );

    expect(result.likelyHit).toBe(true);
    expect(result.verdict).toBe("maybe-success");
    expect(result.detail).toContain("failure marker disappeared");
  });

  it("marks meaningful body length changes as likely hits even when status stays 200", () => {
    const result = compareResponseToBaseline(
      {
        ...baseline,
        bodyHash: "bbbbbbbb",
        bodyLength: 1300
      },
      baseline
    );

    expect(result.likelyHit).toBe(true);
    expect(result.verdict).toBe("maybe-success");
    expect(result.detail).toContain("body length 1000->1300");
  });

  it("marks changed page content as a likely hit without a redirect", () => {
    const result = compareResponseToBaseline(
      {
        ...baseline,
        bodyHash: "bbbbbbbb",
        bodyLength: 1010,
        pageSignature: "22222222",
        pageTitle: "account"
      },
      baseline
    );

    expect(result.likelyHit).toBe(true);
    expect(result.verdict).toBe("maybe-success");
    expect(result.detail).toContain("page changed login->account");
  });

  it("does not mark small dynamic body changes as likely hits", () => {
    const result = compareResponseToBaseline(
      {
        ...baseline,
        bodyHash: "bbbbbbbb",
        bodyLength: 1004
      },
      baseline
    );

    expect(result.likelyHit).toBe(false);
    expect(result.verdict).toBe("failed");
    expect(result.detail).toContain("body hash changed");
  });

  it("formats unchanged baseline matches as Failed", () => {
    const result = compareResponseToBaseline(baseline, baseline);

    expect(result.likelyHit).toBe(false);
    expect(result.verdict).toBe("failed");
    expect(result.detail).toBe("Failed");
  });
});
