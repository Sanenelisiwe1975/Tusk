import { useQuery } from "@tanstack/react-query";
import { getStore } from "../adapters/memoryStore";

export function useEntries() {
    return useQuery ({
        queryKey: ["entries"],
        queryFn: () => getStore().list()
    });
}