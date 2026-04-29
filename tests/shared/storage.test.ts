import { getLocalStorage, setLocalStorage } from "../../src/shared/browser";
import {
  createInitialUiState,
  getBaseUiState,
  getStoredDictionaries,
  saveDictionarySet
} from "../../src/shared/storage";
import type {
  CapturedInputContext,
  DictionaryEntrySet,
  DirectorySettings,
  LastPageContext
} from "../../src/shared/types";

vi.mock("../../src/shared/browser", () => ({
  getLocalStorage: vi.fn(),
  setLocalStorage: vi.fn()
}));

const mockedGetLocalStorage = vi.mocked(getLocalStorage);
const mockedSetLocalStorage = vi.mocked(setLocalStorage);

const sampleDictionary: DictionaryEntrySet = {
  type: "directory",
  filename: "directory.txt",
  entries: ["admin", "api"],
  updatedAt: "2026-04-23T00:00:00.000Z",
  source: "user"
};

const sampleDirectorySettings: DirectorySettings = {
  lockedOrigin: "https://example.com",
  pathPrefix: "/admin",
  visibleStatusBuckets: ["200", "4xx"],
  lastLoadedUrl: "https://example.com/admin",
  updatedAt: "2026-04-23T00:00:00.000Z"
};

const sampleCapturedContext: CapturedInputContext = {
  tabId: 3,
  pageUrl: "https://example.com/login",
  selectorHint: "[name='username']",
  fieldName: "username",
  fieldLabel: "username",
  fieldValue: "admin",
  formAction: "https://example.com/login",
  formMethod: "POST",
  enctype: "application/x-www-form-urlencoded",
  otherFields: [{ name: "csrf", value: "token" }],
  capturedAt: "2026-04-23T00:00:00.000Z"
};

const sampleLastPageContext: LastPageContext = {
  tabId: 3,
  url: "https://example.com/login",
  updatedAt: "2026-04-23T00:00:00.000Z"
};

describe("storage helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSetLocalStorage.mockResolvedValue();
  });

  it("fills missing dictionary slots with null", async () => {
    mockedGetLocalStorage.mockResolvedValue({});

    const result = await getStoredDictionaries();

    expect(result.directory).toBeNull();
    expect(result.username).toBeNull();
    expect(result.password).toBeNull();
  });

  it("persists a dictionary set into the dictionary record", async () => {
    mockedGetLocalStorage.mockResolvedValue({});

    const result = await saveDictionarySet(sampleDictionary);

    expect(result.directory).toEqual(sampleDictionary);
    expect(mockedSetLocalStorage).toHaveBeenCalledWith({
      dictionaries: result
    });
  });

  it("aggregates the persisted UI base state", async () => {
    mockedGetLocalStorage
      .mockResolvedValueOnce({
        dictionaries: {
          directory: sampleDictionary
        }
      })
      .mockResolvedValueOnce({
        directorySettings: sampleDirectorySettings
      })
      .mockResolvedValueOnce({
        capturedContext: sampleCapturedContext
      })
      .mockResolvedValueOnce({
        lastPageContext: sampleLastPageContext
      });

    const result = await getBaseUiState();

    expect(result.dictionaries.directory).toEqual(sampleDictionary);
    expect(result.directorySettings).toEqual(sampleDirectorySettings);
    expect(result.capturedContext).toEqual(sampleCapturedContext);
    expect(result.lastPageContext).toEqual(sampleLastPageContext);
  });

  it("creates a clean initial UI state", () => {
    const result = createInitialUiState();

    expect(result.results).toEqual([]);
    expect(result.progress.active).toBe(false);
    expect(result.progress.message).toBe("等待启动");
    expect(result.dictionaries.directory).toBeNull();
  });
});
