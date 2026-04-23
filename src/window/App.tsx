import { startTransition, useEffect, useRef, useState } from "react";

import { FUZZ_LABELS, FUZZ_TYPES, MIN_LAYOUT_WIDTH } from "../shared/constants";
import { sendRuntimeMessage } from "../shared/browser";
import { createDictionarySet, ensureTxtFilename } from "../shared/dictionaries";
import type { RuntimeEvent, RuntimeResponse } from "../shared/messages";
import type {
  CapturedInputContext,
  DirectorySettings,
  FuzzType,
  UiState
} from "../shared/types";
import { getEditableUrlPreview, normalizePathPrefix } from "../shared/url";
import { DictionaryList } from "./components/DictionaryList";
import { DirectorySettingsOverlay } from "./components/DirectorySettingsOverlay";
import { ParameterList } from "./components/ParameterList";
import { ResultStream } from "./components/ResultStream";

type ActiveView = "parameters" | "dictionaries";
type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "e-sink-theme";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function createFallbackUiState(): UiState {
  return {
    capturedContext: null,
    dictionaries: {
      directory: null,
      password: null,
      rce: null,
      ssrf: null,
      ssti: null,
      username: null,
      xss: null
    },
    directorySettings: null,
    lastPageContext: null,
    progress: {
      active: false,
      cancelled: false,
      completed: 0,
      message: "等待启动",
      startedAt: null,
      taskType: null,
      total: 0
    },
    results: []
  };
}

function isStartableInputTask(taskType: FuzzType, context: CapturedInputContext | null): boolean {
  if (taskType === "directory") {
    return true;
  }

  return Boolean(context?.fieldName && context.formAction);
}

