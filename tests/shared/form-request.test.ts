import { buildFormRequest, resolveTaskFieldName } from "../../src/shared/form-request";
import type { CapturedInputContext } from "../../src/shared/types";

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

  it("builds multipart form-data when required", () => {
    const result = buildFormRequest(
      {
        ...baseContext,
        enctype: "multipart/form-data; boundary=test"
      },
      "admin"
    );

    expect(result.init.method).toBe("POST");
    expect(result.init.body).toBeInstanceOf(FormData);
    expect((result.init.body as FormData).get("csrf")).toBe("token");
    expect((result.init.body as FormData).get("username")).toBe("admin");
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

  it("throws when the target field name is missing", () => {
    expect(() =>
      buildFormRequest(
        {
          ...baseContext,
          fieldName: ""
        },
        "payload",
        ""
      )
    ).toThrow("目标输入框缺少字段名，无法构造请求。");
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

  it("falls back to the captured field when no better match exists", () => {
    expect(
      resolveTaskFieldName(
        {
          ...baseContext,
          fieldName: "customField",
          otherFields: [
            { name: "ticket", value: "token" },
            { name: "nonce", value: "value" }
          ]
        },
        "password"
      )
    ).toBe("customField");
  });
});
