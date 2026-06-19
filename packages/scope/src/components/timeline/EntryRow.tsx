import type { MemoryEntry } from "@tusk/core";
import { KindBadge } from "../KindBadge";
import { TruncatedId } from "../TruncatedId";
import { useVerifyCache } from "../../hooks/useVerify";

interface Props {
  entry: MemoryEntry;
  isNew: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function summarize(entry: MemoryEntry): string {
  const p = entry.payload;
  if (p.kind === "goal")   return p.title;
  if (p.kind === "result") return p.summary.split("\n")[0] ?? "";
  if (p.kind === "note")   return p.text.split("\n")[0] ?? "";
  return p.message;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function EntryRow({ entry, isNew, isSelected, onClick }: Props) {
  const cls = [
    "entry-row",
    isNew ? "entry-row--new" : "",
    isSelected ? "entry-row--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} onClick={onClick}>
      <div className="entry-top">
        <KindBadge kind={entry.kind} />
        <span className="entry-author">{entry.author}</span>
        <span className="entry-summary" title={summarize(entry)}>
          {summarize(entry)}
        </span>
        <span className="entry-time">{formatTime(entry.createdAt)}</span>
        <VerifyDot id={entry.id} />
      </div>
      <div className="entry-meta">
        <TruncatedId value={entry.id} chars={14} />
        <span className="entry-meta-sep">·</span>
        <TruncatedId value={entry.hash} chars={16} />
      </div>
    </div>
  );
}

function VerifyDot({ id }: { id: string }) {
  const { data } = useVerifyCache(id);
  if (!data) return null;
  return (
    <span
      className={`verify-dot verify-dot--${data.ok ? "ok" : "fail"}`}
      title={data.ok ? "Hash verified" : "Hash mismatch"}
    />
  );
}
