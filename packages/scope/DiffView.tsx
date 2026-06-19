import type { MemoryEntry } from "@tusk/core";

export interface DiffViewProps {
  before: MemoryEntry;
  after: MemoryEntry;
}

export function DiffView({ before, after }: DiffViewProps) {
  return (
    <div>
      <pre>{before.hash}</pre>
      <pre>{after.hash}</pre>
    </div>
  );
}
