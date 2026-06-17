import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { loadConfig, WalrusStore, type WalrusStoreConfig } from "../../packages/core/src/index";
import { makeLLM, runGoal } from "../../packages/agents/src/index";
import { GOAL, logEntry, verifyAll } from "./shared";

const here = path.dirname(fileURLToPath(import.meta.url));

// Sui/Walrus config lives in packages/core/.env, the Anthropic key (if any)
// in packages/agents/.env, and apps/demo/.env is for anything demo-specific.
// dotenv.config() never overwrites a variable that's already set, so loading
// all three is safe regardless of which ones exist.
loadDotenv({ path: path.join(here, "../../packages/core/.env") });
loadDotenv({ path: path.join(here, "../../packages/agents/.env") });
loadDotenv({ path: path.join(here, ".env") });

// WalrusStore.list()/listTasks() repaginate the full on-chain EntryAnchored
// event history on every call, so the Hive's default ~10ms poll loops would
// hammer testnet RPC. These intervals keep the live run to a sane number of
// calls at the cost of a slower demo.
const POLL_INTERVAL_MS = 5_000;
const MAX_BACKOFF_MS = 15_000;
const STALE_CLAIM_MS = 3 * 60_000;

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new WalrusStore(config);
  const namespace = `tusk-demo-${randomUUID().slice(0, 8)}`;

  await publishConfig(config, namespace);

  console.log(`Namespace: ${namespace}`);
  console.log(`Goal: ${GOAL}`);
  console.log("\nEntries (id / blobId / hash) as they are written:\n");

  const unsubscribe = store.watch(namespace, logEntry);

  const artifact = await runGoal(store, makeLLM(), GOAL, {
    namespace,
    manager: { pollIntervalMs: POLL_INTERVAL_MS, staleClaimMs: STALE_CLAIM_MS },
    specialist: { pollIntervalMs: POLL_INTERVAL_MS, maxBackoffMs: MAX_BACKOFF_MS },
  });

  unsubscribe();

  console.log("\n=== Final artifact ===\n");
  if (artifact.payload.kind === "result") {
    console.log(artifact.payload.summary);
  }

  console.log("\nVerifying every entry against its on-chain anchor:\n");
  const allOk = await verifyAll(store, namespace);
  console.log(allOk ? "\nAll entries verified against Sui." : "\nSome entries FAILED verification.");

  process.exitCode = allOk ? 0 : 1;
}

/// Writes the read-only fields a UI needs to point at this run: where the
/// registry/Walrus endpoints are, and which namespace to query. Never
/// includes the signer/private key.
async function publishConfig(config: WalrusStoreConfig, namespace: string): Promise<void> {
  const out = {
    network: config.network,
    rpcUrl: config.rpcUrl,
    packageId: config.packageId,
    registryId: config.registryId,
    publisherUrl: config.publisherUrl,
    aggregatorUrl: config.aggregatorUrl,
    namespace,
    updatedAt: new Date().toISOString(),
  };

  const configPath = path.join(here, "config.json");
  await writeFile(configPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Published config -> ${configPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
