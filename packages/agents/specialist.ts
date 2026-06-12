import { MemoryStore } from "../core/memory";
import { TaskQueue } from "../core/tasks";
import { Result, Subtask } from "../core/schema";

/// Base poll -> work -> write loop shared by all specialist roles.
export abstract class Specialist {
  constructor(
    protected role: string,
    protected memory: MemoryStore,
    protected tasks: TaskQueue,
    protected agentId: string = role,
  ) {}

  abstract work(subtask: Subtask): Promise<string>;

  /// Claims the next pending subtask for this role, does the work, and
  /// writes the output back to memory. Returns null if there was nothing
  /// to claim.
  async run(): Promise<Result | null> {
    const subtask = await this.tasks.claimNext(this.role, this.agentId);
    if (!subtask) return null;

    const output = await this.work(subtask);
    const entry = await this.memory.writeMemory(subtask.parentTaskId, output, {
      kind: "result",
      role: this.role,
      subtaskId: subtask.id,
    });
    await this.tasks.complete(subtask.id, entry.id);

    return {
      subtaskId: subtask.id,
      output,
      blobId: entry.blobId,
      contentHash: entry.contentHash,
      completedAt: entry.createdAt,
    };
  }
}
