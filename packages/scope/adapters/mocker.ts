import { InMemoryStore, seed } from "@tusk/core";
import type { MemoryStore } from "@tusk/core";

export async function createSeededStore(): Promise<MemoryStore> {
  const store = new InMemoryStore();
  await seed(store, "demo");
  return store;
}
