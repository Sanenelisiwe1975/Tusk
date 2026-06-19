import type { MemoryEntry } from "@tusk/core";

export interface TimelineProps {
  entries: MemoryEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.id}>{entry.id}</li>
      ))}
    </ol>
  );
}
