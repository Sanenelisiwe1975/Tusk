import { describe, expect, it } from "vitest";
import { seed } from "../seed";
import type { MemoryStore } from "../store";
import type { MemoryEntry } from "../types";

/// Behavioral contract for any MemoryStore implementation. Run this against
/// InMemoryStore now, and against WalrusStore once it's implemented.
export function memoryStoreContractTests(factory: () => MemoryStore): void {
  describe("MemoryStore contract", () => {
    it("write() sets id, blobId, hash, createdAt", async () => {
      const store = factory();

      const entry = await store.write({
        namespace: "ns",
        author: "alice",
        payload: { kind: "note", text: "hello" },
      });

      expect(entry.id).toBeTruthy();
      expect(entry.blobId).toBeTruthy();
      expect(entry.hash).toBeTruthy();
      expect(typeof entry.createdAt).toBe("number");
      expect(entry.namespace).toBe("ns");
      expect(entry.author).toBe("alice");
      expect(entry.kind).toBe("note");
    });

    it("read() round-trips; unknown id returns null", async () => {
      const store = factory();

      const written = await store.write({
        namespace: "ns",
        author: "alice",
        payload: { kind: "note", text: "hello" },
      });

      expect(await store.read(written.id)).toEqual(written);
      expect(await store.read("does-not-exist")).toBeNull();
    });

    it("list() filters by author, kind, parent, since; sorts by createdAt", async () => {
      const store = factory();

      const goal = await store.write({
        namespace: "ns",
        author: "manager",
        payload: { kind: "goal", title: "Goal", description: "..." },
      });
      const noteA = await store.write({
        namespace: "ns",
        author: "alice",
        parentId: goal.id,
        payload: { kind: "note", text: "first" },
      });
      const noteB = await store.write({
        namespace: "ns",
        author: "bob",
        parentId: goal.id,
        payload: { kind: "note", text: "second" },
      });

      const all = await store.list({ namespace: "ns" });
      expect(all.map((entry) => entry.id)).toEqual([goal.id, noteA.id, noteB.id]);

      const byAuthor = await store.list({ namespace: "ns", author: "alice" });
      expect(byAuthor.map((entry) => entry.id)).toEqual([noteA.id]);

      const byKind = await store.list({ namespace: "ns", kind: "goal" });
      expect(byKind.map((entry) => entry.id)).toEqual([goal.id]);

      const byParent = await store.list({ namespace: "ns", parentId: goal.id });
      expect(byParent.map((entry) => entry.id)).toEqual([noteA.id, noteB.id]);

      const bySince = await store.list({ namespace: "ns", since: noteA.createdAt });
      expect(bySince.map((entry) => entry.id)).toEqual([noteA.id, noteB.id]);
    });

    it("search() matches payload text and respects limit", async () => {
      const store = factory();

      await store.write({ namespace: "ns", author: "a", payload: { kind: "note", text: "alpha banana" } });
      await store.write({ namespace: "ns", author: "a", payload: { kind: "note", text: "banana split" } });
      await store.write({ namespace: "ns", author: "a", payload: { kind: "note", text: "cherry pie" } });

      const matches = await store.search("ns", "banana");
      expect(matches).toHaveLength(2);

      const limited = await store.search("ns", "banana", 1);
      expect(limited).toHaveLength(1);
    });

    it("task lifecycle: createTask -> pending, claimTask -> claimed+claimedBy, completeTask -> done+resultId, failTask -> failed+error", async () => {
      const store = factory();

      const task = await store.createTask({ namespace: "ns", description: "do work" });
      expect(task.status).toBe("pending");

      const claimed = await store.claimTask(task.id, "agent-1");
      expect(claimed.status).toBe("claimed");
      expect(claimed.claimedBy).toBe("agent-1");

      const result = await store.write({
        namespace: "ns",
        author: "agent-1",
        payload: { kind: "result", summary: "done" },
      });
      const done = await store.completeTask(task.id, result.id);
      expect(done.status).toBe("done");
      expect(done.resultId).toBe(result.id);

      const other = await store.createTask({ namespace: "ns", description: "other" });
      const failed = await store.failTask(other.id, "boom");
      expect(failed.status).toBe("failed");
      expect(failed.error).toBe("boom");
    });

    it("listTasks() filters by status", async () => {
      const store = factory();

      const pendingTask = await store.createTask({ namespace: "ns", description: "a" });
      const claimedTask = await store.createTask({ namespace: "ns", description: "b" });
      await store.claimTask(claimedTask.id, "agent-1");

      const pending = await store.listTasks({ namespace: "ns", status: "pending" });
      expect(pending.map((task) => task.id)).toEqual([pendingTask.id]);

      const claimed = await store.listTasks({ namespace: "ns", status: "claimed" });
      expect(claimed.map((task) => task.id)).toEqual([claimedTask.id]);
    });

    it("verify() returns ok:true for an unmodified entry and exposes localHash + anchoredHash", async () => {
      const store = factory();

      const entry = await store.write({ namespace: "ns", author: "a", payload: { kind: "note", text: "hello" } });

      const result = await store.verify(entry.id);
      expect(result.ok).toBe(true);
      expect(result.localHash).toBe(entry.hash);
      expect(result.anchoredHash).toBe(entry.hash);
    });

    it("watch() fires only for new writes in its namespace; unsubscribe stops it", async () => {
      const store = factory();
      const seen: MemoryEntry[] = [];
      const unsubscribe = store.watch("ns", (entry) => seen.push(entry));

      await store.write({ namespace: "other", author: "a", payload: { kind: "note", text: "ignored" } });
      await store.write({ namespace: "ns", author: "a", payload: { kind: "note", text: "first" } });

      expect(seen).toHaveLength(1);
      expect(seen[0]?.payload).toEqual({ kind: "note", text: "first" });

      unsubscribe();
      await store.write({ namespace: "ns", author: "a", payload: { kind: "note", text: "second" } });
      expect(seen).toHaveLength(1);
    });

    it("seed() yields a goal, two tasks, and one completed result linked by parent/taskId", async () => {
      const store = factory();

      const seeded = await seed(store);

      expect(seeded.goal.kind).toBe("goal");
      expect(seeded.tasks).toHaveLength(2);

      const done = seeded.tasks.find((task) => task.status === "done");
      const pending = seeded.tasks.find((task) => task.status === "pending");

      expect(done?.parentId).toBe(seeded.goal.id);
      expect(pending?.parentId).toBe(seeded.goal.id);
      expect(done?.resultId).toBe(seeded.result.id);
      expect(seeded.result.parentId).toBe(seeded.goal.id);
    });
  });
}
