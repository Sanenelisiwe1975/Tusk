import type { MemoryEntry } from "@tusk/core";
import { TruncatedId } from "../TruncatedId";
import { EntryLink } from "./EntryLink";

interface Props {
  entry: MemoryEntry;
  onNavigate: (id: string) => void;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  );
}

export function MetaBlock({ entry, onNavigate }: Props) {
  return (
    <div className="detail-section">
      <div className="detail-section-label">Metadata</div>
      <dl className="meta-grid">
        <dt className="meta-key">id</dt>
        <dd className="meta-val"><TruncatedId value={entry.id} chars={22} /></dd>

        <dt className="meta-key">author</dt>
        <dd className="meta-val meta-plain">{entry.author}</dd>

        <dt className="meta-key">created</dt>
        <dd className="meta-val meta-plain mono">{formatDateTime(entry.createdAt)}</dd>

        <dt className="meta-key">blobId</dt>
        <dd className="meta-val"><TruncatedId value={entry.blobId} chars={22} /></dd>

        <dt className="meta-key">hash</dt>
        <dd className="meta-val"><TruncatedId value={entry.hash} chars={22} /></dd>

        {entry.parentId && (
          <>
            <dt className="meta-key">parent</dt>
            <dd className="meta-val">
              <EntryLink id={entry.parentId} onClick={() => onNavigate(entry.parentId!)} />
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
