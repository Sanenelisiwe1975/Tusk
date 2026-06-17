import { randomUUID } from "node:crypto";
import { config as loadDotenv } from "dotenv";
import { describe, it } from "vitest";
import { loadConfig } from "../config";
import { WalrusStore } from "../walrus";
import { memoryStoreContractTests } from "./contract";

loadDotenv();

const enabled = process.env.RUN_WALRUS_INTEGRATION === "1";

// Runs the shared MemoryStore contract suite against a real Walrus +
// testnet-Sui backed WalrusStore. Skipped unless RUN_WALRUS_INTEGRATION=1
// and the SUI_*/WALRUS_* variables in .env are set -- see .env.example.
// Each test gets its own random namespacePrefix so repeated runs against the
// same shared registry don't see each other's entries.
describe.runIf(enabled)("WalrusStore (testnet integration)", () => {
  memoryStoreContractTests(() => new WalrusStore({ ...loadConfig(), namespacePrefix: randomUUID() }));
});

describe.skipIf(enabled)("WalrusStore (testnet integration)", () => {
  it("skipped -- set RUN_WALRUS_INTEGRATION=1 with packages/core/.env configured to run", () => {});
});
