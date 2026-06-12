# Tusk

Tusk is a decentralized agent memory system built on Walrus and Sui. A
manager agent decomposes a task into subtasks, a hive of specialist agents
claim and complete them, and every read, write, and result is stored as a
content-addressed blob with an on-chain pointer for verification.

## Structure

- `packages/core` — Tusk Memory SDK: Walrus blob client, memory
  read/write/search/verify interface, shared types, and content hashing.
- `packages/contracts` — Sui Move contracts for the namespace registry and
  subtask lifecycle.
- `packages/agents` — Hive runtime: manager (decompose/validate/assemble),
  specialist base loop, and role implementations (researcher, analyst,
  writer).
- `packages/scope` — MemoryScope, a React app for visualizing memory
  timelines, diffs, and replays.
- `apps/demo` — A scripted end-to-end demo scenario.
