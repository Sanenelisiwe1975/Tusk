import { useReplay } from "../hooks/useReplay";

export function MemoryReplay() {
  const replay = useReplay();

  return (
    <div>
      <h1>Replay</h1>

      <input
        type="range"
        min={0}
        max={Date.now()}
        value={replay.timestamp}
        onChange={(e) => replay.setTimestamp(Number(e.target.value))}
      />

      {replay.visibleEntries.map((entry) => (
        <div key={entry.id}>{entry.id}</div>
      ))}
    </div>
  );
}