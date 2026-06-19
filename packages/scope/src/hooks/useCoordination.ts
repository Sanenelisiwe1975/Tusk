import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemoryEntry, TaskRecord } from "@tusk/core";
import { getStore } from "../store/source";

export interface CoordinationData {
  tasks: TaskRecord[];
  goals: MemoryEntry[];
  byStatus: {
    pending: TaskRecord[];
    claimed: TaskRecord[];
    done: TaskRecord[];
    failed: TaskRecord[];
  };
  isLoading: boolean;
}

export function useCoordination(namespace: string | null): CoordinationData {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery<TaskRecord[]>({
    queryKey: ["tasks", namespace],
    queryFn: () =>
      namespace ? getStore().listTasks({ namespace }) : Promise.resolve([]),
    enabled: namespace !== null,
    staleTime: 0,
    refetchInterval: 2_000,
  });

  const goalsQuery = useQuery<MemoryEntry[]>({
    queryKey: ["goals", namespace],
    queryFn: () =>
      namespace
        ? getStore().list({ namespace, kind: "goal" })
        : Promise.resolve([]),
    enabled: namespace !== null,
    staleTime: 0,
    refetchInterval: 2_000,
  });

  // Invalidate on new entries — task.done always coincides with a result write,
  // and claimTask results may be followed by a log/note write too.
  useEffect(() => {
    if (!namespace) return;
    return getStore().watch(namespace, () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", namespace] });
      void queryClient.invalidateQueries({ queryKey: ["goals", namespace] });
    });
  }, [namespace, queryClient]);

  const tasks = tasksQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  const byStatus = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === "pending"),
      claimed: tasks.filter((t) => t.status === "claimed"),
      done: tasks.filter((t) => t.status === "done"),
      failed: tasks.filter((t) => t.status === "failed"),
    }),
    [tasks]
  );

  return {
    tasks,
    goals,
    byStatus,
    isLoading: tasksQuery.isLoading || goalsQuery.isLoading,
  };
}
