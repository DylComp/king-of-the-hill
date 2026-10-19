// Server-only glue between the coin registry and the chain: a coin's lifetime fees and
// what a recipient has earned across every coin launched for them.
import { TIERS, type Floor } from "../game";
import { SITE_URL } from "../site";
import { coinsFor, paidOut, view, type Coin, type CoinView } from "./registry";
import { pendingFees, vaultOf } from "./pump";

export async function coinView(c: Coin, withPending = false): Promise<CoinView> {
  const vault = vaultOf(c.mint);
  const [paid, pending] = await Promise.all([paidOut(c.mint, vault), withPending ? pendingFees(c.mint).catch(() => 0) : Promise.resolve(0)]);
  return view(c, paid, pending);
}

/** The recipient's 80% of every coin launched for them, paid out so far, in SOL. */
export async function launchEarnings(wallet: string): Promise<number> {
  try {
    const coins = await coinsFor(wallet);
    const views = await Promise.all(coins.slice(0, 20).map((c) => coinView(c)));
    return views.reduce((n, v) => n + v.recipientSol, 0);
  } catch (e) {
    console.error("launch earnings", e);
    return 0;
  }
}

const DAY = 86_400_000;

/**
 * Every coin launched for a wallet becomes a floor in its tower, whether or not the wallet
 * holds it. The floor ages from launch day like any bag, and each fee milestone pushes it up
 * a room tier at once (1 SOL in lifetime fees reads as three days held, 100 SOL as thirty).
 */
export async function launchFloors(owner: string): Promise<Floor[]> {
  try {
    const coins = await coinsFor(owner);
    const views = await Promise.all(coins.slice(0, 20).map((c) => coinView(c)));
    return views.map((v) => ({
      mint: v.mint,
      symbol: v.ticker,
      name: v.name,
      image: `${SITE_URL}/i/${v.mint}`,
      amount: 0,
      usd: null,
      heldSince: v.createdAt - TIERS[v.tier].minDays * DAY,
      isHouse: false,
    }));
  } catch (e) {
    console.error("launch floors", e);
    return [];
  }
}

/** A coin the wallet also holds keeps one floor, at whichever tier is higher. */
export function withLaunchFloors(chain: Floor[], launched: Floor[]): Floor[] {
  if (!launched.length) return chain;
  const byMint = new Map(launched.map((f) => [f.mint, f]));
  const merged = chain.map((f) => {
    const l = byMint.get(f.mint);
    if (!l) return f;
    byMint.delete(f.mint);
    return { ...f, heldSince: f.heldSince == null ? l.heldSince : Math.min(f.heldSince, l.heldSince!) };
  });
  return [...merged, ...byMint.values()];
}
