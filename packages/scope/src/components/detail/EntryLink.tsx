interface Props {
  id: string;
  label?: string;
  onClick: () => void;
}

/** Navigable truncated id — click to open that entry in the detail panel. */
export function EntryLink({ id, label, onClick }: Props) {
  const display = label ?? (id.length > 20 ? `${id.slice(0, 20)}…` : id);
  return (
    <span className="entry-link" onClick={onClick} title={id}>
      {display}
    </span>
  );
}
