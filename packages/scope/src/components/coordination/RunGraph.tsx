import { useQuery } from "@tanstack/react-query";
import type { MemoryEntry, TaskRecord } from "@tusk/core";
import { getStore } from "../../store/source";

interface Props {
  goals: MemoryEntry[];
  tasks: TaskRecord[];
  onNavigate: (id: string) => void;
}

const STATUS_ICON: Record<string, string> = {
  pending: "○",
  claimed: "◐",
  done: "●",
  failed: "✗",
};

export function RunGraph({ goals, tasks, onNavigate }: Props) {
  const resultIds = [...new Set(tasks.flatMap((t) => (t.resultId ? [t.resultId] : [])))];

  const { data: resultMap = {} } = useQuery<Record<string, MemoryEntry | null>>({
    queryKey: ["graph-results", resultIds.join(",")],
    queryFn: async () => {
      const entries = await Promise.all(resultIds.map((id) => getStore().read(id)));
      return Object.fromEntries(resultIds.map((id, i) => [id, entries[i] ?? null]));
    },
    enabled: resultIds.length > 0,
    staleTime: Infinity,
  });

  if (goals.length === 0) return null;

  return (
    <div className="run-graph">
      <div className="run-graph-label">Run graph</div>
      {goals.map((goal) => {
        const goalTitle =
          goal.payload.kind === "goal" ? goal.payload.title : goal.id;
        const goalTasks = tasks.filter((t) => t.parentId === goal.id);

        return (
          <div key={goal.id} className="rg-goal">
            <div className="rg-goal-node">
              <span className="rg-goal-icon">⬡</span>
              <span className="rg-goal-title">{goalTitle}</span>
            </div>

            {goalTasks.length > 0 && (
              <div className="rg-tasks">
                {goalTasks.map((task, i) => {
                  const isLast = i === goalTasks.length - 1;
                  const result = task.resultId ? resultMap[task.resultId] : null;

                  return (
                    <div
                      key={task.id}
                      className={`rg-row${isLast ? " rg-row--last" : ""}`}
                    >
                      <div className={`rg-task-node rg-task-node--${task.status}`}>
                        <span className="rg-status-icon">
                          {STATUS_ICON[task.status] ?? "○"}
                        </span>
                        <span className="rg-task-label">{task.description}</span>
                        {task.claimedBy && (
                          <span className="rg-agent-tag">{task.claimedBy}</span>
                        )}
                      </div>

                      {result && (
                        <button
                          type="button"
                          className="rg-result-node"
                          onClick={() => onNavigate(result.id)}
                          title="Jump to result entry"
                        >
                          <span className="rg-result-arrow">→</span>
                          <span className="rg-result-text">
                            {result.payload.kind === "result"
                              ? result.payload.summary.length > 52
                                ? `${result.payload.summary.slice(0, 52)}…`
                                : result.payload.summary
                              : result.id}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
