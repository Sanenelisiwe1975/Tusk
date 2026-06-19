export type DiffOp =
  | { type: "same"; a: string; b: string }
  | { type: "removed"; a: string }
  | { type: "added"; b: string };

/** Line-level LCS diff. Payloads are a handful of lines, so the O(n*m) table is fine. */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "same", a: a[i]!, b: b[j]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ type: "removed", a: a[i]! });
      i++;
    } else {
      ops.push({ type: "added", b: b[j]! });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "removed", a: a[i]! });
    i++;
  }
  while (j < m) {
    ops.push({ type: "added", b: b[j]! });
    j++;
  }
  return ops;
}
