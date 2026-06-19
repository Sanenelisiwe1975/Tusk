import { useEntry } from "../hooks/useEntry";
import { KindBadge } from "./KindBadge";
import { VerifyBadge } from "./detail/VerifyBadge";
import { PayloadView } from "./detail/PayloadView";
import { MetaBlock } from "./detail/MetaBlock";
import { ChildrenList } from "./detail/ChildrenList";

interface Props {
  namespace: string | null;
  entryId: string | null;
  onNavigate: (id: string) => void;
}

export function DetailPane({ namespace, entryId, onNavigate }: Props) {
  return (
    <div className="pane">
      <header className="pane-header">
        <span className="pane-title">Entry</span>
      </header>
      <div className="detail-body">
        {!entryId || !namespace ? (
          <div className="pane-centered">
            <p className="pane-placeholder-label">Select an entry from the timeline</p>
          </div>
        ) : (
          <DetailContent
            namespace={namespace}
            entryId={entryId}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function DetailContent({
  namespace,
  entryId,
  onNavigate,
}: {
  namespace: string;
  entryId: string;
  onNavigate: (id: string) => void;
}) {
  const { data: entry, isLoading } = useEntry(entryId);

  if (isLoading) {
    return <div className="detail-loading"><span className="timeline-loading-dot" /> Loading…</div>;
  }

  if (!entry) {
    return (
      <div className="pane-centered">
        <p className="pane-placeholder-label">Entry not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="detail-entry-header">
        <KindBadge kind={entry.kind} />
        <span className="detail-author">{entry.author}</span>
        <span className="detail-time">{formatTime(entry.createdAt)}</span>
      </div>

      <VerifyBadge id={entry.id} />

      <PayloadView entry={entry} namespace={namespace} />
      <MetaBlock entry={entry} onNavigate={onNavigate} />
      <ChildrenList namespace={namespace} parentId={entry.id} onNavigate={onNavigate} />
    </>
  );
}
