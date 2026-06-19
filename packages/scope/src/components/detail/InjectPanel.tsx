import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStore } from "../../store/source";

interface Props {
  namespace: string;
  parentId: string;
}

export function InjectPanel({ namespace, parentId }: Props) {
  // Write paths need a signer the read-only Walrus path doesn't carry, and a
  // live injection form has no place in a judged demo — memory + non-present only.
  const backend = import.meta.env["VITE_TUSK_BACKEND"] as string | undefined;
  const present = (import.meta.env["VITE_TUSK_PRESENT"] as string | undefined) === "1";
  if (backend === "walrus" || present) return null;

  return <InjectForm namespace={namespace} parentId={parentId} />;
}

function InjectForm({ namespace, parentId }: Props) {
  const queryClient = useQueryClient();
  const [author, setAuthor] = useState("human-debugger");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [justWrote, setJustWrote] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;

    setBusy(true);
    await getStore().write({
      namespace,
      author: author.trim() || "human-debugger",
      payload: { kind: "note", text: text.trim() },
      parentId,
    });
    await queryClient.invalidateQueries({ queryKey: ["children", namespace, parentId] });

    setText("");
    setBusy(false);
    setJustWrote(true);
    setTimeout(() => setJustWrote(false), 2000);
  }

  return (
    <div className="detail-section inject-panel">
      <div className="detail-section-label">Inject correction</div>
      <form className="inject-form" onSubmit={handleSubmit}>
        <input
          className="inject-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="author"
          maxLength={40}
        />
        <textarea
          className="inject-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a corrected note for this entry…"
          rows={3}
        />
        <button type="submit" className="inject-submit" disabled={busy || !text.trim()}>
          {busy ? "writing…" : justWrote ? "✓ written" : "Write note"}
        </button>
      </form>
    </div>
  );
}
