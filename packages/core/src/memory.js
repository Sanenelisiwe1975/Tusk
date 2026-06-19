import { randomUUID } from "node:crypto";
import { hashPayload } from "./hash";
/// Reference MemoryStore implementation backed by in-process arrays. Used
/// for tests and local development; WalrusStore is the production
/// counterpart and must satisfy the same contract tests.
export class InMemoryStore {
    entries = [];
    tasks = [];
    watchers = new Map();
    clock = 0;
    async write(input) {
        const id = this.nextId("entry");
        const createdAt = this.nextTimestamp();
        const entry = {
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
    async read(id) {
        return this.entries.find((entry) => entry.id === id) ?? null;
    }
    async list(filter = {}) {
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
            results = results.filter((entry) => entry.createdAt >= filter.since);
        }
        results = results.slice().sort((a, b) => a.createdAt - b.createdAt);
        if (filter.limit !== undefined) {
            results = results.slice(0, filter.limit);
        }
        return results;
    }
    async search(namespace, query, limit) {
        const needle = query.toLowerCase();
        const matches = this.entries
            .filter((entry) => entry.namespace === namespace)
            .filter((entry) => JSON.stringify(entry.payload).toLowerCase().includes(needle))
            .sort((a, b) => b.createdAt - a.createdAt);
        return limit !== undefined ? matches.slice(0, limit) : matches;
    }
    async createTask(input) {
        const now = this.nextTimestamp();
        const task = {
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
    async claimTask(taskId, agentId) {
        const task = this.findTask(taskId);
        task.status = "claimed";
        task.claimedBy = agentId;
        task.updatedAt = this.nextTimestamp();
        return task;
    }
    async completeTask(taskId, resultId) {
        const task = this.findTask(taskId);
        task.status = "done";
        task.resultId = resultId;
        task.updatedAt = this.nextTimestamp();
        return task;
    }
    async failTask(taskId, error) {
        const task = this.findTask(taskId);
        task.status = "failed";
        task.error = error;
        task.updatedAt = this.nextTimestamp();
        return task;
    }
    async listTasks(filter = {}) {
        let results = this.tasks.slice();
        if (filter.namespace !== undefined) {
            results = results.filter((task) => task.namespace === filter.namespace);
        }
        if (filter.status !== undefined) {
            results = results.filter((task) => task.status === filter.status);
        }
        return results.sort((a, b) => a.createdAt - b.createdAt);
    }
    async verify(id) {
        const entry = this.entries.find((e) => e.id === id);
        if (!entry)
            throw new Error(`Unknown entry: ${id}`);
        const localHash = hashPayload(entry.payload);
        const anchoredHash = entry.hash;
        return { ok: localHash === anchoredHash, localHash, anchoredHash };
    }
    watch(namespace, listener) {
        const listeners = this.watchers.get(namespace) ?? new Set();
        listeners.add(listener);
        this.watchers.set(namespace, listeners);
        return () => {
            listeners.delete(listener);
        };
    }
    findTask(taskId) {
        const task = this.tasks.find((t) => t.id === taskId);
        if (!task)
            throw new Error(`Unknown task: ${taskId}`);
        return task;
    }
    notify(entry) {
        for (const listener of this.watchers.get(entry.namespace) ?? []) {
            listener(entry);
        }
    }
    nextId(prefix) {
        return `${prefix}-${randomUUID()}`;
    }
    nextTimestamp() {
        const now = Date.now();
        this.clock = now > this.clock ? now : this.clock + 1;
        return this.clock;
    }
}
