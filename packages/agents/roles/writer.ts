import { Specialist } from "../specialist";
import { MemoryStore } from "../../core/memory";
import { TaskQueue } from "../../core/tasks";
import { Subtask } from "../../core/schema";

export class Writer extends Specialist {
  constructor(memory: MemoryStore, tasks: TaskQueue, agentId = "writer") {
    super("writer", memory, tasks, agentId);
  }

  async work(subtask: Subtask): Promise<string> {
    const entries = await this.memory.listTimeline(subtask.parentTaskId);
    const taskEntry = entries.find((entry) => entry.metadata?.kind === "task");
    const research = entries.find((entry) => entry.metadata?.role === "researcher");
    const analysis = entries.find((entry) => entry.metadata?.role === "analyst");

    const topic = taskEntry ? await this.memory.readContent(taskEntry) : subtask.description;
    const researchNotes = research ? await this.memory.readContent(research) : "(no research notes)";
    const analysisNotes = analysis ? await this.memory.readContent(analysis) : "(no analysis)";

    return [
      `# Report: ${topic}`,
      "",
      "## Research",
      researchNotes,
      "",
      "## Analysis",
      analysisNotes,
      "",
      "## Conclusion",
      `Based on the research and analysis above, "${topic}" is ready to move forward.`,
    ].join("\n");
  }
}
