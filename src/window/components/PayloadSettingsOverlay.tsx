import type { Dispatch, SetStateAction } from "react";

import { DEFAULT_VISIBLE_REFLECTION_STATES } from "../../shared/constants";
import type {
  PayloadReflectionState,
  PayloadResultSettings
} from "../../shared/types";

interface PayloadSettingsOverlayProps {
  draft: PayloadResultSettings | null;
  onBack: () => void;
  onChange: Dispatch<SetStateAction<PayloadResultSettings | null>>;
  onSave: () => Promise<void>;
}

const REFLECTION_OPTIONS: Array<{ label: string; value: PayloadReflectionState }> = [
  { label: "Unfiltered", value: "unfiltered" },
  { label: "Filtered", value: "filtered" }
];

export function PayloadSettingsOverlay({
  draft,
  onBack,
  onChange,
  onSave
}: PayloadSettingsOverlayProps) {
  return (
    <div className="overlay-shell">
      <div className="overlay-card">
        <div className="overlay-header">
          <button className="ghost-button" onClick={onBack} type="button">
            Back
          </button>
        </div>

        {draft ? (
          <>
            <div className="overlay-section">
              <p>Show Results</p>
              <div className="status-toggle-row">
                {REFLECTION_OPTIONS.map((option) => {
                  const checked = draft.visibleReflectionStates.includes(option.value);

                  return (
                    <label className={checked ? "status-chip active" : "status-chip"} key={option.value}>
                      <input
                        checked={checked}
                        onChange={() =>
                          onChange((current) => {
                            if (!current) {
                              return current;
                            }

                            const next = checked
                              ? current.visibleReflectionStates.filter((value) => value !== option.value)
                              : [...current.visibleReflectionStates, option.value];

                            return {
                              ...current,
                              visibleReflectionStates: next.length ? next : [...DEFAULT_VISIBLE_REFLECTION_STATES]
                            };
                          })
                        }
                        type="checkbox"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="overlay-footer">
              <button onClick={() => void onSave()} type="button">
                Save
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">暂无可编辑设置</div>
        )}
      </div>
    </div>
  );
}
