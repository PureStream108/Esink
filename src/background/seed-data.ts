import directoryFixture from "../../fixtures/directory.txt?raw";
import passwordFixture from "../../fixtures/password.txt?raw";
import rceFixture from "../../fixtures/rce.txt?raw";
import ssrfFixture from "../../fixtures/ssrf.txt?raw";
import sstiFixture from "../../fixtures/ssti.txt?raw";
import usernameFixture from "../../fixtures/username.txt?raw";
import xssFixture from "../../fixtures/xss.txt?raw";
import { createDictionarySet } from "../shared/dictionaries";
import type { DictionaryEntrySet, FuzzType } from "../shared/types";

const FIXTURE_MAP: Record<FuzzType, { filename: string; content: string }> = {
  directory: {
    filename: "directory-dev.txt",
    content: directoryFixture
  },
  ssti: {
    filename: "ssti-dev.txt",
    content: sstiFixture
  },
  ssrf: {
    filename: "ssrf-dev.txt",
    content: ssrfFixture
  },
  xss: {
    filename: "xss-dev.txt",
    content: xssFixture
  },
  rce: {
    filename: "rce-dev.txt",
    content: rceFixture
  },
  username: {
    filename: "username-dev.txt",
    content: usernameFixture
  },
  password: {
    filename: "password-dev.txt",
    content: passwordFixture
  }
};

export function shouldSeedDevelopmentDictionaries(): boolean {
  return import.meta.env.MODE === "development-seed";
}

export function getDevelopmentSeedDictionary(type: FuzzType): DictionaryEntrySet {
  const fixture = FIXTURE_MAP[type];
  return createDictionarySet(type, fixture.filename, fixture.content, "development-seed");
}
