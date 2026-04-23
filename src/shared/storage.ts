import {
  createEmptyDictionaryRecord,
  EMPTY_PROGRESS_STATE
} from "./constants";
import { getLocalStorage, setLocalStorage } from "./browser";
import type {
  CapturedInputContext,
  DictionaryEntrySet,
  DictionaryRecord,
  DirectorySettings,
  LastPageContext,
  UiState
} from "./types";

const STORAGE_KEYS = {
  capturedContext: "capturedContext",
  dictionaries: "dictionaries",
  directorySettings: "directorySettings",
  lastPageContext: "lastPageContext"
} as const;

interface StorageShape {
  capturedContext?: CapturedInputContext | null;
  dictionaries?: Partial<DictionaryRecord>;
  directorySettings?: DirectorySettings | null;
  lastPageContext?: LastPageContext | null;
}

export async function getStoredDictionaries(): Promise<DictionaryRecord> {
  const storage = await getLocalStorage<StorageShape>(STORAGE_KEYS.dictionaries);
  return {
    ...createEmptyDictionaryRecord(),
    ...(storage.dictionaries ?? {})
  };
}

export async function saveDictionarySet(dictionary: DictionaryEntrySet): Promise<DictionaryRecord> {
  const current = await getStoredDictionaries();
  const next = {
    ...current,
    [dictionary.type]: dictionary
  };

  await setLocalStorage({
    [STORAGE_KEYS.dictionaries]: next
  });

  return next;
}

export async function getDirectorySettings(): Promise<DirectorySettings | null> {
  const storage = await getLocalStorage<StorageShape>(STORAGE_KEYS.directorySettings);
  return storage.directorySettings ?? null;
}

export async function saveDirectorySettings(settings: DirectorySettings): Promise<void> {
  await setLocalStorage({
    [STORAGE_KEYS.directorySettings]: settings
  });
}

export async function getCapturedContext(): Promise<CapturedInputContext | null> {
  const storage = await getLocalStorage<StorageShape>(STORAGE_KEYS.capturedContext);
  return storage.capturedContext ?? null;
}

export async function saveCapturedContext(context: CapturedInputContext | null): Promise<void> {
  await setLocalStorage({
    [STORAGE_KEYS.capturedContext]: context
  });
}

export async function getLastPageContext(): Promise<LastPageContext | null> {
  const storage = await getLocalStorage<StorageShape>(STORAGE_KEYS.lastPageContext);
  return storage.lastPageContext ?? null;
}

export async function saveLastPageContext(context: LastPageContext | null): Promise<void> {
  await setLocalStorage({
    [STORAGE_KEYS.lastPageContext]: context
  });
}

export async function getBaseUiState(): Promise<Omit<UiState, "results" | "progress">> {
  const [dictionaries, directorySettings, capturedContext, lastPageContext] = await Promise.all([
    getStoredDictionaries(),
    getDirectorySettings(),
    getCapturedContext(),
    getLastPageContext()
  ]);

  return {
    dictionaries,
    directorySettings,
    capturedContext,
    lastPageContext
  };
}

export function createInitialUiState(): UiState {
  return {
    dictionaries: createEmptyDictionaryRecord(),
    directorySettings: null,
    capturedContext: null,
    lastPageContext: null,
    results: [],
    progress: EMPTY_PROGRESS_STATE
  };
}
