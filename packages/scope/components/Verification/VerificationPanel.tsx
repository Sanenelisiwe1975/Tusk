import { useEffect, useState } from "react";
import { getStore } from "../../adapters/memoryStore";

export function VerificationPanel({
  entryId
}: {
  entryId: string;
}) {
  const [result, setResult] = useState<any>();

  useEffect(() => {
    getStore().verify(entryId).then(setResult);
  }, [entryId]);

  if (!result) return null;

  return (
    <div>
      <h3>Verification</h3>

      <p>{result.ok ? "Verified" : "Failed"}</p>

      <pre>{result.localHash}</pre>
      <pre>{result.anchoredHash}</pre>
    </div>
  );
}