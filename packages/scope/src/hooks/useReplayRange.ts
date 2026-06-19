import { useQuery } from "@tanstack/react-query";
import type { MemoryEntry } from "@tusk/core";
import { getStore } from "../store/source";

export interface ReplayRange {
  min: number;
  max: number;
  entries: MemoryEntry[];
}

/** Shares the ["timeline", namespace] query cache with useTimeline, so the
 * slider's bounds don't trigger a second fetch when the timeline is mounted. */
export function useReplayRange(namespace: string | null): ReplayRange | null {
  const query = useQuery<MemoryEntry[]>({
    queryKey: ["timeline", namespace],
    queryFn: () => (namespace ? getStore().list({ namespace }) : Promise.resolve([])),
    enabled: namespace !== null,
    staleTime: 0,
  });

  const entries = query.data ?? [];
  if (entries.length === 0) return null;

  let min = entries[0]!.createdAt;
  let max = entries[0]!.createdAt;
  for (const e of entries) {
    if (e.createdAt < min) min = e.createdAt;
    if (e.createdAt > max) max = e.createdAt;
  }
  return { min, max, entries };
}