export function App() {
  const [uiState, setUiState] = useState<UiState>(createFallbackUiState);
  const [activeView, setActiveView] = useState<ActiveView>("parameters");
  const [directoryDraft, setDirectoryDraft] = useState<DirectorySettings | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [feedback, setFeedback] = useState("等待操作");
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < MIN_LAYOUT_WIDTH);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "system" ? storedTheme : "light";
  });
  const fileInputMapRef = useRef<Record<FuzzType, HTMLInputElement | null>>({
    directory: null,
    password: null,
    rce: null,
    ssrf: null,
    ssti: null,
    username: null,
    xss: null
  });

  useEffect(() => {
    const handleMessage = (message: RuntimeEvent) => {
      startTransition(() => {
        setUiState((current) => {
          switch (message.kind) {
            case "capturedContextUpdated":
              return {
                ...current,
                capturedContext: message.context
              };
            case "dictionaryUpdated":
              return {
                ...current,
                dictionaries: {
                  ...current.dictionaries,
                  [message.dictionary.type]: message.dictionary
                }
              };
            case "directorySettingsUpdated":
              return {
                ...current,
                directorySettings: message.settings
              };
            case "lastPageContextUpdated":
              return {
                ...current,
                lastPageContext:
                  message.tabId && message.url
                    ? {
                        tabId: message.tabId,
                        updatedAt: new Date().toISOString(),
                        url: message.url
                      }
                    : null
              };
            case "taskStateUpdated":
              return {
                ...current,
                progress: message.state,
                results: message.latestResult
                  ? [...current.results, message.latestResult].slice(-500)
                  : current.results
              };
            default:
              return current;
          }
        });
      });
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.close();
      }
    };

    const handleResize = () => {
      setIsNarrow(window.innerWidth < MIN_LAYOUT_WIDTH);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    void loadInitialState();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  async function loadInitialState() {
    const response = await sendRuntimeMessage<{ ok: true; state: UiState } | { ok: false; error: string }>({
      kind: "resetSession"
    });

    if (response.ok) {
      setUiState(response.state);
      setFeedback("等待操作");
      return;
    }

    setFeedback(response.error);
  }

  async function handleStartTask(taskType: FuzzType) {
    const dictionary = uiState.dictionaries[taskType];

    if (!dictionary) {
      setFeedback(`${FUZZ_LABELS[taskType]} 还没有字典`);
      return;
    }

    if (!isStartableInputTask(taskType, uiState.capturedContext)) {
      setFeedback("请先在网页输入框上右键，然后回到插件启动任务");
      return;
    }

    const response = await sendRuntimeMessage<RuntimeResponse>({
      kind: "startTask",
      taskType
    });

    setFeedback(response.ok ? `已启动 ${FUZZ_LABELS[taskType]}` : response.error);
  }

  async function handleCancelTask() {
    await sendRuntimeMessage({
      kind: "cancelTask"
    });
    setFeedback("已请求取消当前任务");
  }

  async function handleResetDisplay() {
    const response = await sendRuntimeMessage<RuntimeResponse>({
      kind: "clearDisplay"
    });

    if (!response.ok) {
      setFeedback(response.error);
      return;
    }

    setUiState((current) => ({
      ...current,
      progress: response.state?.progress ?? current.progress,
      results: []
    }));
    setFeedback("显示已重置");
  }

  async function handleLoadActiveUrl() {
    const response = await sendRuntimeMessage<RuntimeResponse>({
      kind: "loadActiveUrl"
    });

    if (!response.ok || !response.settings) {
      setFeedback(response.ok ? "loadURL 失败" : response.error);
      return;
    }

    setDirectoryDraft(response.settings);
    setFeedback(`已载入 ${response.settings.lockedOrigin}`);
  }

  function handleOpenSettings() {
    setDirectoryDraft(
      uiState.directorySettings ?? {
        lockedOrigin: "",
        pathPrefix: "/",
        visibleStatusBuckets: ["200"],
        lastLoadedUrl: "",
        updatedAt: new Date().toISOString()
      }
    );
    setIsOverlayOpen(true);
  }

  async function handleSaveDirectorySettings() {
    if (!directoryDraft) {
      return;
    }

    const normalizedSettings: DirectorySettings = {
      ...directoryDraft,
      pathPrefix: normalizePathPrefix(directoryDraft.pathPrefix),
      updatedAt: new Date().toISOString()
    };

    const response = await sendRuntimeMessage<RuntimeResponse>({
      kind: "saveDirectorySettings",
      settings: normalizedSettings
    });

    if (!response.ok) {
      setFeedback(response.error);
      return;
    }

    setUiState((current) => ({
      ...current,
      directorySettings: normalizedSettings
    }));
    setIsOverlayOpen(false);
    setFeedback(`Directory 设置已保存到 ${getEditableUrlPreview(normalizedSettings)}`);
  }

  async function handleUploadDictionary(taskType: FuzzType, file: File | null) {
    if (!file) {
      return;
    }

    try {
      ensureTxtFilename(file.name);
      const content = await file.text();
      const dictionary = createDictionarySet(taskType, file.name, content);
      const response = await sendRuntimeMessage<RuntimeResponse>({
        dictionary,
        kind: "saveDictionary"
      });

      if (!response.ok) {
        setFeedback(response.error);
        return;
      }

      setFeedback(`${FUZZ_LABELS[taskType]} 字典上传完成`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "字典上传失败");
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="display-header">
          <div className="brand-mark">ESink</div>
          <div className="theme-switch" role="group" aria-label="主题模式">
            <span className={`theme-switch-indicator is-${themeMode}`} />
            <button
              aria-label="明亮模式"
              aria-pressed={themeMode === "light"}
              className={themeMode === "light" ? "theme-option is-active" : "theme-option"}
              onClick={() => setThemeMode("light")}
              type="button"
            >
              <span className="theme-switch-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.7v2.3M12 19v2.3M21.3 12H19M5 12H2.7M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4" />
                </svg>
              </span>
            </button>
            <button
              aria-label="跟随系统"
              aria-pressed={themeMode === "system"}
              className={themeMode === "system" ? "theme-option is-active" : "theme-option"}
              onClick={() => setThemeMode("system")}
              type="button"
            >
              <span className="theme-switch-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3.5" y="5.5" width="17" height="11" rx="2.5" />
                  <path d="M9 19h6M12 16.5V19" />
                </svg>
              </span>
            </button>
            <button
              aria-label="黑暗模式"
              aria-pressed={themeMode === "dark"}
              className={themeMode === "dark" ? "theme-option is-active" : "theme-option"}
              onClick={() => setThemeMode("dark")}
              type="button"
            >
              <span className="theme-switch-icon theme-switch-icon-dark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M14.5 3.2a8.7 8.7 0 1 0 6.3 15.1A9.8 9.8 0 0 1 14.5 3.2Z" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        <ResultStream
          capturedContext={uiState.capturedContext}
          feedback={feedback}
          progress={uiState.progress}
          results={uiState.results}
        />
      </section>

      <section className="toggle-panel">
        <button
          className={activeView === "parameters" ? "toggle-button active" : "toggle-button"}
          onClick={() => setActiveView("parameters")}
          type="button"
        >
          参数
        </button>
        <button
          className={activeView === "dictionaries" ? "toggle-button active" : "toggle-button"}
          onClick={() => setActiveView("dictionaries")}
          type="button"
        >
          字典
        </button>
      </section>

      <section className="body-panel">
        {activeView === "parameters" ? (
          <ParameterList
            dictionaries={uiState.dictionaries}
            onCancel={handleCancelTask}
            onOpenSettings={handleOpenSettings}
            onResetDisplay={handleResetDisplay}
            onStart={handleStartTask}
            progress={uiState.progress}
            readyContext={uiState.capturedContext}
          />
        ) : (
          <DictionaryList
            dictionaries={uiState.dictionaries}
            fileInputMapRef={fileInputMapRef}
            onUpload={handleUploadDictionary}
          />
        )}
      </section>

      {isNarrow ? (
        <div className="narrow-overlay">
          <p>请调整到更宽以便使用</p>
        </div>
      ) : null}

      {isOverlayOpen ? (
        <DirectorySettingsOverlay
          draft={directoryDraft}
          onBack={() => setIsOverlayOpen(false)}
          onChange={setDirectoryDraft}
          onLoadCurrentUrl={handleLoadActiveUrl}
          onSave={handleSaveDirectorySettings}
        />
      ) : null}
    </main>
  );
}
