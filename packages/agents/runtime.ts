import { Manager, CompletedSubtask } from "./manager";
import { Specialist } from "./specialist";
import { MemoryStore } from "../core/memory";
import { TaskQueue } from "../core/tasks";
import { Result } from "../core/schema";

/// Coordinates the manager and a pool of specialists until every subtask
/// for a task namespace is resolved, then assembles the final result.
export class Runtime {
  constructor(
    private memory: MemoryStore,
    private tasks: TaskQueue,
    private manager: Manager,
    private specialists: Specialist[],
  ) {}

  async run(task: string): Promise<string> {
    const namespace = `task-${Date.now()}`;
    await this.memory.writeMemory(namespace, task, { kind: "task" });

    const subtasks = await this.tasks.createSubtasks(namespace, this.manager.decompose(task));

    const maxRounds = subtasks.length * this.specialists.length + 1;
    for (let round = 0; round < maxRounds; round++) {
      const current = await this.tasks.list(namespace);
      if (current.every((subtask) => subtask.status !== "pending" && subtask.status !== "claimed")) break;

      for (const specialist of this.specialists) {
        await specialist.run();
      }
    }

    const completed = await this.tasks.list(namespace);
    const items: CompletedSubtask[] = [];
    for (const subtask of completed) {
      if (subtask.status !== "completed" || !subtask.resultEntryId) continue;

      const entry = await this.memory.readMemory(subtask.resultEntryId);
      if (!entry) continue;

      const result: Result = {
        subtaskId: subtask.id,
        output: await this.memory.readContent(entry),
        blobId: entry.blobId,
        contentHash: entry.contentHash,
        completedAt: entry.createdAt,
      };
      if (this.manager.validate(result)) {
        items.push({ subtask, result });
      }
    }

    const final = this.manager.assemble(items);
    await this.memory.writeMemory(namespace, final, { kind: "final" });
    return final;
  }
}
