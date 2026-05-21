import type { PayloadReflectionState } from "./types";

export interface PayloadReflectionAnalysis {
  displayText: string;
  state: PayloadReflectionState;
}

const DANGEROUS_CHARACTER_PATTERN = /[<>"'`{}$();|&%]/gu;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function analyzePayloadReflection(payload: string, body: string): PayloadReflectionAnalysis {
  const strippedPayload = payload.replace(DANGEROUS_CHARACTER_PATTERN, "").trim();

  if (!payload) {
    return {
      displayText: "",
      state: "filtered"
    };
  }

  if (body.includes(payload)) {
    return {
      displayText: payload,
      state: "unfiltered"
    };
  }

  const htmlEscapedPayload = escapeHtml(payload);

  if (htmlEscapedPayload !== payload && body.includes(htmlEscapedPayload)) {
    return {
      displayText: strippedPayload || payload,
      state: "filtered"
    };
  }

  const urlEncodedPayload = encodeURIComponent(payload);

  if (urlEncodedPayload !== payload && body.includes(urlEncodedPayload)) {
    return {
      displayText: strippedPayload || payload,
      state: "filtered"
    };
  }

  if (strippedPayload && strippedPayload !== payload && body.includes(strippedPayload)) {
    return {
      displayText: strippedPayload,
      state: "filtered"
    };
  }

  return {
    displayText: strippedPayload || payload,
    state: "filtered"
  };
}
