import { buildFormRequest, resolveTaskFieldName } from "./form-request";
import type { CapturedInputContext } from "./types";

const baseContext: CapturedInputContext = {
  tabId: 1,
  pageUrl: "https://example.com/login",
  selectorHint: "[name='username']",
  fieldName: "username",
  fieldLabel: "username",
  fieldValue: "admin",
  formAction: "https://example.com/login",
  formMethod: "POST",
  enctype: "application/x-www-form-urlencoded",
  otherFields: [{ name: "csrf", value: "token" }],
  capturedAt: new Date().toISOString()
};

describe("buildFormRequest", () => {
  it("builds a GET request with query parameters", () => {
    const result = buildFormRequest(
      {
        ...baseContext,
        formAction: "https://example.com/search?lang=zh",
        formMethod: "GET"
      },
      "payload"
    );

    expect(result.url).toContain("lang=zh");
    expect(result.url).toContain("csrf=token");
    expect(result.url).toContain("username=payload");
    expect(result.init.method).toBe("GET");
  });

  it("builds a POST request body", () => {
    const result = buildFormRequest(baseContext, "admin");

    expect(result.init.method).toBe("POST");
    expect(String(result.init.body)).toContain("csrf=token");
    expect(String(result.init.body)).toContain("username=admin");
  });

  it("retargets username fuzz while preserving the original password value", () => {
    const result = buildFormRequest(
      {
        ...baseContext,
        fieldLabel: "password",
        fieldName: "password",
        fieldValue: "root",
        formAction: "https://example.com/login",
        formMethod: "GET",
        otherFields: [
          { name: "username", value: "admin" },
          { name: "next", value: "login" }
        ]
      },
      "guest",
      "username"
    );

    expect(result.url).toContain("username=guest");
    expect(result.url).toContain("password=root");
    expect(result.url).toContain("next=login");
  });
});

describe("resolveTaskFieldName", () => {
  it("prefers the username field for username fuzz", () => {
    expect(
      resolveTaskFieldName(
        {
          ...baseContext,
          fieldLabel: "password",
          fieldName: "password",
          fieldValue: "root",
          otherFields: [
            { name: "username", value: "admin" },
            { name: "next", value: "login" }
          ]
        },
        "username"
      )
    ).toBe("username");
  });

  it("prefers the password field for password fuzz", () => {
    expect(
      resolveTaskFieldName(
        {
          ...baseContext,
          otherFields: [
            { name: "password", value: "root" },
            { name: "next", value: "login" }
          ]
        },
        "password"
      )
    ).toBe("password");
  });
});
