import { useParams } from "react-router-dom";
import { useEntries } from "../hooks/useEntries";

export function EntryDetails() {
  const { id } = useParams();

  const { data = [] } = useEntries();

  const entry = data.find((e) => e.id === id);

  if (!entry) {
    return <div>Entry not found</div>;
  }

  return (
    <div>
      <h1>{entry.id}</h1>

      <pre>
        {JSON.stringify(entry.payload, null, 2)}
      </pre>

      <p>Author: {entry.author}</p>
      <p>Hash: {entry.hash}</p>
      <p>Blob: {entry.blobId}</p>
    </div>
  );
}