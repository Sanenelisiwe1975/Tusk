import type { AgentId, MemoryEntry, MemoryStore, Namespace, TaskRecord } from "@tusk/core";
import type { LLM } from "./llm";

export const ROLES = ["researcher", "analyst", "writer"] as const;
export type Role = (typeof ROLES)[number];

const TASK_DESCRIPTION_PATTERN = /^\[(\w+)\]\s*([\s\S]*?)\n\nGoal:\s*([\s\S]*)$/;

export interface ParsedTask {
  role: Role | null;
  instruction: string;
  goal: string;
}

/// Encodes a subtask's role and the original goal text into its
/// description, so any Specialist can recover both from `TaskRecord`
/// alone -- no fields beyond what MemoryStore already provides.
export function formatTaskDescription(role: Role, instruction: string, goal: string): string {
  return `[${role}] ${instruction}\n\nGoal: ${goal}`;
}

export function parseTaskDescription(description: string): ParsedTask {
  const match = description.match(TASK_DESCRIPTION_PATTERN);
  if (!match) return { role: null, instruction: description, goal: "" };

  const [, role, instruction, goal] = match;
  return {
    role: (ROLES as readonly string[]).includes(role!) ? (role as Role) : null,
    instruction: instruction!.trim(),
    goal: goal!.trim(),
  };
}

export interface SpecialistOptions {
  pollIntervalMs?: number;
  maxBackoffMs?: number;
}

/// Poll -> claim -> work -> write -> complete loop shared by every role.
/// roles.ts fixes `role` and `systemPrompt`; everything else -- finding
/// work, gathering context, and recording results -- lives here.
export class Specialist {
  private pollIntervalMs: number;
  private maxBackoffMs: number;

  constructor(
    protected store: MemoryStore,
    protected llm: LLM,
    protected role: Role,
    protected systemPrompt: string,
    protected agentId: AgentId = role,
    options: SpecialistOptions = {},
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 10;
    this.maxBackoffMs = options.maxBackoffMs ?? 200;
  }

  /// Runs until the goal's artifact entry exists and no pending task for
  /// this role remains, or `signal` is aborted.
  async run(namespace: Namespace, signal?: AbortSignal): Promise<void> {
    let backoff = this.pollIntervalMs;

    while (!signal?.aborted) {
      const task = await this.claimNext(namespace);
      if (task) {
        await this.execute(namespace, task);
        backoff = this.pollIntervalMs;
        continue;
      }

      if (await this.isDone(namespace)) return;

      await sleep(backoff, signal);
      backoff = Math.min(backoff * 2, this.maxBackoffMs);
    }
  }

  private async claimNext(namespace: Namespace): Promise<TaskRecord | null> {
    const pending = await this.store.listTasks({ namespace, status: "pending" });
    const mine = pending.find((task) => parseTaskDescription(task.description).role === this.role);
    return mine ? this.store.claimTask(mine.id, this.agentId) : null;
  }

  private async execute(namespace: Namespace, task: TaskRecord): Promise<void> {
    try {
      const { instruction, goal } = parseTaskDescription(task.description);
      const related = await this.store.search(namespace, goal, 5);
      const context = related
        .filter((entry) => entry.id !== task.parentId)
        .map(describeEntry)
        .join("\n");

      const user = [instruction, `Goal: ${goal}`, context && `Relevant prior entries:\n${context}`]
        .filter(Boolean)
        .join("\n\n");

      const summary = await this.llm.complete(this.systemPrompt, user);

      const result = await this.store.write({
        namespace,
        author: this.agentId,
        parentId: task.id,
        payload: { kind: "result", summary },
      });

      await this.store.completeTask(task.id, result.id);
    } catch (error) {
      await this.store.failTask(task.id, error instanceof Error ? error.message : String(error));
    }
  }

  private async isDone(namespace: Namespace): Promise<boolean> {
    const results = await this.store.list({ namespace, kind: "result" });
    return results.some((entry) => entry.payload.kind === "result" && entry.payload.data?.["artifact"] === true);
  }
}

function describeEntry(entry: MemoryEntry): string {
  switch (entry.payload.kind) {
    case "goal":
      return `goal: ${entry.payload.title} - ${entry.payload.description}`;
    case "result":
      return `result (${entry.author}): ${entry.payload.summary}`;
    case "note":
      return `note (${entry.author}): ${entry.payload.text}`;
    case "log":
      return `log (${entry.author}): ${entry.payload.message}`;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
