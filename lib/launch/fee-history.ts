/** Read only the finalized range after the previous cursor; never commit partial history. */
export async function feeHistory(last: string | null, deps: {
  requiredSignature?: string;
  page: (before?: string) => Promise<{ signature: string; err: unknown }[]>;
  amount: (signature: string) => Promise<bigint>;
}) {
  let found = !deps.requiredSignature || deps.requiredSignature === last;
  const finish = (head: string | null, lamports: bigint) => {
    if (!found) throw Error("Claim receipt is not yet visible in finalized history");
    return { last: head ?? last, lamports };
  };
  let before: string | undefined;
  let head: string | null = null;
  let lamports = 0n;
  for (let page = 0; page < 20; page++) {
    const entries = await deps.page(before);
    head ??= entries[0]?.signature ?? null;
    for (const entry of entries) {
      if (entry.signature === deps.requiredSignature) found = true;
      if (entry.signature === last) return finish(head, lamports);
      if (!entry.err) lamports += await deps.amount(entry.signature);
    }
    if (entries.length < 50) return finish(head, lamports);
    before = entries.at(-1)!.signature;
  }
  throw Error("Fee history exceeds refresh budget; cursor retained");
}
