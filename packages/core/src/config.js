import { getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
const DEFAULT_WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space";
const DEFAULT_WALRUS_AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space";
/// Reads WalrusStore configuration from environment variables. See
/// packages/core/.env.example for the full list of variables and where the
/// deployed contract ids come from.
export function loadConfig(env = process.env) {
    const network = (env.SUI_NETWORK ?? "testnet");
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
function requireEnv(env, key) {
    const value = env[key];
    if (!value) {
        throw new Error(`Missing required environment variable ${key}. See packages/core/.env.example.`);
    }
    return value;
}
