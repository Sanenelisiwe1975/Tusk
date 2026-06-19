import { useState } from "react";

interface Props {
  value: string;
  chars?: number;
}

export function TruncatedId({ value, chars = 12 }: Props) {
  const [copied, setCopied] = useState(false);

  const display = value.length > chars + 2 ? `${value.slice(0, chars)}…` : value;

  async function handleClick() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <span
      className={`truncated-id${copied ? " truncated-id--copied" : ""}`}
      title={value}
      onClick={handleClick}
    >
      {copied ? "copied!" : display}
    </span>
  );
}
