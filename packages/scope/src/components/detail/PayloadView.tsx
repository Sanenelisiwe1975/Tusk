import type { MemoryEntry, Payload } from "@tusk/core";
import { useTaskForResult } from "../../hooks/useEntry";

interface Props {
  entry: MemoryEntry;
  namespace: string;
}

export function PayloadView({ entry, namespace }: Props) {
  const p = entry.payload;
  if (p.kind === "goal")   return <GoalView payload={p} />;
  if (p.kind === "result") return <ResultView payload={p} namespace={namespace} entryId={entry.id} />;
  if (p.kind === "note")   return <NoteView payload={p} />;
  return <LogView payload={p} />;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail-section">
      <div className="detail-section-label">{label}</div>
      {children}
    </div>
  );
}

function GoalView({ payload }: { payload: Extract<Payload, { kind: "goal" }> }) {
  return (
    <Section label="Objective">
      <p className="detail-field-title">{payload.title}</p>
      <p className="detail-text">{payload.description}</p>
    </Section>
  );
}

function ResultView({
  payload,
  namespace,
  entryId,
}: {
  payload: Extract<Payload, { kind: "result" }>;
  namespace: string;
  entryId: string;
}) {
  const { data: task } = useTaskForResult(namespace, entryId);

  return (
    <>
      <Section label="Output">
        <p className="detail-text">{payload.summary}</p>
      </Section>

      {payload.data && Object.keys(payload.data).length > 0 && (
        <Section label="Data">
          <pre className="detail-code">{JSON.stringify(payload.data, null, 2)}</pre>
        </Section>
      )}

      {task && (
        <Section label="Fulfilled task">
          <p className="detail-text">{task.description}</p>
          <span className={`task-status task-status--${task.status}`}>{task.status}</span>
        </Section>
      )}
    </>
  );
}

function NoteView({ payload }: { payload: Extract<Payload, { kind: "note" }> }) {
  return (
    <Section label="Note">
      <p className="detail-text">{payload.text}</p>
    </Section>
  );
}

function LogView({ payload }: { payload: Extract<Payload, { kind: "log" }> }) {
  return (
    <Section label="Log">
      {payload.level && (
        <span className={`log-level log-level--${payload.level}`}>{payload.level}</span>
      )}
      <p className="detail-text">{payload.message}</p>
    </Section>
  );
}
