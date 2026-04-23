import type { RuntimeRequest, RuntimeResponse } from "./messages";

export function sendRuntimeMessage<TResponse extends RuntimeResponse = RuntimeResponse>(
  message: RuntimeRequest
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: TResponse | undefined) => {
      const lastError = chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      if (!response) {
        reject(new Error("No response from extension runtime."));
        return;
      }

      resolve(response);
    });
  });
}

export function getLocalStorage<T>(keys?: string | string[] | Record<string, unknown> | null): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys ?? null, (items) => {
      resolve(items as T);
    });
  });
}

export function setLocalStorage(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}

export function removeLocalStorage(keys: string | string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => resolve());
  });
}

export function getTab(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      const lastError = chrome.runtime.lastError;

      if (lastError || !tab) {
        reject(new Error(lastError?.message ?? "Tab not found."));
        return;
      }

      resolve(tab);
    });
  });
}

export function queryTabs(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => resolve(tabs));
  });
}

export function createWindow(
  createData: chrome.windows.CreateData
): Promise<chrome.windows.Window> {
  return new Promise((resolve, reject) => {
    chrome.windows.create(createData, (window) => {
      const lastError = chrome.runtime.lastError;

      if (lastError || !window) {
        reject(new Error(lastError?.message ?? "Window create failed."));
        return;
      }

      resolve(window);
    });
  });
}

export function updateWindow(
  windowId: number,
  updateInfo: chrome.windows.UpdateInfo
): Promise<chrome.windows.Window> {
  return new Promise((resolve, reject) => {
    chrome.windows.update(windowId, updateInfo, (window) => {
      const lastError = chrome.runtime.lastError;

      if (lastError || !window) {
        reject(new Error(lastError?.message ?? "Window update failed."));
        return;
      }

      resolve(window);
    });
  });
}

export function removeAllContextMenus(): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });
}

export function createContextMenu(createProperties: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(createProperties, () => {
      const lastError = chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve();
    });
  });
}
