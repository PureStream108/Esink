import {
  CONTEXT_MENU_ID,
  DIRECTORY_CONCURRENCY,
  EMPTY_PROGRESS_STATE,
  EXTENSION_WINDOW_OPTIONS,
  EXTENSION_WINDOW_PATH,
  FUZZ_TYPES,
  INPUT_FUZZ_CONCURRENCY,
  RESULT_LIMIT
} from "../shared/constants";
import {
  createContextMenu,
  createWindow,
  getTab,
  queryTabs,
  removeAllContextMenus,
  updateWindow
} from "../shared/browser";
import { runConcurrent } from "../shared/concurrency";
import { buildFormRequest, resolveTaskFieldName } from "../shared/form-request";
import type { RuntimeEvent, RuntimeRequest, RuntimeResponse } from "../shared/messages";
import {
  createInitialUiState,
  getBaseUiState,
  getCapturedContext,
  getDirectorySettings,
  getLastPageContext,
  getStoredDictionaries,
  saveCapturedContext,
  saveDictionarySet,
  saveDirectorySettings,
  saveLastPageContext
} from "../shared/storage";
import type {
  CapturedInputContext,
  DictionaryEntrySet,
  DirectorySettings,
  FuzzResultItem,
  FuzzType,
  LastPageContext,
  ResultLevel,
  TaskProgressState,
  UiState
} from "../shared/types";
import {
  buildDirectorySettingsFromUrl,
  buildDirectoryTargetUrl,
  getEditableUrlPreview,
  getStatusBucket,
  isHttpUrl,
  isVisibleStatus,
  mergeDirectorySettingsWithUrl
} from "../shared/url";
import { getDevelopmentSeedDictionary, shouldSeedDevelopmentDictionaries } from "./seed-data";

let extensionWindowId: number | null = null;
let activeTaskController: AbortController | null = null;
let activeTaskPromise: Promise<void> | null = null;
let pendingCancelMessage: string | null = null;
let taskResults: FuzzResultItem[] = [];
let taskProgress: TaskProgressState = { ...EMPTY_PROGRESS_STATE };

function broadcastEvent(event: RuntimeEvent): void {
  chrome.runtime.sendMessage(event, () => {
    void chrome.runtime.lastError;
  });
}

function buildUiStateSnapshot(base: Omit<UiState, "results" | "progress">): UiState {
  return {
    ...base,
    progress: taskProgress,
    results: taskResults
  };
}

function appendResult(result: FuzzResultItem): void {
  taskResults = [...taskResults, result].slice(-RESULT_LIMIT);
}

function createResult(
  taskType: FuzzType,
  requestUrl: string,
  payload: string,
  status: number | null,
  level: ResultLevel,
  summary: string
): FuzzResultItem {
  return {
    id: crypto.randomUUID(),
    level,
    payload,
    requestUrl,
    status,
    statusBucket: typeof status === "number" ? getStatusBucket(status) : undefined,
    summary,
    taskType,
    timestamp: new Date().toISOString()
  };
}

function emitTaskState(latestResult?: FuzzResultItem): void {
  broadcastEvent({
    kind: "taskStateUpdated",
    latestResult,
    state: taskProgress
  });
}

function resetTask(taskType: FuzzType, total: number, message: string): void {
  taskResults = [];
  taskProgress = {
    active: true,
    cancelled: false,
    completed: 0,
    message,
    startedAt: new Date().toISOString(),
    taskType,
    total
  };
  emitTaskState();
}

function finishTask(message: string, cancelled = false): void {
  taskProgress = {
    ...taskProgress,
    active: false,
    cancelled,
    message
  };
  emitTaskState();
  activeTaskController = null;
  activeTaskPromise = null;
  pendingCancelMessage = null;
}

async function ensureDevelopmentDictionaries(): Promise<void> {
  if (!shouldSeedDevelopmentDictionaries()) {
    return;
  }

  const dictionaries = await getStoredDictionaries();

  for (const type of FUZZ_TYPES) {
    if (dictionaries[type]) {
      continue;
    }

    const seeded = getDevelopmentSeedDictionary(type);
    await saveDictionarySet(seeded);
  }
}

async function rebuildContextMenu(): Promise<void> {
  await removeAllContextMenus();
  await createContextMenu({
    contexts: ["editable"],
    id: CONTEXT_MENU_ID,
    title: "Open E Sink"
  });
}

