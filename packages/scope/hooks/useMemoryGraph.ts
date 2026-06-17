import { useEntries } from "./useEntries";

export function useMemoryGraph() {
  const { data = [] } = useEntries();

  const nodes = data.map((entry) => ({
    id: entry.id,
    data: {
      label: entry.author
    },
    position: {
      x: Math.random() * 500,
      y: Math.random() * 500
    }
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