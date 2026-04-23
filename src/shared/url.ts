import { DEFAULT_VISIBLE_STATUS_BUCKETS } from "./constants";
import type { DirectorySettings, StatusBucket } from "./types";

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizePathPrefix(pathPrefix: string): string {
  if (!pathPrefix || pathPrefix === "/") {
    return "/";
  }

  const trimmed = pathPrefix.trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/u, "") : withLeadingSlash;

  return withoutTrailingSlash || "/";
}

export function buildDirectorySettingsFromUrl(
  urlString: string,
  previous?: DirectorySettings | null
): DirectorySettings {
  const parsed = new URL(urlString);

  return {
    lockedOrigin: parsed.origin,
    pathPrefix: normalizePathPrefix(parsed.pathname || "/"),
    visibleStatusBuckets: previous?.visibleStatusBuckets?.length
      ? previous.visibleStatusBuckets
      : DEFAULT_VISIBLE_STATUS_BUCKETS,
    lastLoadedUrl: parsed.toString(),
    updatedAt: new Date().toISOString()
  };
}

export function mergeDirectorySettingsWithUrl(
  currentUrl: string,
  previous: DirectorySettings | null
): DirectorySettings {
  if (!previous) {
    return buildDirectorySettingsFromUrl(currentUrl, null);
  }

  const parsed = new URL(currentUrl);

  if (parsed.origin !== previous.lockedOrigin) {
    return buildDirectorySettingsFromUrl(currentUrl, previous);
  }

  return {
    ...previous,
    lastLoadedUrl: parsed.toString(),
    updatedAt: new Date().toISOString()
  };
}

export function getStatusBucket(status: number): StatusBucket {
  if (status >= 300 && status < 400) {
    return "3xx";
  }

  if (status >= 400 && status < 500) {
    return "4xx";
  }

  if (status >= 500) {
    return "5xx";
  }

  return "200";
}

export function isVisibleStatus(status: number, visibleStatusBuckets: StatusBucket[]): boolean {
  return visibleStatusBuckets.includes(getStatusBucket(status));
}

export function buildDirectoryTargetUrl(
  lockedOrigin: string,
  pathPrefix: string,
  dictionaryEntry: string
): string {
  const sanitizedEntry = dictionaryEntry.replace(/^\/+/u, "");
  const normalizedPrefix = normalizePathPrefix(pathPrefix);
  const basePath = normalizedPrefix === "/" ? "/" : `${normalizedPrefix}/`;
  const url = new URL(`${basePath}${sanitizedEntry}`, lockedOrigin);
  return url.toString();
}

export function getEditableUrlPreview(settings: DirectorySettings): string {
  return `${settings.lockedOrigin}${normalizePathPrefix(settings.pathPrefix)}`;
}
