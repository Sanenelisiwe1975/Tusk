import Anthropic from "@anthropic-ai/sdk";

/// The only way agents talk to a model. Swapping this for a real provider
/// (Anthropic, etc.) requires no changes to manager.ts, specialist.ts, or
/// roles.ts -- they only ever call `complete`.
export interface LLM {
  complete(system: string, user: string): Promise<string>;
}

const ROLES = ["researcher", "analyst", "writer"] as const;

/// Deterministic stand-in for a real model, so the Hive loop is testable
/// with no network. It recognizes the same conventions a real model would
/// follow given our prompts:
///  - a system prompt asking for a "JSON array" (Manager's decomposition)
///    gets a canned 3-subtask plan covering researcher/analyst/writer;
///  - a system prompt mentioning "final artifact" (Manager's assembly) gets
///    the user content echoed back under a "Final artifact" heading;
///  - a system prompt starting "You are the <role> ..." (a Specialist) gets
///    a canned per-role response that includes the user content verbatim,
///    so tests can trace how context flows between agents.
export class FakeLLM implements LLM {
  async complete(system: string, user: string): Promise<string> {
    if (/json array/i.test(system)) {
      return JSON.stringify([
        { role: "researcher", description: `Research background and key facts for: ${user}` },
        { role: "analyst", description: `Analyze the research findings for: ${user}` },
        { role: "writer", description: `Write a final report for: ${user}` },
      ]);
    }

    if (/final artifact/i.test(system)) {
      return `Final artifact:\n${user}`;
    }

    const role = ROLES.find((candidate) => new RegExp(`^you are the ${candidate}\\b`, "i").test(system));
    return `[${role ?? "agent"}] ${user}`;
  }
}

const DEFAULT_MODEL = "claude-opus-4-8";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;

export interface AnthropicLLMOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

/// Real LLM backed by the Anthropic Messages API. One request per `complete`
/// call: the system/user prompts go straight through, and the first text
/// block of the response is returned. Retries and timeouts are handled by
/// the SDK client (`maxRetries` covers 429/5xx with backoff).
export class AnthropicLLM implements LLM {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(options: AnthropicLLMOptions = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env["ANTHROPIC_API_KEY"],
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    });
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async complete(system: string, user: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    const block = response.content.find((candidate) => candidate.type === "text");
    if (!block) throw new Error("AnthropicLLM: response contained no text content");
    return block.text;
  }
}

/// Returns a real `AnthropicLLM` when ANTHROPIC_API_KEY is set, otherwise a
/// `FakeLLM` so callers (and tests) work offline with no network.
export function makeLLM(): LLM {
  return process.env["ANTHROPIC_API_KEY"] ? new AnthropicLLM() : new FakeLLM();
}
