// Server-only: the public $PTWR burn tally. Reads the buyback worker's ledger without
// touching it, keeps its own short log of each new buyback, and checks the coin's supply
// on chain once it launches. Nothing here signs or sends a transaction.
import { HOUSE_MINT } from "./game";
import { rpcUrl } from "./chain";
import { getJson, hasDb, pipeline, redis, setJson } from "./redis";

/** pump.fun coins start with one billion tokens at six decimals. */
export const START_SUPPLY = 1_000_000_000;
const DECIMALS = 1e6;
const LEDGER = "pt:buyback:v1";
const LOG = "pt:burns:log";
const SUPPLY = "pt:burns:supply";
const KEEP = 20;

type Ledger = {
  mint?: string;
  debit?: string;
  burned?: string;
  updatedAt?: number;
  lastBuyback?: { signature: string; slot: number; debit: string; burned: string; success: boolean };
};

export type Burn = { signature: string; sol: number; tokens: number; at: number };
export type Burns = { mint: string | null; tokens: number; sol: number; pctSupply: number; supplyBurned: number | null; recent: Burn[]; updatedAt: number | null };

const toTokens = (raw?: string) => (raw && /^\d+$/.test(raw) ? Number(BigInt(raw)) / DECIMALS : 0);
const toSol = (raw?: string) => (raw && /^\d+$/.test(raw) ? Number(BigInt(raw)) / 1e9 : 0);

/** Tokens gone from the supply since launch, cached ten minutes. Null before launch or when RPC fails. */
async function supplyBurned(mint: string): Promise<number | null> {
  const cached = await getJson<{ burned: number; at: number }>(SUPPLY).catch(() => null);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.burned;
  try {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenSupply", params: [mint] }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const j = (await res.json()) as { result?: { value?: { uiAmount?: number } } };
    const now = j.result?.value?.uiAmount;
    if (typeof now !== "number") return cached?.burned ?? null;
    const burned = Math.max(0, START_SUPPLY - now);
    await setJson(SUPPLY, { burned, at: Date.now() }).catch(() => {});
    return burned;
  } catch {
    return cached?.burned ?? null;
  }
}

export async function burns(): Promise<Burns> {
  const empty: Burns = { mint: HOUSE_MINT, tokens: 0, sol: 0, pctSupply: 0, supplyBurned: null, recent: [], updatedAt: null };
  if (!hasDb()) return empty;
  const [raw, log] = await Promise.all([redis<string | null>("GET", LEDGER), redis<string[]>("LRANGE", LOG, 0, KEEP - 1)]);
  const ledger = raw ? (JSON.parse(raw) as Ledger) : null;
  let recent = log.map((r) => JSON.parse(r) as Burn);
  const last = ledger?.lastBuyback;
  // The worker only remembers its latest buyback, so each new one is copied into our own log.
  if (last?.success && !recent.some((b) => b.signature === last.signature)) {
    const b: Burn = { signature: last.signature, sol: toSol(last.debit), tokens: toTokens(last.burned), at: ledger?.updatedAt ?? Date.now() };
    recent = [b, ...recent].slice(0, KEEP);
    await pipeline([["LPUSH", LOG, JSON.stringify(b)], ["LTRIM", LOG, 0, KEEP - 1]]).catch(() => {});
  }
  const mint = ledger?.mint ?? HOUSE_MINT;
  const tokens = toTokens(ledger?.burned);
  const onChain = mint ? await supplyBurned(mint) : null;
  const shown = Math.max(tokens, onChain ?? 0);
  return { mint, tokens: shown, sol: toSol(ledger?.debit), pctSupply: (shown / START_SUPPLY) * 100, supplyBurned: onChain, recent, updatedAt: ledger?.updatedAt ?? null };
}
