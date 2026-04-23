import type { CapturedInputContext, FormFieldEntry } from "../shared/types";

function isSupportedEditableElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  const unsupportedTypes = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit"
  ]);

  return !unsupportedTypes.has(target.type);
}

function buildSelectorHint(element: HTMLInputElement | HTMLTextAreaElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.name) {
    return `[name="${element.name}"]`;
  }

  const placeholder = element.getAttribute("placeholder");

  if (placeholder) {
    return `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
  }

  return element.tagName.toLowerCase();
}

function collectFieldValues(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): FormFieldEntry[] {
  if (!element.name) {
    return [];
  }

  if (element instanceof HTMLSelectElement) {
    const selected = Array.from(element.selectedOptions);

    if (selected.length === 0) {
      return [{ name: element.name, value: "" }];
    }

    return selected.map((option) => ({
      name: element.name,
      value: option.value
    }));
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox" || element.type === "radio") {
      return element.checked ? [{ name: element.name, value: element.value }] : [];
    }

    if (element.type === "file") {
      return [];
    }
  }

  return [{ name: element.name, value: element.value }];
}

function serializeSiblingFields(
  form: HTMLFormElement,
  currentTarget: HTMLInputElement | HTMLTextAreaElement
): FormFieldEntry[] {
  const values: FormFieldEntry[] = [];
  const fields = Array.from(form.elements);

  for (const field of fields) {
    if (
      !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)
    ) {
      continue;
    }

    if (field === currentTarget) {
      continue;
    }

    values.push(...collectFieldValues(field));
  }

  return values;
}

function buildCapturedContext(element: HTMLInputElement | HTMLTextAreaElement): CapturedInputContext {
  const pageUrl = window.location.href;
  const form = element.form;
  const formAction = form ? new URL(form.getAttribute("action") || pageUrl, pageUrl).toString() : "";
  const formMethod = form?.method?.toUpperCase() === "POST" ? "POST" : "GET";
  const enctype = form?.enctype || "application/x-www-form-urlencoded";

  return {
    capturedAt: new Date().toISOString(),
    enctype,
    fieldLabel: element.name || element.id || element.placeholder || element.type || element.tagName.toLowerCase(),
    fieldName: element.name || "",
    fieldValue: element.value,
    formAction,
    formMethod,
    otherFields: form ? serializeSiblingFields(form, element) : [],
    pageUrl,
    selectorHint: buildSelectorHint(element),
    tabId: -1
  };
}

document.addEventListener(
  "contextmenu",
  (event) => {
    const path = event.composedPath();
    const target = path.find((entry) => isSupportedEditableElement(entry)) ?? event.target;

    if (!isSupportedEditableElement(target)) {
      return;
    }

    const context = buildCapturedContext(target);

    chrome.runtime.sendMessage(
      {
        context,
        kind: "captureTarget"
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  },
  true
);
