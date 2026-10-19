// Server-only: market cap and 24h volume for launched coins. DexScreener first (one call per
// 30 coins, volume summed across a coin's pairs), pump.fun's own API for market caps of coins
// DexScreener hasn't indexed yet. Cached a minute per coin.
import { hasDb, pipeline, redis } from "../redis";

const TTL = 60;
const key = (m: string) => `pt:mkt:${m}`;

export type Market = { mcapUsd: number | null; volUsd: number | null };

type Pair = { baseToken?: { address?: string }; marketCap?: number; fdv?: number; liquidity?: { usd?: number }; volume?: { h24?: number } };

async function fromDex(mints: string[]): Promise<Record<string, Market>> {
  const out: Record<string, Market> = {};
  const best: Record<string, number> = {};
  for (let i = 0; i < mints.length; i += 30) {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints.slice(i, i + 30).join(",")}`, { cache: "no-store", signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (!res?.ok) continue;
    const pairs = (await res.json().catch(() => [])) as Pair[];
    for (const p of Array.isArray(pairs) ? pairs : []) {
      const m = p.baseToken?.address;
      if (!m) continue;
      const row = (out[m] ??= { mcapUsd: null, volUsd: null });
      if (p.volume?.h24 != null) row.volUsd = (row.volUsd ?? 0) + p.volume.h24;
      // Market cap comes from the most liquid pair.
      const cap = p.marketCap ?? p.fdv;
      const liq = p.liquidity?.usd ?? 0;
      if (cap == null || (best[m] ?? -1) > liq) continue;
      best[m] = liq;
      row.mcapUsd = cap;
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

/** USD market cap and 24h volume per mint; null where nobody prices or trades it yet. */
export async function markets(mints: string[]): Promise<Record<string, Market>> {
  const out: Record<string, Market> = {};
  if (!mints.length) return out;
  let missing = mints;
  if (hasDb()) {
    const cached = await redis<(string | null)[]>("MGET", ...mints.map(key)).catch(() => mints.map(() => null));
    missing = mints.filter((m, i) => {
      if (cached[i] == null) return true;
      out[m] = JSON.parse(cached[i]!) as Market;
      return false;
    });
  }
  if (!missing.length) return out;
  const dex = await fromDex(missing).catch(() => ({}) as Record<string, Market>);
  const rest = missing.filter((m) => dex[m]?.mcapUsd == null).slice(0, 10);
  const pump = await Promise.all(rest.map((m) => fromPump(m).catch(() => null)));
  for (const m of missing) {
    const i = rest.indexOf(m);
    out[m] = { mcapUsd: dex[m]?.mcapUsd ?? (i >= 0 ? pump[i] : null) ?? null, volUsd: dex[m]?.volUsd ?? null };
  }
  if (hasDb()) await pipeline(missing.map((m) => ["SET", key(m), JSON.stringify(out[m]), "EX", TTL])).catch(() => {});
  return out;
}

/** USD market cap per mint; null when nobody prices it yet. */
export async function marketCaps(mints: string[]): Promise<Record<string, number | null>> {
  const m = await markets(mints);
  return Object.fromEntries(mints.map((x) => [x, m[x]?.mcapUsd ?? null]));
}
