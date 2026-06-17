import { createHash } from "node:crypto";
import type { Hash, Payload } from "./types";

/// Deterministically stringifies a value with object keys sorted, so the
/// same payload always hashes the same way regardless of key order.
export function canonicalJSON(value: unknown): string {
  return stringify(value);
}

function stringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stringify).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stringify(v)}`).join(",")}}`;
}

/// Content hash (sha256, hex-encoded) over the canonical JSON of a payload.
/// Both InMemoryStore and WalrusStore call this, so the same payload always
/// hashes the same way -- which is what lets WalrusStore's on-chain anchor be
/// verified against the value InMemoryStore would compute.
export function hashPayload(payload: Payload): Hash {
  return createHash("sha256").update(canonicalJSON(payload)).digest("hex");
}
