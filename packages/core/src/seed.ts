import type { MemoryStore } from "./store";
import type { MemoryEntry, Namespace, TaskRecord } from "./types";

export interface SeedResult {
  goal: MemoryEntry;
  tasks: TaskRecord[];
  result: MemoryEntry;
}

/// Populates a store with a small, realistic timeline: a goal written by
/// the manager, two tasks derived from it, one of which a specialist claims
/// and completes with a result entry linked back to the goal and the task.
export async function seed(store: MemoryStore, namespace: Namespace = "demo"): Promise<SeedResult> {
  const goal = await store.write({
    namespace,
    author: "manager",
    payload: {
      kind: "goal",
      title: "Summarize the Tusk architecture",
      description: "Produce a short summary of how memory, tasks, and verification fit together.",
    },
  });

  const researchTask = await store.createTask({
    namespace,
    parentId: goal.id,
    description: "Research how MemoryStore, tasks, and verification relate",
  });

  const writeupTask = await store.createTask({
    namespace,
    parentId: goal.id,
    description: "Write the summary once research is complete",
  });

  await store.claimTask(researchTask.id, "researcher");

  const result = await store.write({
    namespace,
    author: "researcher",
    parentId: goal.id,
    payload: {
      kind: "result",
      summary: "MemoryStore is the single read/write/verify surface; tasks track work, entries record history.",
    },
  });

  const completedResearchTask = await store.completeTask(researchTask.id, result.id);

  return { goal, tasks: [completedResearchTask, writeupTask], result };
}
