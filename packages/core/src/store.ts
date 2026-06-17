import type {
  AgentId,
  CreateTaskInput,
  EntryId,
  ListFilter,
  MemoryEntry,
  Namespace,
  TaskFilter,
  TaskId,
  TaskRecord,
  VerifyResult,
  WriteInput,
} from "./types";

/// The shared interface agents and UIs use to coordinate: a content-addressed
/// memory timeline plus a claim/complete/fail task queue layered on top of it.
export interface MemoryStore {
  /// Writes a new memory entry, computing its id, blobId, hash, and createdAt.
  write(input: WriteInput): Promise<MemoryEntry>;

  /// Reads a single entry by id, or null if it doesn't exist.
  read(id: EntryId): Promise<MemoryEntry | null>;

  /// Lists entries matching the given filter, sorted by createdAt ascending.
  list(filter?: ListFilter): Promise<MemoryEntry[]>;

  /// Full-text search over payloads within a namespace, newest match first,
  /// capped at `limit` results (if provided).
  search(namespace: Namespace, query: string, limit?: number): Promise<MemoryEntry[]>;

  /// Creates a new task in "pending" status.
  createTask(input: CreateTaskInput): Promise<TaskRecord>;

  /// Claims a pending task for an agent, moving it to "claimed".
  claimTask(taskId: TaskId, agentId: AgentId): Promise<TaskRecord>;

  /// Marks a task "done" and links it to the memory entry holding its result.
  completeTask(taskId: TaskId, resultId: EntryId): Promise<TaskRecord>;

  /// Marks a task "failed" with an error message.
  failTask(taskId: TaskId, error: string): Promise<TaskRecord>;

  /// Lists tasks matching the given filter.
  listTasks(filter?: TaskFilter): Promise<TaskRecord[]>;

  /// Recomputes the hash of an entry's payload and compares it against the
  /// anchored hash recorded at write time.
  verify(id: EntryId): Promise<VerifyResult>;

  /// Subscribes to new writes in a namespace. Returns an unsubscribe function.
  /// Does not replay entries written before the call.
  watch(namespace: Namespace, listener: (entry: MemoryEntry) => void): () => void;
}
