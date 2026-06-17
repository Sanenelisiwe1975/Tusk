import { randomUUID } from "node:crypto";
import { InMemoryStore } from "@tusk/core";
import { describe, expect, it } from "vitest";
import { FakeLLM, type LLM } from "../llm";
import { Manager } from "../manager";
import { Analyst, Researcher, Writer } from "../roles";
import { runGoal } from "../runtime";
import { parseTaskDescription } from "../specialist";

describe("Hive runtime (InMemoryStore + FakeLLM)", () => {
  it("decomposes a goal into 3-5 role-tagged subtasks, all completed", async () => {
    const store = new InMemoryStore();
    const namespace = randomUUID();

    await runGoal(store, new FakeLLM(), "Plan a Mars colony", { namespace });

    const tasks = await store.listTasks({ namespace });
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks.length).toBeLessThanOrEqual(5);

    const roles = tasks.map((task) => parseTaskDescription(task.description).role).sort();
    expect(roles).toEqual(["analyst", "researcher", "writer"]);

    for (const task of tasks) {
      expect(task.status).toBe("done");
    }
  });

  it("specialists claim only tasks for their role and link results via parent", async () => {
    const store = new InMemoryStore();
    const namespace = randomUUID();

    await runGoal(store, new FakeLLM(), "Plan a Mars colony", { namespace });

    const tasks = await store.listTasks({ namespace });
    for (const task of tasks) {
      const { role } = parseTaskDescription(task.description);
      expect(task.resultId).toBeTruthy();

      const result = await store.read(task.resultId!);
      expect(result).not.toBeNull();
      expect(result!.parentId).toBe(task.id);
      expect(result!.author).toBe(role);
    }
  });

  it("manager assembles a final artifact entry once all subtasks are done", async () => {
    const store = new InMemoryStore();
    const namespace = randomUUID();

    const artifact = await runGoal(store, new FakeLLM(), "Plan a Mars colony", { namespace });

    expect(artifact.payload.kind).toBe("result");
    if (artifact.payload.kind !== "result") throw new Error("unreachable");
    expect(artifact.payload.data?.["artifact"]).toBe(true);

    const goals = await store.list({ namespace, kind: "goal" });
    expect(goals).toHaveLength(1);
    expect(artifact.parentId).toBe(goals[0]!.id);

    // The assembled summary reflects each specialist's contribution.
    expect(artifact.payload.summary).toContain("[researcher]");
    expect(artifact.payload.summary).toContain("[analyst]");
    expect(artifact.payload.summary).toContain("[writer]");
  });

  it("a specialist that hangs mid-task is retried by a fresh one, and the run still completes", async () => {
    const store = new InMemoryStore();
    const fakeLlm = new FakeLLM();
    const hangingLlm: LLM = { complete: () => new Promise<string>(() => {}) };
    const namespace = randomUUID();

    const manager = new Manager(store, fakeLlm, { pollIntervalMs: 5, staleClaimMs: 30, maxRetries: 1 });

    const stuckResearcher = new Researcher(store, hangingLlm, "researcher-stuck");
    const analyst = new Analyst(store, fakeLlm);
    const writer = new Writer(store, fakeLlm);

    void stuckResearcher.run(namespace, new AbortController().signal);
    void analyst.run(namespace, new AbortController().signal);
    void writer.run(namespace, new AbortController().signal);

    const artifactPromise = manager.run(namespace, "Plan a Mars colony");

    // Let the stuck researcher claim its task and let that claim go stale
    // before a freshly "restarted" researcher starts polling.
    await new Promise((resolve) => setTimeout(resolve, 60));
    const freshResearcher = new Researcher(store, fakeLlm, "researcher-fresh");
    void freshResearcher.run(namespace, new AbortController().signal);

    const artifact = await artifactPromise;
    expect(artifact.payload.kind).toBe("result");

    const tasks = await store.listTasks({ namespace });
    const researcherTasks = tasks.filter((task) => parseTaskDescription(task.description).role === "researcher");

    // The original task is left stuck "claimed"; a retry was created and done.
    expect(researcherTasks.some((task) => task.status === "claimed")).toBe(true);
    const done = researcherTasks.find((task) => task.status === "done");
    expect(done).toBeTruthy();

    const result = await store.read(done!.resultId!);
    expect(result?.author).toBe("researcher-fresh");
  });
});
