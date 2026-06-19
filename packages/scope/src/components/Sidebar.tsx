import type { NamespaceSummary } from "../hooks/useNamespaces";

interface Props {
  namespaces: NamespaceSummary[];
  selectedNs: string | null;
  onSelect: (ns: string) => void;
}

export function Sidebar({ namespaces, selectedNs, onSelect }: Props) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-wordmark">MemoryScope</span>
      </div>

      <div className="sidebar-body">
        <div className="sidebar-section-label">Runs</div>
        <ul className="ns-list">
          {namespaces.map(({ namespace, count }) => (
            <li
              key={namespace}
              className={`ns-item${namespace === selectedNs ? " ns-item--selected" : ""}`}
              onClick={() => onSelect(namespace)}
            >
              <span className="ns-dot" />
              <span className="ns-name">{namespace}</span>
              <span className="ns-count">{count}</span>
            </li>
          ))}
          {namespaces.length === 0 && (
            <li className="ns-empty">No runs yet</li>
          )}
        </ul>
      </div>
    </nav>
  );
}
