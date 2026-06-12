import { Specialist } from "../specialist";
import { MemoryStore } from "../../core/memory";
import { TaskQueue } from "../../core/tasks";
import { Subtask } from "../../core/schema";

export class Analyst extends Specialist {
  constructor(memory: MemoryStore, tasks: TaskQueue, agentId = "analyst") {
    super("analyst", memory, tasks, agentId);
  }

  async work(subtask: Subtask): Promise<string> {
    const entries = await this.memory.listTimeline(subtask.parentTaskId);
    const research = entries.find((entry) => entry.metadata?.role === "researcher");
    const notes = research ? await this.memory.readContent(research) : "(no research notes found)";

    return [
      "Analysis:",
      notes,
      "",
      "Synthesis: the research above is sufficient to proceed; the main risk is scope, and the main",
      "opportunity is that every step of this analysis is itself a verifiable memory entry.",
    ].join("\n");
  }
}
