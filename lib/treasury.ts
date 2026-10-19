// Server-only: the buy & burn wallet's recent transactions for the /activity page. Read only;
// nothing here signs or sends. With a Helius key each transaction is labelled from its
// transfers; without one it falls back to plain signatures from the RPC. Cached for five seconds; finalized signatures keep the feed ahead of indexer lag.
import { HOUSE_MINT, TREASURY_WALLET } from "./game";
import { rpcUrl } from "./chain";
import { getJson, hasDb, setJson } from "./redis";

export type TreasuryTx = {
  signature: string;
  at: number | null;
  kind: "buy & burn" | "fees in" | "sent" | "transaction";
  /** SOL in (+) or out (-) of the wallet, when known. */
  sol: number | null;
  /** $PTWR burned in this transaction, when known. */
  burned: number | null;
  ok: boolean;
};

const KEY = "pt:treasury:txs";
const TTL = 5;
const LIMIT = 25;

type HeliusTx = {
  signature: string;
  timestamp?: number;
  type?: string;
  transactionError?: unknown;
  nativeTransfers?: { fromUserAccount?: string; toUserAccount?: string; amount?: number }[];
  tokenTransfers?: { fromUserAccount?: string; toUserAccount?: string; mint?: string; tokenAmount?: number }[];
};

function label(tx: HeliusTx, wallet: string): TreasuryTx {
  let lamports = 0;
  for (const t of tx.nativeTransfers ?? []) {
    if (t.toUserAccount === wallet) lamports += t.amount ?? 0;
    if (t.fromUserAccount === wallet) lamports -= t.amount ?? 0;
  }
  const ptwr = (tx.tokenTransfers ?? []).filter((t) => HOUSE_MINT != null && t.mint === HOUSE_MINT);
  const burnedOut = ptwr.filter((t) => t.fromUserAccount === wallet && !t.toUserAccount).reduce((n, t) => n + (t.tokenAmount ?? 0), 0);
  const isBurn = tx.type === "BURN" || burnedOut > 0 || (ptwr.length > 0 && lamports < 0);
  const kind: TreasuryTx["kind"] = isBurn ? "buy & burn" : lamports > 0 ? "fees in" : lamports < 0 ? "sent" : "transaction";
  return {
    signature: tx.signature,
    at: tx.timestamp ? tx.timestamp * 1000 : null,
    kind,
    sol: lamports ? lamports / 1e9 : null,
    burned: burnedOut || null,
    ok: !tx.transactionError,
  };
}

async function fromHelius(wallet: string, key: string): Promise<TreasuryTx[]> {
  const url = new URL(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`);
  url.searchParams.set("api-key", key);
  url.searchParams.set("limit", String(LIMIT));
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Error(`helius ${res.status}`);
  return ((await res.json()) as HeliusTx[]).map((t) => label(t, wallet));
}

async function fromRpc(wallet: string): Promise<TreasuryTx[]> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [wallet, { limit: LIMIT, commitment: "finalized" }] }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const j = (await res.json()) as { result?: { signature: string; blockTime?: number | null; err?: unknown }[] };
  return (j.result ?? []).map((s) => ({ signature: s.signature, at: s.blockTime ? s.blockTime * 1000 : null, kind: "transaction", sol: null, burned: null, ok: !s.err }));
}

/** The buy & burn wallet's latest transactions, newest first. */
export async function treasuryTxs(): Promise<{ wallet: string | null; txs: TreasuryTx[] }> {
  const wallet = TREASURY_WALLET;
  if (!wallet) return { wallet: null, txs: [] };
  const cached = hasDb() ? await getJson<{ at: number; txs: TreasuryTx[] }>(KEY).catch(() => null) : null;
  if (cached && Date.now() - cached.at < TTL * 1000) return { wallet, txs: cached.txs };
  try {
    const key = process.env.HELIUS_API_KEY;
    const started = Date.now();
    const [recent, indexed] = await Promise.all([
      fromRpc(wallet), key ? fromHelius(wallet, key).catch(() => []) : Promise.resolve([]),
    ]);
    const known = new Map([...(cached?.txs ?? []), ...indexed].map(t => [t.signature, t]));
    const txs = await Promise.all(recent.map(async entry => {
      const prior = known.get(entry.signature);
      if (prior?.sol != null) return prior;
      // New claims may not yet exist in the enhanced-transaction indexer.
      const response = await fetch(rpcUrl(), {
        method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [entry.signature, { encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 1 }] }),
      });
      const j = await response.json() as { result?: { transaction: { message: { accountKeys: string[] } }; meta?: { preBalances: number[]; postBalances: number[]; err: unknown } } };
      const receipt = j.result;
      const i = receipt?.transaction.message.accountKeys.indexOf(wallet) ?? -1;
      if (i < 0 || !receipt?.meta) return prior ?? entry;
      const net = (receipt.meta.postBalances[i] - receipt.meta.preBalances[i]) / 1e9;
      return { ...entry, sol: net, kind: net > 0 ? "fees in" as const : net < 0 ? "sent" as const : "transaction" as const, ok: !receipt.meta.err };
    }));
    // Timestamp at request start so a slow indexer response never earns a fresh TTL.
    if (hasDb()) await setJson(KEY, { at: started, txs }).catch(() => {});
    return { wallet, txs };
  } catch (e) {
    console.error("treasury txs", e);
    return { wallet, txs: cached?.txs ?? [] };
  }
}
