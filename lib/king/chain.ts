// Server-only, read only: squad coin fees and holder balances.
import { PublicKey } from "@solana/web3.js";
import { rpcUrl } from "../chain";
import { DEV_WALLET, TREASURY_WALLET } from "../game";
import { paidOut } from "../launch/registry";
import { pendingFees, vaultOf } from "../launch/pump";

/** Every creator fee the coin has earned, paid out or still in its vault, in lamports. */
export async function lifetimeLamports(mint: string): Promise<bigint> {
  const [paid, pending] = await Promise.all([paidOut(mint, vaultOf(mint)), pendingFees(mint).catch(() => 0)]);
  return BigInt(Math.round((paid + pending) * 1e9));
}

type DasPage = { result?: { token_accounts: { owner: string; amount: number | string }[] }; error?: { message: string } };

/**
 * Who holds the coin right now, summed per wallet. Program accounts (the bonding curve, the
 * PumpSwap pool, vaults) are off the ed25519 curve and left out, as are the treasury, the dev
 * wallet and whoever launched the coin.
 */
export async function holderBalances(mint: string, launcher: string): Promise<Record<string, string>> {
  const skip = new Set([TREASURY_WALLET, DEV_WALLET, launcher].filter(Boolean) as string[]);
  const out = new Map<string, bigint>();
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccounts", params: { mint, page, limit: 1000 } }),
    });
    const j = (await res.json()) as DasPage;
    if (j.error) throw Error(`getTokenAccounts: ${j.error.message}`);
    const accounts = j.result?.token_accounts ?? [];
    for (const a of accounts) {
      const amount = BigInt(a.amount);
      if (amount <= 0n || skip.has(a.owner)) continue;
      let onCurve = false;
      try {
        onCurve = PublicKey.isOnCurve(new PublicKey(a.owner).toBytes());
      } catch {}
      if (!onCurve) continue;
      out.set(a.owner, (out.get(a.owner) ?? 0n) + amount);
    }
    if (accounts.length < 1000) break;
  }
  return Object.fromEntries([...out].map(([w, a]) => [w, a.toString()]));
}
