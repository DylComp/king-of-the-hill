// Server-only: market caps for launched coins. DexScreener first (one call per 30 coins),
// pump.fun's own API for coins DexScreener hasn't indexed yet. Cached a minute per coin.
import { hasDb, pipeline, redis } from "../redis";

const TTL = 60;
const key = (m: string) => `pt:mc:${m}`;

type Pair = { baseToken?: { address?: string }; marketCap?: number; fdv?: number; liquidity?: { usd?: number } };

async function fromDex(mints: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const best: Record<string, number> = {};
  for (let i = 0; i < mints.length; i += 30) {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints.slice(i, i + 30).join(",")}`, { cache: "no-store", signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (!res?.ok) continue;
    const pairs = (await res.json().catch(() => [])) as Pair[];
    for (const p of Array.isArray(pairs) ? pairs : []) {
      const m = p.baseToken?.address;
      const cap = p.marketCap ?? p.fdv;
      const liq = p.liquidity?.usd ?? 0;
      if (!m || cap == null || (best[m] ?? -1) > liq) continue;
      best[m] = liq;
      out[m] = cap;
    }
  }
  return out;
}

async function fromPump(mint: string): Promise<number | null> {
  const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { usd_market_cap?: number } | null;
  return typeof j?.usd_market_cap === "number" ? j.usd_market_cap : null;
}

/** USD market cap per mint; null when nobody prices it yet. */
export async function marketCaps(mints: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  if (!mints.length) return out;
  let missing = mints;
  if (hasDb()) {
    const cached = await redis<(string | null)[]>("MGET", ...mints.map(key)).catch(() => mints.map(() => null));
    missing = mints.filter((m, i) => {
      if (cached[i] == null) return true;
      out[m] = cached[i] === "null" ? null : Number(cached[i]);
      return false;
    });
  }
  if (!missing.length) return out;
  const dex = await fromDex(missing).catch(() => ({}) as Record<string, number>);
  const rest = missing.filter((m) => dex[m] == null).slice(0, 10);
  const pump = await Promise.all(rest.map((m) => fromPump(m).catch(() => null)));
  for (const m of missing) out[m] = dex[m] ?? pump[rest.indexOf(m)] ?? null;
  if (hasDb()) await pipeline(missing.map((m) => ["SET", key(m), String(out[m]), "EX", TTL])).catch(() => {});
  return out;
}
