import type { MemoryEntry, TaskRecord } from "@tusk/core";

/** Entries are immutable and content-addressed, so "as of" a checkpoint is a
 * plain createdAt cutoff over whatever store.list(namespace) already returned —
 * no core changes needed. */
export function entriesAsOf(entries: MemoryEntry[], checkpoint: number): MemoryEntry[] {
  return entries.filter((e) => e.createdAt <= checkpoint);
}

/** TaskRecord only exposes its latest status, not a history of transitions.
 * A task whose last update happened after the checkpoint is shown in its
 * earliest known state — "pending" as of createdAt — rather than a status
 * that wasn't true yet at that point in the run. */
export function tasksAsOf(tasks: TaskRecord[], checkpoint: number): TaskRecord[] {
  return tasks
    .filter((t) => t.createdAt <= checkpoint)
    .map((t) =>
      t.updatedAt <= checkpoint
        ? t
        : {
            ...t,
            status: "pending" as const,
            claimedBy: undefined,
            resultId: undefined,
            error: undefined,
          }
    );
}
