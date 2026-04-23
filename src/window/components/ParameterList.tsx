import { FUZZ_LABELS, FUZZ_TYPES } from "../../shared/constants";
import type {
  CapturedInputContext,
  DictionaryRecord,
  FuzzType,
  TaskProgressState
} from "../../shared/types";

interface ParameterListProps {
  dictionaries: DictionaryRecord;
  onCancel: () => void;
  onOpenSettings: () => void;
  onResetDisplay: () => void;
  onStart: (taskType: FuzzType) => void;
  progress: TaskProgressState;
  readyContext: CapturedInputContext | null;
}

export function ParameterList({
  dictionaries,
  onCancel,
  onOpenSettings,
  onResetDisplay,
  onStart,
  progress,
  readyContext
}: ParameterListProps) {
  return (
    <div className="parameter-list">
      <div className="list-intro">
        <div>
          <strong>{readyContext ? readyContext.fieldLabel || readyContext.fieldName : "未捕获输入框"}</strong>
        </div>
        <div className="list-intro-actions">
          <button className="ghost-button" onClick={onResetDisplay} type="button">
            重置
          </button>
          <button className="ghost-button" onClick={onCancel} type="button">
            停止
          </button>
        </div>
      </div>
      {FUZZ_TYPES.map((taskType) => {
        const dictionary = dictionaries[taskType];
        const hasContext = taskType === "directory" ? true : Boolean(readyContext?.fieldName && readyContext.formAction);
        const disabled = progress.active || !dictionary || !hasContext;

        return (
          <article className="control-row" key={taskType}>
            <div>
              <h2>{FUZZ_LABELS[taskType]}</h2>
            </div>
            <div className="row-actions">
              <button disabled={disabled} onClick={() => onStart(taskType)} type="button">
                启动
              </button>
              {taskType === "directory" ? (
                <button className="ghost-button" onClick={onOpenSettings} type="button">
                  设置
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
