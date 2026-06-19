import { useMemo } from "react";
import { useCoordination } from "../hooks/useCoordination";
import { entriesAsOf, tasksAsOf } from "../lib/replay";
import { KanbanBoard } from "./coordination/KanbanBoard";
import { RunGraph } from "./coordination/RunGraph";

interface Props {
  namespace: string | null;
  onNavigate: (id: string) => void;
  checkpoint?: number | null;
}

export function CoordinationPane({ namespace, onNavigate, checkpoint }: Props) {
  return (
    <div className="pane">
      <header className="pane-header">
        <span className="pane-title">Coordination</span>
        {namespace && <code className="pane-ns-tag">{namespace}</code>}
      </header>

      <div className="coordination-body">
        {!namespace ? (
          <div className="pane-centered">
            <p className="pane-placeholder-label">Select a run from the sidebar</p>
          </div>
        ) : (
          <CoordinationContent
            namespace={namespace}
            onNavigate={onNavigate}
            checkpoint={checkpoint ?? null}
          />
        )}
      </div>
    </div>
  );
}

function CoordinationContent({
  namespace,
  onNavigate,
  checkpoint,
}: {
  namespace: string;
  onNavigate: (id: string) => void;
  checkpoint: number | null;
}) {
  const { goals: liveGoals, tasks: liveTasks, isLoading } = useCoordination(namespace);

  const goals = checkpoint === null ? liveGoals : entriesAsOf(liveGoals, checkpoint);
  const tasks = checkpoint === null ? liveTasks : tasksAsOf(liveTasks, checkpoint);

  const byStatus = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === "pending"),
      claimed: tasks.filter((t) => t.status === "claimed"),
      done: tasks.filter((t) => t.status === "done"),
      failed: tasks.filter((t) => t.status === "failed"),
    }),
    [tasks]
  );

  if (isLoading) {
    return (
      <div className="timeline-status">
        <span className="timeline-loading-dot" />
        Loading tasks…
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="pane-centered">
        <p className="pane-placeholder-label">No tasks in this run</p>
      </div>
    );
  }

  return (
    <>
      <KanbanBoard byStatus={byStatus} onNavigate={onNavigate} />
      <RunGraph goals={goals} tasks={tasks} onNavigate={onNavigate} />
    </>
  );
}