async function rememberPageTab(tab: chrome.tabs.Tab | undefined | null): Promise<void> {
  if (!tab?.id || !tab.url || !isHttpUrl(tab.url)) {
    return;
  }

  const context: LastPageContext = {
    tabId: tab.id,
    updatedAt: new Date().toISOString(),
    url: tab.url
  };

  await saveLastPageContext(context);
  broadcastEvent({
    kind: "lastPageContextUpdated",
    tabId: context.tabId,
    url: context.url
  });
}

async function openExtensionWindow(): Promise<void> {
  const extensionUrl = chrome.runtime.getURL(EXTENSION_WINDOW_PATH);

  if (extensionWindowId !== null) {
    try {
      await updateWindow(extensionWindowId, { focused: true });
      return;
    } catch {
      extensionWindowId = null;
    }
  }

  const created = await createWindow({
    focused: true,
    height: EXTENSION_WINDOW_OPTIONS.height,
    type: "popup",
    url: extensionUrl,
    width: EXTENSION_WINDOW_OPTIONS.width
  });

  extensionWindowId = created.id ?? null;
}

async function findActivePageTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await queryTabs({ active: true });
  const pageTabs = tabs
    .filter((tab) => Boolean(tab.url && isHttpUrl(tab.url)))
    .sort((left, right) => (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0));

  return pageTabs[0] ?? null;
}

async function resolveCurrentPageUrl(): Promise<string> {
  const activePageTab = await findActivePageTab();

  if (activePageTab?.url && isHttpUrl(activePageTab.url)) {
    await rememberPageTab(activePageTab);
    return activePageTab.url;
  }

  const [lastPageContext, capturedContext] = await Promise.all([
    getLastPageContext(),
    getCapturedContext()
  ]);

  const candidateTabIds = [lastPageContext?.tabId, capturedContext?.tabId].filter(
    (value): value is number => typeof value === "number"
  );

  for (const tabId of candidateTabIds) {
    try {
      const tab = await getTab(tabId);

      if (tab.url && isHttpUrl(tab.url)) {
        await rememberPageTab(tab);
        return tab.url;
      }
    } catch {
      continue;
    }
  }

  if (capturedContext?.pageUrl && isHttpUrl(capturedContext.pageUrl)) {
    return capturedContext.pageUrl;
  }

  if (lastPageContext?.url && isHttpUrl(lastPageContext.url)) {
    return lastPageContext.url;
  }

  throw new Error("无法定位当前页面 URL，请先在普通网页中打开插件。");
}

async function getUiState(): Promise<UiState> {
  const base = await getBaseUiState();
  return buildUiStateSnapshot(base);
}

async function clearDisplayState(): Promise<UiState> {
  taskResults = [];

  if (!taskProgress.active) {
    taskProgress = { ...EMPTY_PROGRESS_STATE };
  }

  return getUiState();
}

async function resetSessionState(): Promise<UiState> {
  await abortActiveTask("会话已重置");
  taskResults = [];
  taskProgress = { ...EMPTY_PROGRESS_STATE };
  return getUiState();
}

async function syncCapturedContext(context: CapturedInputContext | null): Promise<void> {
  await saveCapturedContext(context);

  if (context) {
    await saveLastPageContext({
      tabId: context.tabId,
      updatedAt: new Date().toISOString(),
      url: context.pageUrl
    });

    broadcastEvent({
      kind: "lastPageContextUpdated",
      tabId: context.tabId,
      url: context.pageUrl
    });
  }

  broadcastEvent({
    context,
    kind: "capturedContextUpdated"
  });
}

async function syncDictionary(dictionary: DictionaryEntrySet): Promise<void> {
  await saveDictionarySet(dictionary);
  broadcastEvent({
    dictionary,
    kind: "dictionaryUpdated"
  });
}

async function syncDirectorySettings(settings: DirectorySettings): Promise<void> {
  await saveDirectorySettings(settings);
  broadcastEvent({
    kind: "directorySettingsUpdated",
    settings
  });
}

async function abortActiveTask(reason: string): Promise<void> {
  if (activeTaskController) {
    pendingCancelMessage = reason;
    activeTaskController.abort();
  }

  if (activeTaskPromise) {
    try {
      await activeTaskPromise;
    } catch {
      return;
    }
  }
}

