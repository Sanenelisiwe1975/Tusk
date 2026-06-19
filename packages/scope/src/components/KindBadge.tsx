import type { Payload } from "@tusk/core";

interface Props {
  kind: Payload["kind"];
}

export function KindBadge({ kind }: Props) {
  return <span className={`kind-badge kind-badge--${kind}`}>{kind}</span>;
}
