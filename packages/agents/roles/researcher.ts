import { Specialist } from "../specialist";
import { MemoryStore } from "../../core/memory";
import { TaskQueue } from "../../core/tasks";
import { Subtask } from "../../core/schema";

export class Researcher extends Specialist {
  constructor(memory: MemoryStore, tasks: TaskQueue, agentId = "researcher") {
    super("researcher", memory, tasks, agentId);
  }

  async work(subtask: Subtask): Promise<string> {
    const topic = subtask.description.replace(/^Research background and key facts for:\s*/, "");
    return [
      `Research notes on "${topic}":`,
      `- Overview of the core concepts behind ${topic}.`,
      `- Key terminology and prior work relevant to ${topic}.`,
      `- Open questions worth addressing in the analysis.`,
    ].join("\n");
  }
}
