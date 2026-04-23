import { useEffect, useMemo, useRef } from "react";

import { FUZZ_LABELS } from "../../shared/constants";
import type { CapturedInputContext, FuzzResultItem, TaskProgressState } from "../../shared/types";

interface ResultStreamProps {
  capturedContext: CapturedInputContext | null;
  feedback: string;
  progress: TaskProgressState;
  results: FuzzResultItem[];
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour12: false
  });
}

function buildTerminalLine(result: FuzzResultItem): string {
  const statusLabel = result.status ?? "ERR";
  const taskLabel = FUZZ_LABELS[result.taskType];
  const target = result.requestUrl || result.payload || "system";
  const payloadSuffix =
    result.payload && result.requestUrl && result.payload !== result.requestUrl
      ? ` payload=${result.payload}`
      : "";

  return `[${formatTime(result.timestamp)}] [${taskLabel}] [${statusLabel}] ${result.summary} :: ${target}${payloadSuffix}`;
}

function buildTargetLine(capturedContext: CapturedInputContext | null): string {
  if (!capturedContext) {
    return "TARGET none";
  }

  return `TARGET ${capturedContext.fieldLabel || capturedContext.fieldName} @ ${new URL(capturedContext.pageUrl).host}`;
}

export function ResultStream({ capturedContext, feedback, progress, results }: ResultStreamProps) {
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = streamRef.current;

    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [results.length]);

  const statusLine = useMemo(() => {
    const taskLabel = progress.taskType ? FUZZ_LABELS[progress.taskType] : "IDLE";
    const countLabel = `${progress.completed}/${progress.total}`;
    return `STATUS ${taskLabel} ${countLabel} ${progress.message}`;
  }, [progress]);

  const systemLine = useMemo(() => `SYSTEM ${feedback}`, [feedback]);
  const targetLine = useMemo(() => buildTargetLine(capturedContext), [capturedContext]);

  return (
    <div className="result-stream">
      <div className="terminal-shell">
        <div className="stream-list terminal-list" ref={streamRef}>
          <div className="terminal-line terminal-line-meta">
            <span className="terminal-prompt">$</span>
            <span>{systemLine}</span>
          </div>
          <div className="terminal-line terminal-line-meta">
            <span className="terminal-prompt">$</span>
            <span>{targetLine}</span>
          </div>
          <div className="terminal-line terminal-line-status">
            <span className="terminal-prompt">$</span>
            <span>{statusLine}</span>
          </div>
          {results.length === 0 ? (
            <div className="terminal-line terminal-line-empty">
              <span className="terminal-prompt">&gt;</span>
            </div>
          ) : (
            results.map((result) => (
              <div className={`terminal-line terminal-line-${result.level}`} key={result.id}>
                <span className="terminal-prompt">&gt;</span>
                <span>{buildTerminalLine(result)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
