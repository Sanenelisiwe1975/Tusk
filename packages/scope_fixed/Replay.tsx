import React from "react";
import { MemoryEntry } from "../core/schema";

export interface ReplayProps {
  entries: MemoryEntry[];
}

/// Steps through memory history entry by entry to replay how a task evolved.
export function Replay({ entries }: ReplayProps) {
  const [step, setStep] = React.useState(0);

  return (
    <div>
      <pre>{entries[step]?.id}</pre>
      <button onClick={() => setStep((s) => Math.max(0, s - 1))}>Prev</button>
      <button onClick={() => setStep((s) => Math.min(entries.length - 1, s + 1))}>Next</button>
    </div>
  );
}
