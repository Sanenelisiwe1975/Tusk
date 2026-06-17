import React from "react";
import { MemoryEntry } from "../core/schema";

export interface TimelineProps {
  entries: MemoryEntry[];
}

/// Renders the chronological sequence of memory writes for a namespace.
export function Timeline({ entries }: TimelineProps) {
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.id}>{entry.id}</li>
      ))}
    </ol>
  );
}
