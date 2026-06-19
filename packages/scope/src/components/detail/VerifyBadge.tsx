import { useVerify } from "../../hooks/useVerify";
import { TruncatedId } from "../TruncatedId";

interface Props {
  id: string;
}

export function VerifyBadge({ id }: Props) {
  const { data, isLoading } = useVerify(id);

  const checking = isLoading || !data;
  const state = checking ? "checking" : data.ok ? "ok" : "fail";

  return (
    <div className={`verify-badge verify-badge--${state}`}>
      <div className="verify-badge-main">
        {state === "checking" ? (
          <span className="verify-spinner" />
        ) : (
          <span className="verify-badge-icon">{data!.ok ? "✓" : "✗"}</span>
        )}
        <span className="verify-badge-label">
          {state === "checking" ? "Checking…" : data!.ok ? "VERIFIED" : "MISMATCH"}
        </span>
      </div>

      {data && (
        <div className="verify-hashes">
          <div className="verify-hash-row">
            <span className="verify-hash-key">local</span>
            <TruncatedId value={data.localHash} chars={26} />
          </div>
          <div className="verify-hash-row">
            <span className="verify-hash-key">anchor</span>
            <TruncatedId value={data.anchoredHash} chars={26} />
          </div>
        </div>
      )}
    </div>
  );
}
