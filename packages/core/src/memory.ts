import { randomUUID } from "node:crypto";
import { hashPayload } from "./hash";
import type { MemoryStore } from "./store";
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

type Listener = (entry: MemoryEntry) => void;

/// Reference MemoryStore implementation backed by in-process arrays. Used
/// for tests and local development; WalrusStore is the production
/// counterpart and must satisfy the same contract tests.
export class InMemoryStore implements MemoryStore {
  private entries: MemoryEntry[] = [];
  private tasks: TaskRecord[] = [];
  private watchers = new Map<Namespace, Set<Listener>>();
  private clock = 0;

  async write(input: WriteInput): Promise<MemoryEntry> {
    const id = this.nextId("entry");
    const createdAt = this.nextTimestamp();

    const entry: MemoryEntry = {
      id,
      namespace: input.namespace,
      author: input.author,
      kind: input.payload.kind,
      payload: input.payload,
      blobId: `mem://${id}`,
      hash: hashPayload(input.payload),
      createdAt,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    };

    this.entries.push(entry);
    this.notify(entry);
    return entry;
  }

  async read(id: EntryId): Promise<MemoryEntry | null> {
    return this.entries.find((entry) => entry.id === id) ?? null;
  }

  async list(filter: ListFilter = {}): Promise<MemoryEntry[]> {
    let results = this.entries.slice();

    if (filter.namespace !== undefined) {
      results = results.filter((entry) => entry.namespace === filter.namespace);
    }
    if (filter.author !== undefined) {
      results = results.filter((entry) => entry.author === filter.author);
    }
    if (filter.kind !== undefined) {
      results = results.filter((entry) => entry.kind === filter.kind);
    }
    if (filter.parentId !== undefined) {
      results = results.filter((entry) => entry.parentId === filter.parentId);
    }
    if (filter.since !== undefined) {
      results = results.filter((entry) => entry.createdAt >= filter.since!);
    }

    results = results.slice().sort((a, b) => a.createdAt - b.createdAt);

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async search(namespace: Namespace, query: string, limit?: number): Promise<MemoryEntry[]> {
    const needle = query.toLowerCase();

    const matches = this.entries
      .filter((entry) => entry.namespace === namespace)
      .filter((entry) => JSON.stringify(entry.payload).toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt - a.createdAt);

    return limit !== undefined ? matches.slice(0, limit) : matches;
  }

  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const now = this.nextTimestamp();
    const task: TaskRecord = {
      id: this.nextId("task"),
      namespace: input.namespace,
      description: input.description,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    };

    this.tasks.push(task);
    return task;
  }

  async claimTask(taskId: TaskId, agentId: AgentId): Promise<TaskRecord> {
    const task = this.findTask(taskId);
    task.status = "claimed";
    task.claimedBy = agentId;
    task.updatedAt = this.nextTimestamp();
    return task;
  }

  async completeTask(taskId: TaskId, resultId: EntryId): Promise<TaskRecord> {
    const task = this.findTask(taskId);
    task.status = "done";
    task.resultId = resultId;
    task.updatedAt = this.nextTimestamp();
    return task;
  }

  async failTask(taskId: TaskId, error: string): Promise<TaskRecord> {
    const task = this.findTask(taskId);
    task.status = "failed";
    task.error = error;
    task.updatedAt = this.nextTimestamp();
    return task;
  }

  async listTasks(filter: TaskFilter = {}): Promise<TaskRecord[]> {
    let results = this.tasks.slice();

    if (filter.namespace !== undefined) {
      results = results.filter((task) => task.namespace === filter.namespace);
    }
    if (filter.status !== undefined) {
      results = results.filter((task) => task.status === filter.status);
    }

    return results.sort((a, b) => a.createdAt - b.createdAt);
  }

  async verify(id: EntryId): Promise<VerifyResult> {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Unknown entry: ${id}`);

    const localHash = hashPayload(entry.payload);
    const anchoredHash = entry.hash;
    return { ok: localHash === anchoredHash, localHash, anchoredHash };
  }

  watch(namespace: Namespace, listener: Listener): () => void {
    const listeners = this.watchers.get(namespace) ?? new Set<Listener>();
    listeners.add(listener);
    this.watchers.set(namespace, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  private findTask(taskId: TaskId): TaskRecord {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    return task;
  }

  private notify(entry: MemoryEntry): void {
    for (const listener of this.watchers.get(entry.namespace) ?? []) {
      listener(entry);
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}-${randomUUID()}`;
  }

  private nextTimestamp(): number {
    const now = Date.now();
    this.clock = now > this.clock ? now : this.clock + 1;
    return this.clock;
  }
}
