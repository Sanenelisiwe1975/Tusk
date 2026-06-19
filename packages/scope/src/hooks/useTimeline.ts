import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MemoryEntry } from "@tusk/core";
import { getStore } from "../store/source";

export interface TimelineResult {
  entries: MemoryEntry[];
  highlightedIds: ReadonlySet<string>;
  isLoading: boolean;
  /** Increments with every live write — use as useEffect dep to scroll. */
  liveCount: number;
}

export function useTimeline(namespace: string | null): TimelineResult {
  const [liveEntries, setLiveEntries] = useState<MemoryEntry[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<ReadonlySet<string>>(
    new Set()
  );
  const [liveCount, setLiveCount] = useState(0);
  // `seen` lives outside state so the watch callback never closes over stale state.
  const seenRef = useRef(new Set<string>());

  // Initial load — staleTime 0 so re-selecting a namespace always refetches.
  const query = useQuery({
    queryKey: ["timeline", namespace],
    queryFn: () =>
      namespace ? getStore().list({ namespace }) : Promise.resolve([]),
    enabled: namespace !== null,
    staleTime: 0,
  });

  // Watch subscription — clean up on unmount or namespace change.
  useEffect(() => {
    if (!namespace) return;

    seenRef.current = new Set();
    setLiveEntries([]);
    setHighlightedIds(new Set());
    setLiveCount(0);

    const unsubscribe = getStore().watch(namespace, (entry) => {
      if (seenRef.current.has(entry.id)) return;
      seenRef.current.add(entry.id);

      setLiveEntries((prev) => [...prev, entry]);
      setLiveCount((c) => c + 1);
      setHighlightedIds((prev) => new Set([...prev, entry.id]));

      // Fade the highlight out after 2 s.
      setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }, 2000);
    });

    return unsubscribe;
  }, [namespace]);

  // Merge base (query) with live arrivals, deduplicated.
  const entries = useMemo(() => {
    const base = query.data ?? [];
    const baseIds = new Set(base.map((e) => e.id));
    return [...base, ...liveEntries.filter((e) => !baseIds.has(e.id))];
  }, [query.data, liveEntries]);

  return { entries, highlightedIds, isLoading: query.isLoading, liveCount };
}
