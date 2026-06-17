import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { InMemoryStore } from "../../packages/core/src/index";
import { makeLLM, runGoal } from "../../packages/agents/src/index";
import { GOAL, logEntry, verifyAll } from "./shared";

const here = path.dirname(fileURLToPath(import.meta.url));

// Only needed for ANTHROPIC_API_KEY (makeLLM falls back to FakeLLM without
// it). No Sui/Walrus config required -- this run never touches the network.
loadDotenv({ path: path.join(here, "../../packages/agents/.env") });
loadDotenv({ path: path.join(here, ".env") });

const namespace = "tusk-demo-fallback";

async function main(): Promise<void> {
  const store = new InMemoryStore();

  console.log("Running offline against InMemoryStore (no Sui/Walrus required).");
  console.log(`Namespace: ${namespace}`);
  console.log(`Goal: ${GOAL}`);
  console.log("\nEntries (id / blobId / hash) as they are written:\n");

  const unsubscribe = store.watch(namespace, logEntry);

  const artifact = await runGoal(store, makeLLM(), GOAL, { namespace });

  unsubscribe();

  console.log("\n=== Final artifact ===\n");
  if (artifact.payload.kind === "result") {
    console.log(artifact.payload.summary);
  }

  console.log("\nVerifying every entry against its recorded hash:\n");
  const allOk = await verifyAll(store, namespace);
  console.log(allOk ? "\nAll entries verified." : "\nSome entries FAILED verification.");

  process.exitCode = allOk ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
