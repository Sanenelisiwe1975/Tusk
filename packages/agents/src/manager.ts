import type { EntryId, MemoryEntry, MemoryStore, Namespace, TaskId, TaskRecord } from "@tusk/core";
import type { LLM } from "./llm";
import { formatTaskDescription, ROLES, type Role } from "./specialist";

export const DECOMPOSE_SYSTEM_PROMPT =
  "You are the manager of a small agent team (researcher, analyst, writer). " +
  "Given a goal, break it down into 3-5 concrete subtasks that together " +
  "cover everything needed to produce a high quality final deliverable. " +
  'Respond ONLY with a JSON array of subtasks, each an object with "role" ' +
  '(one of "researcher", "analyst", "writer") and "description" (a ' +
  "specific, self-contained instruction for that specialist -- state " +
  "exactly what to investigate, analyze, or write, since the specialist " +
  "will see only its own description, not this plan). Do not include any " +
  "other text, explanation, or markdown formatting -- only the raw JSON " +
  "array.";

export const ASSEMBLE_SYSTEM_PROMPT =
  "You are the manager of a small agent team. You are given the original " +
  "goal and the results produced by the researcher, analyst, and writer. " +
  "Respond with the final artifact: a well-organized, polished deliverable " +
  "in markdown that directly accomplishes the goal, synthesizing and " +
  "building on the specialists' results rather than just repeating them. " +
  "Respond with only the final artifact -- no preamble or commentary.";

export interface SubtaskSpec {
  role: Role;
  description: string;
}

export interface ManagerOptions {
  /// How often to poll task status while waiting for subtasks to resolve.
  pollIntervalMs?: number;
  /// How long a task may sit "claimed" with no progress before its claim is
  /// considered abandoned and the subtask is retried.
  staleClaimMs?: number;
  /// How many times to retry a subtask that fails or whose claim goes stale.
  maxRetries?: number;
}

interface Slot {
  spec: SubtaskSpec;
  taskId: TaskId;
  resultId?: EntryId;
  retriesLeft: number;
  resolved: boolean;
}

/// Decomposes a goal into role-tagged subtasks, waits for Specialists to
/// resolve them via the store, and assembles the final artifact entry.
export class Manager {
  private pollIntervalMs: number;
  private staleClaimMs: number;
  private maxRetries: number;

  constructor(
    private store: MemoryStore,
    private llm: LLM,
    options: ManagerOptions = {},
    private agentId = "manager",
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 10;
    this.staleClaimMs = options.staleClaimMs ?? 5_000;
    this.maxRetries = options.maxRetries ?? 1;
  }

  /// Writes the goal entry, decomposes it into subtasks, waits for them to
  /// be resolved, and returns the assembled artifact entry.
  async run(namespace: Namespace, goal: string): Promise<MemoryEntry> {
    const goalEntry = await this.store.write({
      namespace,
      author: this.agentId,
      payload: { kind: "goal", title: goal, description: goal },
    });

    const specs = await this.decompose(goal);

    const slots: Slot[] = [];
    for (const spec of specs) {
      const task = await this.createSubtask(namespace, goalEntry.id, goal, spec);
      slots.push({ spec, taskId: task.id, retriesLeft: this.maxRetries, resolved: false });
    }

    await this.waitForAll(namespace, goalEntry.id, goal, slots);

    return this.assemble(namespace, goalEntry, slots);
  }

  private async decompose(goal: string): Promise<SubtaskSpec[]> {
    const raw = await this.llm.complete(DECOMPOSE_SYSTEM_PROMPT, goal);
    const parsed: unknown = JSON.parse(stripCodeFence(raw));
    if (!Array.isArray(parsed)) throw new Error("decompose: expected a JSON array of subtasks");

    const specs = parsed
      .filter(isSubtaskSpec)
      .slice(0, 5);

    if (specs.length === 0) throw new Error("decompose: no valid subtasks returned");
    return specs;
  }

  private async createSubtask(namespace: Namespace, goalId: EntryId, goal: string, spec: SubtaskSpec): Promise<TaskRecord> {
    return this.store.createTask({
      namespace,
      parentId: goalId,
      description: formatTaskDescription(spec.role, spec.description, goal),
    });
  }

  /// Polls task status until every subtask is "done", or has failed/gone
  /// stale and exhausted its retries.
  private async waitForAll(namespace: Namespace, goalId: EntryId, goal: string, slots: Slot[]): Promise<void> {
    while (true) {
      const tasks = await this.store.listTasks({ namespace });
      let pending = false;

      for (const slot of slots) {
        if (slot.resolved) continue;

        const task = tasks.find((t) => t.id === slot.taskId);
        if (!task) {
          pending = true;
          continue;
        }

        if (task.status === "done") {
          slot.resultId = task.resultId;
          slot.resolved = true;
          continue;
        }

        const stale = task.status === "claimed" && Date.now() - task.updatedAt > this.staleClaimMs;
        if (task.status === "failed" || stale) {
          if (slot.retriesLeft > 0) {
            slot.retriesLeft -= 1;
            const retry = await this.createSubtask(namespace, goalId, goal, slot.spec);
            slot.taskId = retry.id;
          } else {
            slot.resolved = true;
            continue;
          }
        }

        pending = true;
      }

      if (!pending) return;
      await sleep(this.pollIntervalMs);
    }
  }

  private async assemble(namespace: Namespace, goalEntry: MemoryEntry, slots: Slot[]): Promise<MemoryEntry> {
    const results: string[] = [];
    for (const slot of slots) {
      if (!slot.resultId) continue;
      const entry = await this.store.read(slot.resultId);
      if (entry?.payload.kind === "result") {
        results.push(`(${slot.spec.role}) ${entry.payload.summary}`);
      }
    }

    const goalText = goalEntry.payload.kind === "goal" ? goalEntry.payload.description : "";
    const user = `Goal: ${goalText}\n\nResults:\n${results.join("\n\n")}`;
    const summary = await this.llm.complete(ASSEMBLE_SYSTEM_PROMPT, user);

    return this.store.write({
      namespace,
      author: this.agentId,
      parentId: goalEntry.id,
      payload: { kind: "result", summary, data: { artifact: true } },
    });
  }
}

function isSubtaskSpec(item: unknown): item is SubtaskSpec {
  if (typeof item !== "object" || item === null) return false;
  const { role, description } = item as { role?: unknown; description?: unknown };
  return (
    typeof role === "string" &&
    (ROLES as readonly string[]).includes(role) &&
    typeof description === "string" &&
    description.trim().length > 0
  );
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\n([\s\S]*?)\n```$/);
  return match ? match[1]! : trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
