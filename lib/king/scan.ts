// Server-only, read only: the worker that watches squad wallets. Each run picks the wallets
// scanned longest ago, reads their new transactions from the chain (Helius RPC) and adds the
// SOL each trade banked to its squad's hour. No pump.fun API involved.
import { rpcUrl } from "../chain";
import { STABLES, WSOL, hourOf, tradeLamports, type RpcTx } from "./model";
import { cursors, saveScan, scannedAt } from "./store";

/** Newest transactions read per wallet per run; a busier wallet keeps only its newest. */
const MAX_SIGS = 300;
const PARALLEL = 6;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    const j = (await res.json()) as { result?: T; error?: { message: string } };
    if (j.error) throw Error(`${method}: ${j.error.message}`);
    return j.result as T;
  }
}

/** SOL's dollar price, to count trades sold into USDC/USDT. Null if it can't be read. */
async function solPrice() {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${WSOL}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const pairs = (await res.json()) as { baseToken: { address: string }; quoteToken: { address: string }; priceUsd?: string; liquidity?: { usd?: number } }[];
    const best = pairs.filter((p) => p.baseToken.address === WSOL && p.priceUsd && STABLES.has(p.quoteToken.address)).sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const price = best ? Number(best.priceUsd) : NaN;
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

type Sig = { signature: string; err: unknown; blockTime: number | null };

/** Signatures newer than `until`, newest first, at most MAX_SIGS. */
async function newSignatures(wallet: string, until: string | undefined) {
  const out: Sig[] = [];
  let before: string | undefined;
  while (out.length < MAX_SIGS) {
    const page = await rpc<Sig[]>("getSignaturesForAddress", [wallet, { limit: 100, ...(until && { until }), ...(before && { before }), commitment: "confirmed" }]);
    out.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].signature;
  }
  return out.slice(0, MAX_SIGS);
}

/**
 * Scans one wallet. The first scan only sets the starting point: trades count from the
 * moment a squad is tracked, never before.
 */
async function scanWallet(wallet: string, groupId: string, until: string | undefined, now: number, usdPerSol: number | null) {
  const sigs = await newSignatures(wallet, until);
  const perHour = new Map<number, bigint>();
  if (until) {
    const ok = sigs.filter((s) => !s.err && s.blockTime);
    for (let i = 0; i < ok.length; i += 10) {
      await Promise.all(
        ok.slice(i, i + 10).map(async (s) => {
          const tx = await rpc<RpcTx | null>("getTransaction", [s.signature, { encoding: "json", maxSupportedTransactionVersion: 1, commitment: "confirmed" }]);
          const lamports = tx && tradeLamports(tx, wallet, usdPerSol);
          if (lamports == null) return;
          const hour = hourOf((tx!.blockTime ?? s.blockTime!) * 1000);
          perHour.set(hour, (perHour.get(hour) ?? 0n) + lamports);
        }),
      );
    }
  }
  await saveScan(groupId, wallet, perHour, sigs[0]?.signature ?? until ?? null, now);
  return sigs.length;
}

/**
 * Scans the given wallets, the ones scanned longest ago first, until the deadline.
 * Returns how many it scanned and how many transactions it read.
 */
export async function scanWallets(wallets: { wallet: string; groupId: string }[], deadline: number) {
  const [cur, seen, usdPerSol] = await Promise.all([cursors(), scannedAt(), solPrice()]);
  const queue = [...wallets].sort((a, b) => Number(seen[a.wallet] ?? 0) - Number(seen[b.wallet] ?? 0));
  let scanned = 0;
  let txs = 0;
  let failed = 0;
  const worker = async () => {
    while (queue.length && Date.now() < deadline) {
      const w = queue.shift()!;
      try {
        txs += await scanWallet(w.wallet, w.groupId, cur[w.wallet], Date.now(), usdPerSol);
        scanned++;
      } catch (e) {
        failed++;
        // A wallet the RPC rejects outright would otherwise hold up every hour's crown.
        if (/invalid/i.test((e as Error).message)) await saveScan(w.groupId, w.wallet, new Map(), null, Date.now()).catch(() => null);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return { scanned, txs, failed, left: queue.length };
}

/** Whether every wallet has been scanned at or after `time`, so an hour ending then is complete. */
export async function allScannedSince(wallets: { wallet: string }[], time: number) {
  const seen = await scannedAt();
  return wallets.every((w) => Number(seen[w.wallet] ?? 0) >= time);
}