async function runDirectoryTask(): Promise<void> {
  const [dictionaries, previousSettings] = await Promise.all([
    getStoredDictionaries(),
    getDirectorySettings()
  ]);
  const dictionary = dictionaries.directory;

  if (!dictionary) {
    throw new Error("Directory 字典不存在，请先上传字典。");
  }

  const currentUrl = await resolveCurrentPageUrl();
  const settings = mergeDirectorySettingsWithUrl(currentUrl, previousSettings);

  const controller = new AbortController();
  activeTaskController = controller;
  resetTask("directory", dictionary.entries.length, `正在扫描 ${getEditableUrlPreview(settings)}`);

  activeTaskPromise = runConcurrent(
    dictionary.entries,
    DIRECTORY_CONCURRENCY,
    controller.signal,
    async (entry) => {
      if (controller.signal.aborted) {
        return;
      }

      const targetUrl = buildDirectoryTargetUrl(settings.lockedOrigin, settings.pathPrefix, entry);
      let latestResult: FuzzResultItem | undefined;

      try {
        const response = await fetch(targetUrl, {
          credentials: "include",
          method: "GET",
          redirect: "manual",
          signal: controller.signal
        });

        if (isVisibleStatus(response.status, settings.visibleStatusBuckets)) {
          latestResult = createResult(
            "directory",
            targetUrl,
            entry,
            response.status,
            response.ok ? "success" : "info",
            response.statusText || "目录命中"
          );
          appendResult(latestResult);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          latestResult = createResult(
            "directory",
            targetUrl,
            entry,
            null,
            "error",
            error instanceof Error ? error.message : "目录请求失败"
          );
          appendResult(latestResult);
        }
      } finally {
        taskProgress = {
          ...taskProgress,
          completed: Math.min(taskProgress.completed + 1, taskProgress.total),
          message: `已完成 ${Math.min(taskProgress.completed + 1, taskProgress.total)}/${taskProgress.total}`
        };
        emitTaskState(latestResult);
      }
    }
  ).then(() => {
    if (controller.signal.aborted) {
      finishTask(pendingCancelMessage ?? "任务已取消", true);
      return;
    }

    finishTask("目录扫描完成");
  });

  await activeTaskPromise;
}

function validateCapturedContext(context: CapturedInputContext | null): CapturedInputContext {
  if (!context) {
    throw new Error("请先在网页输入框上右键，再回到插件里启动任务。");
  }

  if (!context.fieldName) {
    throw new Error("目标输入框没有 name 属性，无法构造 fuzz 请求。");
  }

  if (!context.formAction) {
    throw new Error("目标输入框不在可提交的表单中，暂不支持。");
  }

  return context;
}

async function runInputFuzzTask(taskType: Exclude<FuzzType, "directory">): Promise<void> {
  const [dictionaries, rawContext] = await Promise.all([getStoredDictionaries(), getCapturedContext()]);
  const dictionary = dictionaries[taskType];
  const context = validateCapturedContext(rawContext);
  const targetFieldName = resolveTaskFieldName(context, taskType);

  if (!dictionary) {
    throw new Error(`${taskType.toUpperCase()} 字典不存在，请先上传字典。`);
  }

  const controller = new AbortController();
  activeTaskController = controller;
  resetTask(taskType, dictionary.entries.length, `正在对 ${targetFieldName} 发起请求`);

  activeTaskPromise = runConcurrent(
    dictionary.entries,
    INPUT_FUZZ_CONCURRENCY,
    controller.signal,
    async (payload) => {
      if (controller.signal.aborted) {
        return;
      }

      let latestResult: FuzzResultItem | undefined;

      try {
        const request = buildFormRequest(context, payload, targetFieldName);
        const response = await fetch(request.url, {
          ...request.init,
          signal: controller.signal
        });

        latestResult = createResult(
          taskType,
          request.url,
          payload,
          response.status,
          response.ok ? "success" : "info",
          response.statusText || "请求完成"
        );
        appendResult(latestResult);
      } catch (error) {
        if (!controller.signal.aborted) {
          latestResult = createResult(
            taskType,
            context.formAction,
            payload,
            null,
            "error",
            error instanceof Error ? error.message : "请求失败"
          );
          appendResult(latestResult);
        }
      } finally {
        taskProgress = {
          ...taskProgress,
          completed: Math.min(taskProgress.completed + 1, taskProgress.total),
          message: `已完成 ${Math.min(taskProgress.completed + 1, taskProgress.total)}/${taskProgress.total}`
        };
        emitTaskState(latestResult);
      }
    }
  ).then(() => {
    if (controller.signal.aborted) {
      finishTask(pendingCancelMessage ?? "任务已取消", true);
      return;
    }

    finishTask(`${taskType.toUpperCase()} 扫描完成`);
  });

  await activeTaskPromise;
}

