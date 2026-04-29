import { createDictionarySet, parseTextDictionary } from "../../src/shared/dictionaries";

describe("dictionary stress", () => {
  it("deduplicates large dictionaries while preserving first-seen order", () => {
    const uniqueEntries = Array.from({ length: 2000 }, (_, index) => `entry-${index}`);
    let content = "";

    for (let index = 0; index < 40000; index += 1) {
      const entry = uniqueEntries[index % uniqueEntries.length];
      content += `${index % 3 === 0 ? ` ${entry} ` : entry}${index % 11 === 0 ? "\n\n" : "\n"}`;
    }

    expect(parseTextDictionary(content)).toEqual(uniqueEntries);
  });

  it("creates a large dictionary record without truncating entries", () => {
    const entries = Array.from({ length: 10000 }, (_, index) => `payload-${index}`);
    const result = createDictionarySet("directory", "large.txt", entries.join("\n"));

    expect(result.entries).toHaveLength(entries.length);
    expect(result.entries[0]).toBe("payload-0");
    expect(result.entries.at(-1)).toBe("payload-9999");
  });
});
