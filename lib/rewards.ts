// $PTWR holder rewards: pump.fun pays holders SOL from a distribution wallet several
// times an hour. We total what each wallet has received from those addresses and
// pay the same amount again in game cash, so the coin's rewards and the game's
// economy move together.
import { HOLDER_REWARD_SOURCES } from "./game";
import { getJson, hasDb, setJson } from "./redis";

type Tally = { sol: number; last: string | null; at: number };
type Transfer = { fromUserAccount: string; toUserAccount: string; amount: number };
type Tx = { signature: string; nativeTransfers?: Transfer[] };

const FRESH_MS = 10 * 60_000;
const PAGES = 5;
const key = (w: string) => `pt:rewards:${w}`;

/** SOL received from the reward sources, newest first, stopping at a signature we already counted. */
async function received(wallet: string, stopAt: string | null): Promise<{ sol: number; newest: string | null }> {
  const api = process.env.HELIUS_API_KEY;
  if (!api) return { sol: 0, newest: null };
  const sources = new Set(HOLDER_REWARD_SOURCES);
  let lamports = 0;
  let newest: string | null = null;
  let before: string | undefined;
  for (let page = 0; page < PAGES; page++) {
    const url = new URL(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`);
    url.searchParams.set("api-key", api);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`helius ${res.status}`);
    const txs = (await res.json()) as Tx[];
    if (!txs.length) break;
    newest ??= txs[0].signature;
    for (const tx of txs) {
      if (tx.signature === stopAt) return { sol: lamports / 1e9, newest };
      for (const t of tx.nativeTransfers ?? []) if (t.toUserAccount === wallet && sources.has(t.fromUserAccount)) lamports += t.amount;
    }
    before = txs[txs.length - 1].signature;
    if (txs.length < 100) break;
  }
  return { sol: lamports / 1e9, newest };
}

/** Total SOL this wallet has been paid by $PTWR holder rewards, refreshed every 10 minutes. */
export async function rewardsFor(wallet: string): Promise<number> {
  if (!HOLDER_REWARD_SOURCES.length || !hasDb()) return 0;
  const prev = await getJson<Tally>(key(wallet)).catch(() => null);
  if (prev && Date.now() - prev.at < FRESH_MS) return prev.sol;
  try {
    const r = await received(wallet, prev?.last ?? null);
    const next: Tally = { sol: (prev?.sol ?? 0) + r.sol, last: r.newest ?? prev?.last ?? null, at: Date.now() };
    await setJson(key(wallet), next);
    return next.sol;
  } catch (e) {
    console.error("rewards", e);
    return prev?.sol ?? 0;
  }
}
