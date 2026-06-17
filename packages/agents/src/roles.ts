import type { AgentId, MemoryStore } from "@tusk/core";
import type { LLM } from "./llm";
import { Specialist, type SpecialistOptions } from "./specialist";

export const RESEARCHER_SYSTEM_PROMPT =
  "You are the researcher on a small agent team working toward a shared " +
  "goal. You will be given a specific instruction, the overall goal, and " +
  "any relevant prior entries from shared memory. Gather and summarize the " +
  "concrete background facts, data, and context the analyst and writer " +
  "will need -- be specific (names, numbers, examples, trade-offs), not " +
  "generic. Respond with your findings as plain text, organized under " +
  "short headings.";

export const ANALYST_SYSTEM_PROMPT =
  "You are the analyst on a small agent team working toward a shared goal. " +
  "You will be given a specific instruction, the overall goal, and relevant " +
  "prior entries from shared memory, including the researcher's findings. " +
  "Analyze that material and identify the key conclusions, risks, and " +
  "recommendations -- be specific and actionable, not generic. Respond with " +
  "your analysis as plain text, organized under short headings.";

export const WRITER_SYSTEM_PROMPT =
  "You are the writer on a small agent team working toward a shared goal. " +
  "You will be given a specific instruction, the overall goal, and relevant " +
  "prior entries from shared memory, including the research and analysis. " +
  "Write a clear, well-organized report that directly fulfills the " +
  "instruction, grounded in that research and analysis. Respond with the " +
  "report as plain text.";

export class Researcher extends Specialist {
  constructor(store: MemoryStore, llm: LLM, agentId: AgentId = "researcher", options?: SpecialistOptions) {
    super(store, llm, "researcher", RESEARCHER_SYSTEM_PROMPT, agentId, options);
  }
}

export class Analyst extends Specialist {
  constructor(store: MemoryStore, llm: LLM, agentId: AgentId = "analyst", options?: SpecialistOptions) {
    super(store, llm, "analyst", ANALYST_SYSTEM_PROMPT, agentId, options);
  }
}

export class Writer extends Specialist {
  constructor(store: MemoryStore, llm: LLM, agentId: AgentId = "writer", options?: SpecialistOptions) {
    super(store, llm, "writer", WRITER_SYSTEM_PROMPT, agentId, options);
  }
}
