import { Result, Subtask } from "../core/schema";
import { SubtaskSpec } from "../core/tasks";

export interface CompletedSubtask {
  subtask: Subtask;
  result: Result;
}

/// Decomposes a high-level task into role-tagged subtasks, validates
/// specialist results, and assembles the final output.
export class Manager {
  decompose(task: string): SubtaskSpec[] {
    return [
      { description: `Research background and key facts for: ${task}`, role: "researcher" },
      { description: `Analyze the research findings for: ${task}`, role: "analyst" },
      { description: `Write a final report for: ${task}`, role: "writer" },
    ];
  }

  validate(result: Result): boolean {
    return result.output.trim().length > 0;
  }

  assemble(items: CompletedSubtask[]): string {
    const writer = items.find((item) => item.subtask.role === "writer");
    if (writer) return writer.result.output;

    return items.map((item) => item.result.output).join("\n\n");
  }
}
