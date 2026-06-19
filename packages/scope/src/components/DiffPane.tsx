import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MemoryEntry } from "@tusk/core";
import { getStore } from "../store/source";
import { diffLines, type DiffOp } from "../lib/diff";
import { KindBadge } from "./KindBadge";
import { TruncatedId } from "./TruncatedId";

interface Props {
  namespace: string | null;
}

export function DiffPane({ namespace }: Props) {
  return (
    <div className="pane">
      <header className="pane-header">
        <span className="pane-title">Diff</span>
        {namespace && <code className="pane-ns-tag">{namespace}</code>}
      </header>

      <div className="pane-body diff-pane-body">
        {!namespace ? (
          <div className="pane-centered">
            <p className="pane-placeholder-label">Select a run from the sidebar</p>
          </div>
        ) : (
          <DiffContent namespace={namespace} />
        )}
      </div>
    </div>
  );
}

function summarize(entry: MemoryEntry): string {
  const p = entry.payload;
  if (p.kind === "goal") return p.title;
  if (p.kind === "result") return p.summary.split("\n")[0] ?? "";
  if (p.kind === "note") return p.text.split("\n")[0] ?? "";
  return p.message;
}

function entryLabel(e: MemoryEntry): string {
  const text = summarize(e);
  return `${e.kind} · ${e.author} · ${text.slice(0, 44)}${text.length > 44 ? "…" : ""}`;
}

function DiffContent({ namespace }: { namespace: string }) {
  const { data: entries = [], isLoading } = useQuery<MemoryEntry[]>({
    queryKey: ["timeline", namespace],
    queryFn: () => getStore().list({ namespace }),
    staleTime: 0,
  });

  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");

  const entryA = entries.find((e) => e.id === idA) ?? null;
  const entryB = entries.find((e) => e.id === idB) ?? null;

  const ops = useMemo(() => {
    if (!entryA || !entryB) return [];
    const linesA = JSON.stringify(entryA.payload, null, 2).split("\n");
    const linesB = JSON.stringify(entryB.payload, null, 2).split("\n");
    return diffLines(linesA, linesB);
  }, [entryA, entryB]);

  if (isLoading) {
    return (
      <div className="timeline-status">
        <span className="timeline-loading-dot" />
        Loading entries…
      </div>
    );
  }

  return (
    <div className="diff-pane">
      <div className="diff-pickers">
        <EntryPicker label="Entry A" entries={entries} value={idA} onChange={setIdA} />
        <span className="diff-vs">vs</span>
        <EntryPicker label="Entry B" entries={entries} value={idB} onChange={setIdB} />
      </div>

      {!entryA || !entryB ? (
        <div className="pane-centered diff-empty">
          <p className="pane-placeholder-label">Pick two entries to compare their payloads</p>
        </div>
      ) : (
        <>
          <div className="diff-headers">
            <DiffEntryHeader entry={entryA} />
            <DiffEntryHeader entry={entryB} />
          </div>
          <div className="diff-rows">
            {ops.length === 0 ? (
              <div className="diff-row-empty">Identical payloads</div>
            ) : (
              ops.map((op, i) => <DiffRow key={i} op={op} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EntryPicker({
  label,
  entries,
  value,
  onChange,
}: {
  label: string;
  entries: MemoryEntry[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="diff-picker">
      <span className="diff-picker-label">{label}</span>
      <select className="diff-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {entries.map((e) => (
          <option key={e.id} value={e.id}>
            {entryLabel(e)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DiffEntryHeader({ entry }: { entry: MemoryEntry }) {
  return (
    <div className="diff-entry-header">
      <KindBadge kind={entry.kind} />
      <span className="diff-entry-author">{entry.author}</span>
      <TruncatedId value={entry.id} chars={14} />
    </div>
  );
}

function DiffRow({ op }: { op: DiffOp }) {
  if (op.type === "same") {
    return (
      <div className="diff-row">
        <pre className="diff-cell">{op.a}</pre>
        <pre className="diff-cell">{op.b}</pre>
      </div>
    );
  }
  if (op.type === "removed") {
    return (
      <div className="diff-row">
        <pre className="diff-cell diff-cell--removed">{op.a}</pre>
        <pre className="diff-cell diff-cell--empty" />
      </div>
    );
  }
  return (
    <div className="diff-row">
      <pre className="diff-cell diff-cell--empty" />
      <pre className="diff-cell diff-cell--added">{op.b}</pre>
    </div>
  );
}
