import type { Dispatch, SetStateAction } from "react";

import type { DirectorySettings, StatusBucket } from "../../shared/types";
import { getEditableUrlPreview } from "../../shared/url";

interface DirectorySettingsOverlayProps {
  draft: DirectorySettings | null;
  onBack: () => void;
  onChange: Dispatch<SetStateAction<DirectorySettings | null>>;
  onLoadCurrentUrl: () => Promise<void>;
  onSave: () => Promise<void>;
}

const STATUS_OPTIONS: StatusBucket[] = ["200", "3xx", "4xx", "5xx"];

export function DirectorySettingsOverlay({
  draft,
  onBack,
  onChange,
  onLoadCurrentUrl,
  onSave
}: DirectorySettingsOverlayProps) {
  return (
    <div className="overlay-shell">
      <div className="overlay-card">
        <div className="overlay-header">
          <button className="ghost-button" onClick={onBack} type="button">
            返回
          </button>
          <button onClick={() => void onLoadCurrentUrl()} type="button">
            loadURL
          </button>
        </div>

        {draft ? (
          <>
            <div className="overlay-section">
              <p>锁定前缀</p>
              <strong>{draft.lockedOrigin || "尚未载入 URL"}</strong>
            </div>
            <div className="overlay-section">
              <label htmlFor="directory-path">编辑路径</label>
              <input
                id="directory-path"
                onChange={(event) =>
                  onChange((current) =>
                    current
                      ? {
                          ...current,
                          pathPrefix: event.target.value || "/"
                        }
                      : current
                  )
                }
                type="text"
                value={draft.pathPrefix}
              />
              <p className="preview-text">{draft.lockedOrigin ? getEditableUrlPreview(draft) : "尚未生成预览"}</p>
            </div>
            <div className="overlay-section">
              <p>显示状态码</p>
              <div className="status-toggle-row">
                {STATUS_OPTIONS.map((bucket) => {
                  const checked = draft.visibleStatusBuckets.includes(bucket);

                  return (
                    <label className={checked ? "status-chip active" : "status-chip"} key={bucket}>
                      <input
                        checked={checked}
                        onChange={() =>
                          onChange((current) => {
                            if (!current) {
                              return current;
                            }

                            const next = checked
                              ? current.visibleStatusBuckets.filter((value) => value !== bucket)
                              : [...current.visibleStatusBuckets, bucket];

                            return {
                              ...current,
                              visibleStatusBuckets: next.length ? next : ["200"]
                            };
                          })
                        }
                        type="checkbox"
                      />
                      {bucket}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="overlay-footer">
              <button onClick={() => void onSave()} type="button">
                保存
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">点击 loadURL 载入当前页面</div>
        )}
      </div>
    </div>
  );
}
