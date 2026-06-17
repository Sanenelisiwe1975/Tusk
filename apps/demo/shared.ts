import type { MemoryEntry, MemoryStore, Namespace } from "../../packages/core/src/index";

/// The goal both the live (WalrusStore) and fallback (InMemoryStore) demo
/// runs hand to runGoal. Concrete and judge-legible: a Manager decomposes it,
/// a Researcher/Analyst/Writer each contribute a section, and the Manager
/// assembles the result into a short market brief.
export const GOAL =
  "Write a short market brief on the outlook for decentralized storage " +
  "networks (e.g. Walrus) in 2026: the key demand drivers, the top 2-3 " +
  "risks, and a one-paragraph recommendation for a small investor.";

/// Prints an entry's id, blobId, and hash as it is written -- the on-chain
/// anchor written by WalrusStore.write() (or the synthetic equivalent from
/// InMemoryStore) for that entry.
export function logEntry(entry: MemoryEntry): void {
  console.log(`  [${entry.kind}] ${entry.id}`);
  console.log(`      blobId: ${entry.blobId}`);
  console.log(`      hash:   ${entry.hash}`);
}

/// Recomputes and compares the content hash for every entry in `namespace`,
/// printing a per-entry ok/mismatch line. Returns true iff every entry
/// verified.
export async function verifyAll(store: MemoryStore, namespace: Namespace): Promise<boolean> {
  const entries = await store.list({ namespace });
  let allOk = true;

  for (const entry of entries) {
    const result = await store.verify(entry.id);
    if (!result.ok) allOk = false;
    console.log(`  [${result.ok ? "ok" : "MISMATCH"}] ${entry.id} (${entry.kind})`);
  }

  return allOk;
}
