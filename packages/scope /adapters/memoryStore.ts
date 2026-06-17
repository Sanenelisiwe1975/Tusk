import type { MemoryStore } from "@tusk/core";
import { store } from "./mock";

let activeStore: MemoryStore = store;

export function getStore() {
  return activeStore;
}

export function setStore(store: MemoryStore) {
  activeStore = store;
}
