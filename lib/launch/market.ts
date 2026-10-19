// Server-only: market cap and 24h volume for launched coins. DexScreener first (one call per
// 30 coins, volume summed across a coin's pairs), pump.fun's own API for market caps of coins
// DexScreener hasn't indexed yet. Cached a minute per coin.
import { hasDb, pipeline, redis } from "../redis";

const TTL = 60;
const key = (m: string) => `pt:mkt:${m}`;
/** A last good reading per coin, shown while DexScreener or pump.fun is rate limiting us. */
const lastKey = (m: string) => `pt:mkt:last:${m}`;
const LAST_TTL = 86400;

/** GET with up to two retries on rate limits and server hiccups; null if it still fails. */
async function get(url: string, timeout: number, headers?: Record<string, string>): Promise<Response | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(timeout) }).catch(() => null);
    if (res?.ok || (res && res.status !== 429 && res.status < 500) || attempt >= 2) return res?.ok ? res : null;
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
}

export type Market = { mcapUsd: number | null; volUsd: number | null };

type Pair = { baseToken?: { address?: string }; marketCap?: number; fdv?: number; liquidity?: { usd?: number }; volume?: { h24?: number } };

/** Coins DexScreener answered for go in `out`; coins whose request failed are added to `failed`. */
async function fromDex(mints: string[], failed: Set<string>): Promise<Record<string, Market>> {
  const out: Record<string, Market> = {};
  const best: Record<string, number> = {};
  for (let i = 0; i < mints.length; i += 30) {
    const chunk = mints.slice(i, i + 30);
    const res = await get(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`, 6000);
    if (!res) {
      chunk.forEach((m) => failed.add(m));
      continue;
    }
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
  const res = await get(`https://frontend-api-v3.pump.fun/coins/${mint}`, 5000, { accept: "application/json" });
  if (!res) return null;
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
  const failed = new Set<string>();
  const dex = await fromDex(missing, failed).catch(() => {
    missing.forEach((m) => failed.add(m));
    return {} as Record<string, Market>;
  });
  const rest = missing.filter((m) => dex[m]?.mcapUsd == null).slice(0, 10);
  const pump = await Promise.all(rest.map((m) => fromPump(m).catch(() => null)));
  for (const m of missing) {
    const i = rest.indexOf(m);
    out[m] = { mcapUsd: dex[m]?.mcapUsd ?? (i >= 0 ? pump[i] : null) ?? null, volUsd: dex[m]?.volUsd ?? null };
  }
  if (!hasDb()) return out;
  // Coins DexScreener didn't answer for: show their last good reading and ask again next time.
  const lost = missing.filter((m) => failed.has(m) && out[m].mcapUsd == null);
  if (lost.length) {
    const last = await redis<(string | null)[]>("MGET", ...lost.map(lastKey)).catch(() => lost.map(() => null));
    lost.forEach((m, i) => {
      if (last[i]) out[m] = JSON.parse(last[i]!) as Market;
    });
  }
  const good = missing.filter((m) => !failed.has(m) || out[m].mcapUsd != null);
  await pipeline(
    good.flatMap((m) => [
      ["SET", key(m), JSON.stringify(out[m]), "EX", TTL],
      ...(out[m].mcapUsd != null || out[m].volUsd != null ? [["SET", lastKey(m), JSON.stringify(out[m]), "EX", LAST_TTL]] : []),
    ]),
  ).catch(() => {});
  return out;
}

/** USD market cap per mint; null when nobody prices it yet. */
export async function marketCaps(mints: string[]): Promise<Record<string, number | null>> {
  const m = await markets(mints);
  return Object.fromEntries(mints.map((x) => [x, m[x]?.mcapUsd ?? null]));
}
