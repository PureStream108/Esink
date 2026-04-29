import {
  buildDirectorySettingsFromUrl,
  buildDirectoryTargetUrl,
  getEditableUrlPreview,
  getStatusBucket,
  isHttpUrl,
  isVisibleStatus,
  mergeDirectorySettingsWithUrl,
  normalizePathPrefix
} from "../../src/shared/url";

describe("normalizePathPrefix", () => {
  it("normalizes leading and trailing slashes", () => {
    expect(normalizePathPrefix("api/")).toBe("/api");
    expect(normalizePathPrefix("/")).toBe("/");
  });
});

describe("buildDirectorySettingsFromUrl", () => {
  it("locks origin and keeps pathname editable", () => {
    const settings = buildDirectorySettingsFromUrl("https://example.com/api/v1?x=1");

    expect(settings.lockedOrigin).toBe("https://example.com");
    expect(settings.pathPrefix).toBe("/api/v1");
    expect(settings.visibleStatusBuckets).toEqual(["200"]);
  });
});

describe("mergeDirectorySettingsWithUrl", () => {
  it("preserves saved path when the origin stays the same", () => {
    const previous = buildDirectorySettingsFromUrl("https://example.com/admin");
    const merged = mergeDirectorySettingsWithUrl("https://example.com/profile", previous);

    expect(merged.lockedOrigin).toBe("https://example.com");
    expect(merged.pathPrefix).toBe("/admin");
    expect(merged.lastLoadedUrl).toBe("https://example.com/profile");
  });

  it("resets to the new origin when the page changes to another site", () => {
    const previous = buildDirectorySettingsFromUrl("https://example.com/admin");
    const merged = mergeDirectorySettingsWithUrl("https://target.test/api", previous);

    expect(merged.lockedOrigin).toBe("https://target.test");
    expect(merged.pathPrefix).toBe("/api");
  });
});

describe("buildDirectoryTargetUrl", () => {
  it("appends dictionary entries below the chosen path prefix", () => {
    expect(buildDirectoryTargetUrl("https://example.com", "/api", "admin")).toBe(
      "https://example.com/api/admin"
    );
  });

  it("normalizes repeated slashes before joining", () => {
    expect(buildDirectoryTargetUrl("https://example.com", "/api/", "/admin")).toBe(
      "https://example.com/api/admin"
    );
  });
});

describe("getStatusBucket", () => {
  it("groups status codes by bucket", () => {
    expect(getStatusBucket(200)).toBe("200");
    expect(getStatusBucket(302)).toBe("3xx");
    expect(getStatusBucket(404)).toBe("4xx");
    expect(getStatusBucket(500)).toBe("5xx");
  });
});

describe("isVisibleStatus", () => {
  it("matches statuses against the configured buckets", () => {
    expect(isVisibleStatus(200, ["200"])).toBe(true);
    expect(isVisibleStatus(302, ["200", "3xx"])).toBe(true);
    expect(isVisibleStatus(404, ["200", "3xx"])).toBe(false);
  });
});

describe("getEditableUrlPreview", () => {
  it("builds a normalized preview URL", () => {
    expect(
      getEditableUrlPreview({
        lockedOrigin: "https://example.com",
        pathPrefix: "api/",
        visibleStatusBuckets: ["200"],
        lastLoadedUrl: "https://example.com/api",
        updatedAt: new Date().toISOString()
      })
    ).toBe("https://example.com/api");
  });
});

describe("isHttpUrl", () => {
  it("accepts http and https URLs only", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
    expect(isHttpUrl("not-a-url")).toBe(false);
  });
});
