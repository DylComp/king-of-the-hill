// Server-only: reads a wallet's SPL holdings and how long each has been held.
// Read-only RPC calls; nothing here signs or sends a transaction.
import { HOUSE_MINT, type Floor } from "./game";

const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
];
const SIG_PAGE = 1000;
const SIG_PAGES = 3;
const MAX_FLOORS = 24;
const MIN_USD = 0.5;

function rpcUrl() {
  if (process.env.HELIUS_API_KEY) return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  return process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      continue;
    }
    const json = await res.json();
    if (json.error) throw new Error(`${method}: ${json.error.message}`);
    return json.result as T;
  }
}

type ParsedAccount = {
  pubkey: string;
  account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number | null; decimals: number } } } } };
};

type Holding = { account: string; mint: string; amount: number };

async function holdings(owner: string): Promise<Holding[]> {
  const out: Holding[] = [];
  for (const programId of TOKEN_PROGRAMS) {
    const r = await rpc<{ value: ParsedAccount[] }>("getTokenAccountsByOwner", [
      owner,
      { programId },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ]);
    for (const a of r.value) {
      const info = a.account.data.parsed.info;
      const amt = info.tokenAmount.uiAmount ?? 0;
      // Skip empty accounts and NFTs (0 decimals).
      if (amt > 0 && info.tokenAmount.decimals > 0) out.push({ account: a.pubkey, mint: info.mint, amount: amt });
    }
  }
  return out;
}

/** Oldest signature on the token account: when this wallet first picked the token up. */
async function heldSince(account: string): Promise<number | null> {
  let before: string | undefined;
  let oldest: number | null = null;
  for (let page = 0; page < SIG_PAGES; page++) {
    const sigs = await rpc<{ signature: string; blockTime: number | null }[]>("getSignaturesForAddress", [
      account,
      { limit: SIG_PAGE, ...(before ? { before } : {}) },
    ]);
    if (!sigs.length) break;
    const last = sigs[sigs.length - 1];
    if (last.blockTime) oldest = last.blockTime * 1000;
    if (sigs.length < SIG_PAGE) break;
    before = last.signature;
  }
  return oldest;
}

type DexPair = {
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  info?: { imageUrl?: string };
};

type Meta = { symbol: string; name: string; image: string | null; price: number | null };

async function metadata(mints: string[]): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  for (let i = 0; i < mints.length; i += 30) {
    const chunk = mints.slice(i, i + 30);
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`, {
        next: { revalidate: 120 },
      });
      if (!res.ok) continue;
      const pairs = (await res.json()) as DexPair[];
      // Keep the most liquid pair per token.
      const best = new Map<string, DexPair>();
      for (const p of pairs) {
        const prev = best.get(p.baseToken.address);
        if (!prev || (p.liquidity?.usd ?? 0) > (prev.liquidity?.usd ?? 0)) best.set(p.baseToken.address, p);
      }
      for (const [mint, p] of best) {
        out.set(mint, {
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          image: p.info?.imageUrl ?? null,
          price: p.priceUsd ? Number(p.priceUsd) : null,
        });
      }
    } catch {
      // Metadata is decoration; a failed batch just leaves those floors unlabeled.
    }
  }
  return out;
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export const isAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

export async function buildTower(owner: string): Promise<Floor[]> {
  const held = await holdings(owner);
  const meta = await metadata([...new Set(held.map((h) => h.mint))]);

  const candidates = held
    .map((h) => {
      const m = meta.get(h.mint);
      const usd = m?.price != null ? m.price * h.amount : null;
      return { h, m, usd, isHouse: h.mint === HOUSE_MINT };
    })
    // Unlisted tokens are usually spam airdrops; dust does not get a floor.
    .filter((c) => c.isHouse || (c.m && (c.usd ?? 0) >= MIN_USD))
    .sort((a, b) => Number(b.isHouse) - Number(a.isHouse) || (b.usd ?? 0) - (a.usd ?? 0))
    .slice(0, MAX_FLOORS);

  const since = await pool(candidates, 4, (c) => heldSince(c.h.account).catch(() => null));

  return candidates.map((c, i) => ({
    mint: c.h.mint,
    symbol: c.m?.symbol ?? c.h.mint.slice(0, 4),
    name: c.m?.name ?? "unknown",
    image: c.m?.image ?? null,
    amount: c.h.amount,
    usd: c.usd,
    heldSince: since[i],
    isHouse: c.isHouse,
  }));
}
