import { getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";

/// Everything WalrusStore needs to talk to a deployed registry/task package
/// on Sui and to a Walrus publisher/aggregator pair.
export interface WalrusStoreConfig {
  network: SuiNetwork;
  rpcUrl: string;
  packageId: string;
  registryId: string;
  publisherUrl: string;
  aggregatorUrl: string;
  signer: Ed25519Keypair;
  /// Prefixes every on-chain namespace with `${namespacePrefix}::`, so
  /// multiple WalrusStore instances can share one registry without their
  /// entries colliding. Off-chain (MemoryEntry/TaskRecord) namespaces are
  /// unaffected. Defaults to no prefix.
  namespacePrefix?: string;
}

const DEFAULT_WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space";
const DEFAULT_WALRUS_AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space";

/// Reads WalrusStore configuration from environment variables. See
/// packages/core/.env.example for the full list of variables and where the
/// deployed contract ids come from.
export function loadConfig(env: Record<string, string | undefined> = process.env): WalrusStoreConfig {
  const network = (env.SUI_NETWORK ?? "testnet") as SuiNetwork;

  return {
    network,
    rpcUrl: getFullnodeUrl(network),
    packageId: requireEnv(env, "SUI_PACKAGE_ID"),
    registryId: requireEnv(env, "SUI_REGISTRY_ID"),
    publisherUrl: env.WALRUS_PUBLISHER_URL ?? DEFAULT_WALRUS_PUBLISHER_URL,
    aggregatorUrl: env.WALRUS_AGGREGATOR_URL ?? DEFAULT_WALRUS_AGGREGATOR_URL,
    signer: Ed25519Keypair.fromSecretKey(requireEnv(env, "SUI_PRIVATE_KEY")),
  };
}

function requireEnv(env: Record<string, string | undefined>, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}. See packages/core/.env.example.`);
  }
  return value;
}
