import type { DictionaryRecord, FuzzType, StatusBucket, TaskProgressState } from "./types";

export const FUZZ_TYPES: readonly FuzzType[] = [
  "directory",
  "ssti",
  "ssrf",
  "xss",
  "rce",
  "username",
  "password"
];

export const FUZZ_LABELS: Record<FuzzType, string> = {
  directory: "Directory",
  ssti: "SSTI",
  ssrf: "SSRF",
  xss: "XSS",
  rce: "RCE",
  username: "Username",
  password: "Password"
};

export const DEFAULT_VISIBLE_STATUS_BUCKETS: StatusBucket[] = ["200"];

export const CONTEXT_MENU_ID = "e-sink-open";

export const EXTENSION_WINDOW_PATH = "src/window/index.html";

export const EXTENSION_WINDOW_OPTIONS = {
  width: 520,
  height: 820,
  minWidth: 420,
  minHeight: 640
} as const;

export const MIN_LAYOUT_WIDTH = 420;

export const RESULT_LIMIT = 500;

export const DIRECTORY_CONCURRENCY = 8;

export const INPUT_FUZZ_CONCURRENCY = 4;

export const EMPTY_PROGRESS_STATE: TaskProgressState = {
  active: false,
  taskType: null,
  total: 0,
  completed: 0,
  startedAt: null,
  cancelled: false,
  message: "等待启动"
};

export function createEmptyDictionaryRecord(): DictionaryRecord {
  return FUZZ_TYPES.reduce<DictionaryRecord>((accumulator, type) => {
    accumulator[type] = null;
    return accumulator;
  }, {} as DictionaryRecord);
}