async function startTask(taskType: FuzzType): Promise<void> {
  await abortActiveTask("新任务已接管，旧任务已取消");

  if (taskType === "directory") {
    void runDirectoryTask().catch((error) => {
      const message = error instanceof Error ? error.message : "任务启动失败";
      const failure = createResult(taskType, "", "", null, "error", message);
      appendResult(failure);
      taskProgress = {
        ...EMPTY_PROGRESS_STATE,
        message,
        taskType
      };
      emitTaskState(failure);
    });
    return;
  }

  void runInputFuzzTask(taskType).catch((error) => {
    const message = error instanceof Error ? error.message : "任务启动失败";
    const failure = createResult(taskType, "", "", null, "error", message);
    appendResult(failure);
    taskProgress = {
      ...EMPTY_PROGRESS_STATE,
      message,
      taskType
    };
    emitTaskState(failure);
  });
}

async function handleRequest(message: RuntimeRequest, sender: chrome.runtime.MessageSender): Promise<RuntimeResponse> {
  switch (message.kind) {
    case "captureTarget": {
      await syncCapturedContext(
        message.context
          ? {
              ...message.context,
              pageUrl: sender.tab?.url && isHttpUrl(sender.tab.url) ? sender.tab.url : message.context.pageUrl,
              tabId: sender.tab?.id ?? message.context.tabId
            }
          : null
      );
      return { ok: true };
    }

    case "getUiState": {
      return {
        ok: true,
        state: await getUiState()
      };
    }

    case "resetSession": {
      return {
        ok: true,
        state: await resetSessionState()
      };
    }

    case "clearDisplay": {
      return {
        ok: true,
        state: await clearDisplayState()
      };
    }

    case "loadActiveUrl": {
      const currentUrl = await resolveCurrentPageUrl();
      const previous = await getDirectorySettings();
      const settings = buildDirectorySettingsFromUrl(currentUrl, previous);
      return {
        ok: true,
        settings
      };
    }

    case "saveDirectorySettings": {
      await syncDirectorySettings({
        ...message.settings,
        updatedAt: new Date().toISOString()
      });
      return { ok: true };
    }

    case "saveDictionary": {
      await syncDictionary(message.dictionary);
      return { ok: true };
    }

    case "startTask": {
      await startTask(message.taskType);
      return { ok: true };
    }

    case "cancelTask": {
      await abortActiveTask("任务已取消");
      return { ok: true };
    }

    case "openExtensionWindow": {
      await rememberPageTab(sender.tab);
      await openExtensionWindow();
      return { ok: true };
    }

    default: {
      return {
        error: "Unknown message.",
        ok: false
      };
    }
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeRequest, sender, sendResponse) => {
  void handleRequest(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        error: error instanceof Error ? error.message : "Unhandled background error.",
        ok: false
      });
    });

  return true;
});

chrome.action.onClicked.addListener((tab) => {
  void (async () => {
    await rememberPageTab(tab);
    await openExtensionWindow();
  })();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  void (async () => {
    await rememberPageTab(tab);
    await openExtensionWindow();
  })();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void getTab(tabId)
    .then((tab) => rememberPageTab(tab))
    .catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!tab.active) {
    return;
  }

  if (!changeInfo.url && changeInfo.status !== "complete") {
    return;
  }

  void rememberPageTab(tab);
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === extensionWindowId) {
    extensionWindowId = null;
  }
});

async function initializeExtension(): Promise<void> {
  await Promise.all([ensureDevelopmentDictionaries(), rebuildContextMenu()]);
  taskResults = [];
  taskProgress = { ...createInitialUiState().progress };
}

chrome.runtime.onInstalled.addListener(() => {
  void initializeExtension();
});

void initializeExtension();
