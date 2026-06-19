import { useChildren } from "../../hooks/useEntry";
import { KindBadge } from "../KindBadge";
import { EntryLink } from "./EntryLink";

interface Props {
  namespace: string;
  parentId: string;
  onNavigate: (id: string) => void;
}

export function ChildrenList({ namespace, parentId, onNavigate }: Props) {
  const { data: children = [] } = useChildren(namespace, parentId);

  if (children.length === 0) return null;

  return (
    <div className="detail-section">
      <div className="detail-section-label">Children ({children.length})</div>
      <ul className="children-list">
        {children.map((child) => (
          <li key={child.id} className="child-item">
            <KindBadge kind={child.kind} />
            <EntryLink id={child.id} onClick={() => onNavigate(child.id)} />
            <span className="child-author">by {child.author}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
