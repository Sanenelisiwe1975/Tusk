import { useState } from "react";
import { getStore } from "../../store/source";

const SAMPLE_NOTES = [
  "Verified source citations against primary documentation",
  "Cross-referenced claim with upstream dataset — consistent",
  "Flagged potential inconsistency in argument structure",
  "Retrieved relevant prior art from indexed sources",
  "Confirmed task scope aligns with original objective",
  "Intermediate reasoning step recorded for audit trail",
  "Added supporting context to active memory buffer",
  "Resolved ambiguity in sub-task decomposition",
];

interface Props {
  namespace: string;
}

export function SimulateButton({ namespace }: Props) {
  // Only visible on the memory backend — hide in presentation mode.
  if (import.meta.env["VITE_TUSK_BACKEND"] === "walrus") return null;

  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    const text = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)] ?? SAMPLE_NOTES[0]!;
    await getStore().write({ namespace, author: "dev-sim", payload: { kind: "note", text } });
    setBusy(false);
  }

  return (
    <button
      type="button"
      className="sim-btn"
      onClick={handleClick}
      disabled={busy}
      title="Write a random note entry (dev only)"
    >
      {busy ? "writing…" : "+ Simulate write"}
    </button>
  );
}
