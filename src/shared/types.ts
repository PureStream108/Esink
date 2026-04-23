export type FuzzType =
  | "directory"
  | "ssti"
  | "ssrf"
  | "xss"
  | "rce"
  | "username"
  | "password";

export type StatusBucket = "200" | "3xx" | "4xx" | "5xx";

export type ResultLevel = "info" | "success" | "error";

export interface DictionaryEntrySet {
  type: FuzzType;
  filename: string;
  entries: string[];
  updatedAt: string;
  source: "user" | "development-seed";
}

export type DictionaryRecord = Record<FuzzType, DictionaryEntrySet | null>;

export interface DirectorySettings {
  lockedOrigin: string;
  pathPrefix: string;
  visibleStatusBuckets: StatusBucket[];
  lastLoadedUrl: string;
  updatedAt: string;
}

export interface FormFieldEntry {
  name: string;
  value: string;
}

export interface CapturedInputContext {
  tabId: number;
  pageUrl: string;
  selectorHint: string;
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  formAction: string;
  formMethod: "GET" | "POST";
  enctype: string;
  otherFields: FormFieldEntry[];
  capturedAt: string;
}

export interface LastPageContext {
  tabId: number;
  url: string;
  updatedAt: string;
}

export interface FuzzResultItem {
  id: string;
  taskType: FuzzType;
  timestamp: string;
  requestUrl: string;
  payload: string;
  status: number | null;
  statusBucket?: StatusBucket;
  level: ResultLevel;
  summary: string;
}

export interface TaskProgressState {
  active: boolean;
  taskType: FuzzType | null;
  total: number;
  completed: number;
  startedAt: string | null;
  cancelled: boolean;
  message: string;
}

export interface UiState {
  dictionaries: DictionaryRecord;
  directorySettings: DirectorySettings | null;
  capturedContext: CapturedInputContext | null;
  lastPageContext: LastPageContext | null;
  results: FuzzResultItem[];
  progress: TaskProgressState;
}
