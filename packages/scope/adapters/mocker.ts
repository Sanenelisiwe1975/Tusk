import { InMemoryStore } from "@tusk/core";

export const store = new InMemoryStore();

await store.write({
  namespace: "research",
  author: "research-agent",
  payload: {
    kind: "note",
    text: "Initial research"
  }
});

await store.write({
  namespace: "research",
  author: "review-agent",
  parentId: "entry-1",
  payload: {
    kind: "review",
    text: "Looks good"
  }
});