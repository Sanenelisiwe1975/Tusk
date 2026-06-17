import { useEntries } from "../hooks/useEntries";

export function Agents() {
  const { data = [] } = useEntries();

  const grouped = Object.groupBy(data, (e) => e.author);

  return (
    <div>
      <h1>Agents</h1>

      {Object.entries(grouped).map(([agent, entries]) => (
        <div key={agent}>
          <h3>{agent}</h3>
          <p>{entries?.length ?? 0} memories</p>
        </div>
      ))}
    </div>
  );
}