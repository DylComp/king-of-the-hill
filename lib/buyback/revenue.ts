import { rawLamports } from "./amount.ts";

export type Distribution = {
  mint: string; sharingConfig: string; quoteMint: string; distributed: string;
  shareholders: { address: string; shareBps: number }[];
};
/** Only the already-split 20% is credited; it must NOT be multiplied by 20% again. */
export function eligibleRevenue(e: Distribution, o: {
  officialMint: string; treasury: string; recipient: string;
  registeredMint: string; sharingConfig: string; nativeMint: string; defaultKey: string;
}): bigint {
  if (!o.officialMint || e.mint === o.officialMint || e.mint !== o.registeredMint ||
      e.sharingConfig !== o.sharingConfig || ![o.nativeMint, o.defaultKey].includes(e.quoteMint) ||
      o.recipient === o.treasury || e.shareholders.length !== 2 ||
      !e.shareholders.some(s => s.address === o.treasury && s.shareBps === 2000) ||
      !e.shareholders.some(s => s.address === o.recipient && s.shareBps === 8000)) return 0n;
  return rawLamports(e.distributed) * 2000n / 10000n;
}
