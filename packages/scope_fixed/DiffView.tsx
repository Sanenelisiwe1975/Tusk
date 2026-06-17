import React from "react";
import { MemoryEntry } from "../core/schema";

export interface DiffViewProps {
  before: MemoryEntry;
  after: MemoryEntry;
}

/// Shows what changed between two versions of a memory entry.
export function DiffView({ before, after }: DiffViewProps) {
  return (
    <div>
      <pre>{before.contentHash}</pre>
      <pre>{after.contentHash}</pre>
    </div>
  );
}
