import { useEntries } from "../hooks/useEntries";

export function MemoryTimeline() {
  const { data = [] } = useEntries();

  return (
    <div>
      <h1>Timeline</h1>

      {data.map((entry) => (
        <div key={entry.id}>
          <strong>{entry.author}</strong>
          <p>{entry.kind}</p>
          <small>{entry.createdAt}</small>
        </div>
      ))}
    </div>
  );
}