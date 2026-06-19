import type { TaskRecord } from "@tusk/core";
import { TaskCard } from "./TaskCard";

const COLUMNS: Array<{ key: keyof ByStatus; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "claimed", label: "Claimed" },
  { key: "done", label: "Done" },
  { key: "failed", label: "Failed" },
];

type ByStatus = {
  pending: TaskRecord[];
  claimed: TaskRecord[];
  done: TaskRecord[];
  failed: TaskRecord[];
};

interface Props {
  byStatus: ByStatus;
  onNavigate: (id: string) => void;
}

export function KanbanBoard({ byStatus, onNavigate }: Props) {
  return (
    <div className="kanban-board">
      {COLUMNS.map(({ key, label }) => {
        const tasks = byStatus[key];
        return (
          <div key={key} className={`kanban-col kanban-col--${key}`}>
            <div className="kanban-col-header">
              <span className="kanban-col-label">{label}</span>
              <span className="kanban-col-count">{tasks.length}</span>
            </div>
            <div className="kanban-col-cards">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onNavigate={onNavigate} />
              ))}
              {tasks.length === 0 && (
                <div className="kanban-col-empty">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
