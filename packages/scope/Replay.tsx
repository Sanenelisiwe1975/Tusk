import { useState } from "react";
import type { MemoryEntry } from "@tusk/core";

export interface ReplayProps {
  entries: MemoryEntry[];
}

export function Replay({ entries }: ReplayProps) {
  const [step, setStep] = useState(0);

  return (
    <div>
      <pre>{entries[step]?.id}</pre>
      <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))}>Prev</button>
      <button type="button" onClick={() => setStep((s) => Math.min(entries.length - 1, s + 1))}>Next</button>
    </div>
  );
}
