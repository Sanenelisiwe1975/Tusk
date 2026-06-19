import { useQuery } from "@tanstack/react-query";
import type { MemoryEntry, TaskRecord } from "@tusk/core";
import { getStore } from "../store/source";

export function useEntry(id: string | null) {
  return useQuery<MemoryEntry | null>({
    queryKey: ["entry", id],
    queryFn: () => (id ? getStore().read(id) : Promise.resolve(null)),
    enabled: id !== null,
    staleTime: Infinity, // entries are immutable content-addressed blobs
  });
}

export function useChildren(namespace: string | null, parentId: string | null) {
  return useQuery<MemoryEntry[]>({
    queryKey: ["children", namespace, parentId],
    queryFn: () =>
      namespace && parentId
        ? getStore().list({ namespace, parentId })
        : Promise.resolve([]),
    enabled: namespace !== null && parentId !== null,
    staleTime: 0,
  });
}

// Find the TaskRecord whose resultId points at a given result entry.
// Links result entries back to the task they fulfilled.
export function useTaskForResult(namespace: string | null, resultEntryId: string | null) {
  return useQuery<TaskRecord | null>({
    queryKey: ["task-for-result", namespace, resultEntryId],
    queryFn: async () => {
      if (!namespace || !resultEntryId) return null;
      const tasks = await getStore().listTasks({ namespace });
      return tasks.find((t) => t.resultId === resultEntryId) ?? null;
    },
    enabled: namespace !== null && resultEntryId !== null,
    staleTime: Infinity,
  });
}
