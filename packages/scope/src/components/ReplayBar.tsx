import { useReplayRange } from "../hooks/useReplayRange";

interface Props {
  namespace: string | null;
  checkpoint: number | null;
  onChange: (value: number | null) => void;
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function ReplayBar({ namespace, checkpoint, onChange }: Props) {
  const range = useReplayRange(namespace);
  if (!range || range.min === range.max) return null;

  const value = checkpoint ?? range.max;
  const isLive = checkpoint === null;
  const visibleCount = range.entries.filter((e) => e.createdAt <= value).length;

  return (
    <div className="replay-bar">
      <span className={`replay-status${isLive ? " replay-status--live" : ""}`}>
        {isLive ? "● live" : "rewound"}
      </span>

      <input
        type="range"
        className="replay-slider"
        min={range.min}
        max={range.max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Replay checkpoint"
      />

      <span className="replay-count">
        {visibleCount} / {range.entries.length} entries
      </span>
      <span className="replay-clock">{formatClock(value)}</span>

      <button
        type="button"
        className="replay-live-btn"
        onClick={() => onChange(null)}
        disabled={isLive}
        title="Return to the live edge of the run"
      >
        Jump to live
      </button>
    </div>
  );
}
