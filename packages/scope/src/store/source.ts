import { InMemoryStore, WalrusStore, seed } from "@tusk/core";
import type { MemoryStore, SuiNetwork, WalrusStoreConfig } from "@tusk/core";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Initialised by initStore(), which main.tsx awaits before rendering.
// Nothing else may import InMemoryStore / WalrusStore directly — use getStore().
let _store: MemoryStore | null = null;

export async function initStore(): Promise<void> {
  const backend = (import.meta.env["VITE_TUSK_BACKEND"] as string | undefined) ?? "memory";

  if (backend === "walrus") {
    try {
      const ws = buildWalrusStore();
      // Probe the network before committing. Any namespace is fine — an empty
      // result means "reachable but no entries", which is still a success.
      const probeNs = viteEnv("VITE_TUSK_DEMO_NAMESPACE") ?? "demo";
      await Promise.race([
        ws.list({ namespace: probeNs }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Walrus probe timed out after 5 s")), 5000)
        ),
      ]);
      _store = ws;
      return;
    } catch (err) {
      console.warn(
        "[MemoryScope] Walrus backend unavailable — falling back to InMemoryStore:",
        err
      );
    }
  }

  // Default (or fallback): in-process InMemoryStore seeded with demo data.
  const mem = new InMemoryStore();
  await seed(mem, "demo");
  _store = mem;
}

/// The single path to store data throughout the app.
/// No component or hook may import InMemoryStore or WalrusStore directly.
export function getStore(): MemoryStore {
  if (!_store) throw new Error("getStore() called before initStore() completed");
  return _store;
}

// ── Walrus backend ────────────────────────────────────────────────────────────

function buildWalrusStore(): WalrusStore {
  const network = (viteEnv("VITE_SUI_NETWORK") ?? "testnet") as SuiNetwork;

  const config: WalrusStoreConfig = {
    network,
    rpcUrl: getFullnodeUrl(network),
    packageId: requireViteEnv("VITE_SUI_PACKAGE_ID"),
    registryId: requireViteEnv("VITE_SUI_REGISTRY_ID"),

    // MemoryScope is strictly read-only — it calls list / read / listTasks /
    // verify / watch, never write / createTask / claimTask / completeTask /
    // failTask. Those write paths call execute() → signAndExecuteTransaction()
    // which needs a funded signer. The throwaway keypair below satisfies the
    // TypeScript interface for the read-only paths:
    //   • devInspectTransactionBlock (get_anchor) — just needs any valid Sui
    //     address as the simulation sender; no funds required.
    //   • queryEvents / getBlob — no signer at all.
    // If a write path were accidentally called, the transaction would fail on
    // Sui (no gas) rather than silently corrupting on-chain state.
    signer: new Ed25519Keypair(),

    // publisherUrl is used only by write(). Supplying the testnet default so
    // the type is satisfied; it will never be fetched from MemoryScope.
    publisherUrl: "https://publisher.walrus-testnet.walrus.space",

    aggregatorUrl:
      viteEnv("VITE_WALRUS_AGGREGATOR_URL") ??
      "https://aggregator.walrus-testnet.walrus.space",
  };

  return new WalrusStore(config);
}

function viteEnv(key: string): string | undefined {
  return import.meta.env[key] as string | undefined;
}

function requireViteEnv(key: string): string {
  const value = viteEnv(key);
  if (!value) {
    throw new Error(
      `MemoryScope: missing required Vite env var "${key}".\n` +
        "Copy packages/scope/.env.example to packages/scope/.env and fill in the contract addresses."
    );
  }
  return value;
}
