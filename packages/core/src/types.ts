// Identifiers -----------------------------------------------------------

export type EntryId = string;
export type TaskId = string;
export type AgentId = string;
export type Namespace = string;
export type BlobId = string;
export type Hash = string;

// Payload -----------------------------------------------------------------

/// The union of everything an agent can write into memory. `kind` is the
/// discriminant and is mirrored onto MemoryEntry.kind for filtering.
export type Payload =
  | { kind: "goal"; title: string; description: string }
  | { kind: "result"; summary: string; data?: Record<string, unknown> }
  | { kind: "note"; text: string }
  | { kind: "log"; message: string; level?: "info" | "warn" | "error" };

// Memory entries ------------------------------------------------------------

/// A single, content-addressed entry in the shared memory timeline.
export interface MemoryEntry {
  id: EntryId;
  namespace: Namespace;
  author: AgentId;
  kind: Payload["kind"];
  parentId?: EntryId;
  payload: Payload;
  blobId: BlobId;
  hash: Hash;
  createdAt: number;
}

/// Input to MemoryStore.write(). The store fills in id, blobId, hash, and
/// createdAt.
export interface WriteInput {
  namespace: Namespace;
  author: AgentId;
  payload: Payload;
  parentId?: EntryId;
}

/// Query filters for MemoryStore.list().
export interface ListFilter {
  namespace?: Namespace;
  author?: AgentId;
  kind?: Payload["kind"];
  parentId?: EntryId;
  since?: number;
  limit?: number;
}

// Tasks ---------------------------------------------------------------------

export type TaskStatus = "pending" | "claimed" | "done" | "failed";

/// A unit of work tracked through claim/complete/fail, independent of the
/// memory entry timeline (though results are linked back via resultId).
export interface TaskRecord {
  id: TaskId;
  namespace: Namespace;
  parentId?: EntryId;
  description: string;
  status: TaskStatus;
  claimedBy?: AgentId;
  resultId?: EntryId;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/// Input to MemoryStore.createTask().
export interface CreateTaskInput {
  namespace: Namespace;
  description: string;
  parentId?: EntryId;
}

/// Query filters for MemoryStore.listTasks().
export interface TaskFilter {
  namespace?: Namespace;
  status?: TaskStatus;
}

// Verification ----------------------------------------------------------------

/// Result of comparing a recomputed content hash against the anchored one.
export interface VerifyResult {
  ok: boolean;
  localHash: Hash;
  anchoredHash: Hash;
}
