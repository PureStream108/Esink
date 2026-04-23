import type {
  CapturedInputContext,
  DictionaryEntrySet,
  DirectorySettings,
  FuzzResultItem,
  FuzzType,
  UiState
} from "./types";

export type RuntimeRequest =
  | { kind: "captureTarget"; context: CapturedInputContext | null }
  | { kind: "getUiState" }
  | { kind: "resetSession" }
  | { kind: "clearDisplay" }
  | { kind: "loadActiveUrl" }
  | { kind: "saveDirectorySettings"; settings: DirectorySettings }
  | { kind: "saveDictionary"; dictionary: DictionaryEntrySet }
  | { kind: "startTask"; taskType: FuzzType }
  | { kind: "cancelTask" }
  | { kind: "openExtensionWindow" };

export type RuntimeResponse =
  | { ok: true; state?: UiState; settings?: DirectorySettings }
  | { ok: false; error: string };

export type RuntimeEvent =
  | { kind: "capturedContextUpdated"; context: CapturedInputContext | null }
  | { kind: "dictionaryUpdated"; dictionary: DictionaryEntrySet }
  | { kind: "directorySettingsUpdated"; settings: DirectorySettings | null }
  | { kind: "lastPageContextUpdated"; tabId: number | null; url: string | null }
  | { kind: "taskStateUpdated"; state: UiState["progress"]; latestResult?: FuzzResultItem };
