import { createDictionarySet, ensureTxtFilename, parseTextDictionary } from "../../src/shared/dictionaries";

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

  it("rejects empty dictionaries after normalization", () => {
    expect(() => createDictionarySet("directory", "empty.txt", "\n \r\n")).toThrow(
      "字典为空，至少需要一条有效内容。"
    );
  });
});

describe("ensureTxtFilename", () => {
  it("accepts txt files case-insensitively", () => {
    expect(() => ensureTxtFilename("payload.TXT")).not.toThrow();
  });

  it("rejects files that are not txt", () => {
    expect(() => ensureTxtFilename("payload.json")).toThrow("只允许上传 txt 文件。");
  });
});
