import type { TaskRecord } from "@tusk/core";

interface Props {
  task: TaskRecord;
  onNavigate: (id: string) => void;
}

export function TaskCard({ task, onNavigate }: Props) {
  const hasResult = !!task.resultId;

  return (
    <div
      className={`task-card task-card--${task.status}${hasResult ? " task-card--linked" : ""}`}
    >
      <p className="task-card-desc">{task.description}</p>

      {task.claimedBy && (
        <div className="task-card-agent">
          <span className="task-card-agent-dot" />
          <span className="task-card-agent-name">{task.claimedBy}</span>
        </div>
      )}

      {task.error && (
        <p className="task-card-error">{task.error}</p>
      )}

      {hasResult && (
        <button
          type="button"
          className="task-card-result-link"
          onClick={() => onNavigate(task.resultId!)}
        >
          View result →
        </button>
      )}

      <div className="task-card-id">
        {task.id.replace(/^task-/, "").slice(0, 8)}
      </div>
    </div>
  );
}
