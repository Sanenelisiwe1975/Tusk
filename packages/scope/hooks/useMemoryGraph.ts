import { useEntries } from "./useEntries";

export function useMemoryGraph() {
  const { data = [] } = useEntries();

  const nodes = data.map((entry, i) => ({
    id: entry.id,
    data: { label: `${entry.author} · ${entry.kind}` },
    position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 120 },
  }));

  const edges = data
    .filter((e) => e.parentId)
    .map((e) => ({
      id: `${e.parentId}-${e.id}`,
      source: e.parentId!,
      target: e.id
    }));

  return { nodes, edges };
}