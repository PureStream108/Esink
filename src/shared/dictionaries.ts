import type { DictionaryEntrySet, FuzzType } from "./types";

export function parseTextDictionary(content: string): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || seen.has(line)) {
      continue;
    }

    seen.add(line);
    entries.push(line);
  }

  return entries;
}

export function ensureTxtFilename(filename: string): void {
  if (!/\.txt$/iu.test(filename)) {
    throw new Error("只允许上传 txt 文件。");
  }
}

export function createDictionarySet(
  type: FuzzType,
  filename: string,
  content: string,
  source: DictionaryEntrySet["source"] = "user"
): DictionaryEntrySet {
  const entries = parseTextDictionary(content);

  if (entries.length === 0) {
    throw new Error("字典为空，至少需要一条有效内容。");
  }

  return {
    type,
    filename,
    entries,
    updatedAt: new Date().toISOString(),
    source
  };
}
