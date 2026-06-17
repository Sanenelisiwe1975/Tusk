import { useQuery } from "@tanstack/react-query";
import { getStore } from "../adapters/memoryStore";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => getStore().listTasks()
  });
}