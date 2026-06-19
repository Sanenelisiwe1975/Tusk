import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { VerifyResult } from "@tusk/core";
import { getStore } from "../store/source";

const vKey = (id: string) => ["verify", id] as const;

/** Auto-fetches verify result for a single entry. Use in the detail panel. */
export function useVerify(id: string | null) {
  return useQuery<VerifyResult>({
    queryKey: vKey(id ?? "__none__"),
    queryFn: () => getStore().verify(id!),
    enabled: id !== null,
    staleTime: Infinity, // content-addressed — result is immutable
    retry: false,
  });
}

/** Reads cached verify state without triggering a fetch. Use in timeline rows. */
export function useVerifyCache(id: string) {
  return useQuery<VerifyResult>({
    queryKey: vKey(id),
    queryFn: () => getStore().verify(id),
    enabled: false,
    staleTime: Infinity,
  });
}

/** Returns a function that batch-prefetches verify results for all given ids. */
export function useVerifyAll() {
  const queryClient = useQueryClient();
  return async (ids: string[]): Promise<void> => {
    await Promise.all(
      ids.map((id) =>
        queryClient.prefetchQuery({
          queryKey: vKey(id),
          queryFn: () => getStore().verify(id),
          staleTime: Infinity,
        })
      )
    );
  };
}
