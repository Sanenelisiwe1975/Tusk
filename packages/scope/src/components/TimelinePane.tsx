import { useEffect, useRef, useState } from "react";
import { useTimeline } from "../hooks/useTimeline";
import { useVerifyAll } from "../hooks/useVerify";
import { EntryRow } from "./timeline/EntryRow";
import { SimulateButton } from "./timeline/SimulateButton";

interface Props {
  namespace: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  presentMode?: boolean;
}

export function TimelinePane({ namespace, selectedId, onSelect, presentMode }: Props) {
  if (!namespace) {
    return (
      <div className="pane-empty">
        <p>Select a run from the sidebar</p>
      </div>
    );
  }

  return (
    <TimelineContent
      namespace={namespace}
      selectedId={selectedId}
      onSelect={onSelect}
      presentMode={presentMode}
    />
  );
}

function TimelineContent({
  namespace,
  selectedId,
  onSelect,
  presentMode,
}: {
  namespace: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  presentMode?: boolean;
}) {
  const { entries, highlightedIds, isLoading, liveCount } = useTimeline(namespace);
  const [verifying, setVerifying] = useState(false);
  const verifyAll = useVerifyAll();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveCount > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveCount]);

  async function handleVerifyAll() {
    setVerifying(true);
    await verifyAll(entries.map((e) => e.id));
    setVerifying(false);
  }

  return (
    <div className="pane">
      <header className="pane-header">
        <span className="pane-title">Timeline</span>
        <code className="pane-ns-tag">{namespace}</code>
        <span className="pane-header-spacer" />
        <button
          type="button"
          className="verify-all-btn"
          onClick={handleVerifyAll}
          disabled={verifying || entries.length === 0}
          title="Recompute and verify all visible entry hashes"
        >
          {verifying ? (
            <>
              <span className="verify-all-spinner" />
              verifying…
            </>
          ) : (
            "verify all"
          )}
        </button>
        {!presentMode && <SimulateButton namespace={namespace} />}
      </header>

      <div className="timeline-scroll">
        {isLoading && (
          <div className="timeline-status">
            <span className="timeline-loading-dot" />
            Loading entries…
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="timeline-status">
            No entries yet — agent writes will appear here live.
          </div>
        )}

        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            isNew={highlightedIds.has(entry.id)}
            isSelected={entry.id === selectedId}
            onClick={() => onSelect(entry.id)}
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
