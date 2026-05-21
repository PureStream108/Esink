import { createDictionarySet } from "../shared/dictionaries";
import type { DictionaryEntrySet, FuzzType } from "../shared/types";

const FIXTURE_MAP: Record<FuzzType, { filename: string; content: string }> = {
  directory: {
    filename: "directory-dev.txt",
    content: ["admin", "api", "backup", "robots.txt", "uploads", "debug", "login.php"].join("\n")
  },
  ssti: {
    filename: "ssti-dev.txt",
    content: ["{{7*7}}", "${7*7}", "<%= 7 * 7 %>", "#{7*7}"].join("\n")
  },
  ssrf: {
    filename: "ssrf-dev.txt",
    content: [
      "http://127.0.0.1",
      "http://localhost",
      "http://169.254.169.254/latest/meta-data/",
      "http://example.com/internal"
    ].join("\n")
  },
  xss: {
    filename: "xss-dev.txt",
    content: [
      "<script>alert(1)</script>",
      "\"><svg/onload=alert(1)>",
      "'><img src=x onerror=alert(1)>",
      "javascript:alert(1)"
    ].join("\n")
  },
  rce: {
    filename: "rce-dev.txt",
    content: [";id", "&& whoami", "| cat /etc/passwd", "`id`"].join("\n")
  },
  username: {
    filename: "username-dev.txt",
    content: ["admin", "root", "test", "guest"].join("\n")
  },
  password: {
    filename: "password-dev.txt",
    content: ["admin123", "password", "123456", "letmein"].join("\n")
  }
};

export function shouldSeedDevelopmentDictionaries(): boolean {
  return import.meta.env.MODE === "development-seed";
}

export function getDevelopmentSeedDictionary(type: FuzzType): DictionaryEntrySet {
  const fixture = FIXTURE_MAP[type];
  return createDictionarySet(type, fixture.filename, fixture.content, "development-seed");
}
