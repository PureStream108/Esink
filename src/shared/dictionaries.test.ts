import { createDictionarySet, parseTextDictionary } from "./dictionaries";

describe("parseTextDictionary", () => {
  it("trims blank lines and removes duplicates", () => {
    expect(parseTextDictionary(" admin \n\nuser\nadmin\r\nroot ")).toEqual([
      "admin",
      "user",
      "root"
    ]);
  });
});

describe("createDictionarySet", () => {
  it("creates metadata for persisted dictionaries", () => {
    const result = createDictionarySet("directory", "sample.txt", "admin\napi");

    expect(result.filename).toBe("sample.txt");
    expect(result.entries).toEqual(["admin", "api"]);
    expect(result.source).toBe("user");
  });
});
