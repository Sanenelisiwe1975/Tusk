import { useCoordination } from "../hooks/useCoordination";
import { KanbanBoard } from "./coordination/KanbanBoard";
import { RunGraph } from "./coordination/RunGraph";

interface Props {
  namespace: string | null;
  onNavigate: (id: string) => void;
}

export function CoordinationPane({ namespace, onNavigate }: Props) {
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
          <CoordinationContent namespace={namespace} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

function CoordinationContent({
  namespace,
  onNavigate,
}: {
  namespace: string;
  onNavigate: (id: string) => void;
}) {
  const { byStatus, goals, tasks, isLoading } = useCoordination(namespace);

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
