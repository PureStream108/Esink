import { type MutableRefObject } from "react";

import { FUZZ_LABELS, FUZZ_TYPES } from "../../shared/constants";
import type { DictionaryRecord, FuzzType } from "../../shared/types";

interface DictionaryListProps {
  dictionaries: DictionaryRecord;
  fileInputMapRef: MutableRefObject<Record<FuzzType, HTMLInputElement | null>>;
  onUpload: (taskType: FuzzType, file: File | null) => Promise<void>;
}

export function DictionaryList({ dictionaries, fileInputMapRef, onUpload }: DictionaryListProps) {
  return (
    <div className="dictionary-list">
      {FUZZ_TYPES.map((taskType) => {
        const dictionary = dictionaries[taskType];

        return (
          <article className="control-row" key={taskType}>
            <div>
              <h2>{FUZZ_LABELS[taskType]}</h2>
              <p>
                {dictionary
                  ? `${dictionary.filename} · ${dictionary.entries.length} 条 · ${dictionary.source === "development-seed" ? "开发测试字典" : "用户字典"}`
                  : "默认不包含字典"}
              </p>
            </div>
            <div className="row-actions">
              <input
                accept=".txt,text/plain"
                hidden
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  void onUpload(taskType, file);
                  event.currentTarget.value = "";
                }}
                ref={(node) => {
                  fileInputMapRef.current[taskType] = node;
                }}
                type="file"
              />
              <button
                onClick={() => fileInputMapRef.current[taskType]?.click()}
                type="button"
              >
                上传
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
