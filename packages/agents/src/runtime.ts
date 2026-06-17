import { randomUUID } from "node:crypto";
import type { MemoryEntry, MemoryStore, Namespace } from "@tusk/core";
import type { LLM } from "./llm";
import { Manager, type ManagerOptions } from "./manager";
import { Analyst, Researcher, Writer } from "./roles";
import type { SpecialistOptions } from "./specialist";

export interface RunGoalOptions {
  namespace?: Namespace;
  manager?: ManagerOptions;
  specialist?: SpecialistOptions;
}

/// Starts a Manager and one Researcher/Analyst/Writer Specialist, all
/// coordinating only through `store`, and runs until the goal's artifact
/// entry is written. Returns that entry.
export async function runGoal(store: MemoryStore, llm: LLM, goal: string, options: RunGoalOptions = {}): Promise<MemoryEntry> {
  const namespace = options.namespace ?? `goal-${randomUUID()}`;

  const specialists = [
    new Researcher(store, llm, "researcher", options.specialist),
    new Analyst(store, llm, "analyst", options.specialist),
    new Writer(store, llm, "writer", options.specialist),
  ];

  const controllers = specialists.map(() => new AbortController());
  const loops = specialists.map((specialist, index) => specialist.run(namespace, controllers[index]!.signal));

  const manager = new Manager(store, llm, options.manager);
  const artifact = await manager.run(namespace, goal);

  for (const controller of controllers) controller.abort();
  await Promise.all(loops);

  return artifact;
}
