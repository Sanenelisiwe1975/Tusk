import { randomUUID } from "node:crypto";
import { InMemoryStore } from "@tusk/core";
import { config as loadDotenv } from "dotenv";
import { describe, expect, it } from "vitest";
import { makeLLM } from "../llm";
import { runGoal } from "../runtime";

loadDotenv();

const enabled = Boolean(process.env["ANTHROPIC_API_KEY"]);

// Runs the Hive loop against the real AnthropicLLM. Skipped unless
// ANTHROPIC_API_KEY is set -- see .env.example. The FakeLLM-backed suite in
// hive.test.ts always runs and never needs a key.
describe.runIf(enabled)("Hive runtime (InMemoryStore + AnthropicLLM)", () => {
  it(
    "produces a coherent final artifact for a real goal",
    async () => {
      const store = new InMemoryStore();
      const namespace = randomUUID();

      const artifact = await runGoal(store, makeLLM(), "Plan a weekend trip to Cape Town for two people who like hiking and good food.", {
        namespace,
      });

      expect(artifact.payload.kind).toBe("result");
      if (artifact.payload.kind !== "result") throw new Error("unreachable");

      expect(artifact.payload.summary.length).toBeGreaterThan(100);

      const tasks = await store.listTasks({ namespace });
      for (const task of tasks) {
        expect(task.status).toBe("done");
      }

      console.log("\n=== Final artifact ===\n" + artifact.payload.summary + "\n");
    },
    60_000,
  );
});

describe.skipIf(enabled)("Hive runtime (InMemoryStore + AnthropicLLM)", () => {
  it("skipped -- set ANTHROPIC_API_KEY in packages/agents/.env to run", () => {});
});
