import { useQuery } from "@tanstack/react-query";
import { getStore } from "../store/source";

export interface NamespaceSummary {
  namespace: string;
  count: number;
}

export function useNamespaces() {
  return useQuery<NamespaceSummary[]>({
    queryKey: ["namespaces"],
    queryFn: async () => {
      const entries = await getStore().list();
      const counts = new Map<string, number>();
      for (const e of entries) {
        counts.set(e.namespace, (counts.get(e.namespace) ?? 0) + 1);
      }
      return [...counts.entries()].map(([namespace, count]) => ({ namespace, count }));
    },
  });
}
