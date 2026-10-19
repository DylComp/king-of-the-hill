import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { coinView } from "@/lib/launch/fees";
import { markets, type Market } from "@/lib/launch/market";
import { isAddress } from "@/lib/launch/model";
import { coinsFor, latestCoins, type CoinView, type ProfileSummary } from "@/lib/launch/registry";

async function withMarkets(views: CoinView[]): Promise<CoinView[]> {
  const m = await markets(views.map((v) => v.mint)).catch(() => ({}) as Record<string, Market>);
  return views.map((v) => ({ ...v, mcapUsd: m[v.mint]?.mcapUsd ?? null, volUsd: m[v.mint]?.volUsd ?? null }));
}

export type TokenTotals = { coins: number; profiles: number; feesSol: number; earnedSol: number; volUsd: number; mcapUsd: number };

/** Stats across every coin launched here, not just the page on screen. */
function totals(views: CoinView[]): TokenTotals {
  return {
    coins: views.length,
    profiles: new Set(views.map((v) => v.recipient.wallet)).size,
    feesSol: views.reduce((n, v) => n + v.feesSol, 0),
    earnedSol: views.reduce((n, v) => n + v.recipientSol, 0),
    volUsd: views.reduce((n, v) => n + (v.volUsd ?? 0), 0),
    mcapUsd: views.reduce((n, v) => n + (v.mcapUsd ?? 0), 0),
  };
}

/** Every pump user coins were launched for, with their totals, most fees first. */
function profiles(views: CoinView[]): ProfileSummary[] {
  const by = new Map<string, ProfileSummary>();
  for (const v of views) {
    const cap = v.mcapUsd ?? null;
    const p = by.get(v.recipient.wallet);
    if (!p) {
      by.set(v.recipient.wallet, { profile: v.recipient, coins: 1, feesSol: v.feesSol, earnedSol: v.recipientSol, mcapUsd: cap ?? 0, volUsd: v.volUsd ?? 0, top: { mint: v.mint, ticker: v.ticker, mcapUsd: cap }, recent: [{ mint: v.mint, ticker: v.ticker }], latest: v.createdAt });
      continue;
    }
    p.coins++;
    p.feesSol += v.feesSol;
    p.earnedSol += v.recipientSol;
    p.mcapUsd += cap ?? 0;
    p.volUsd += v.volUsd ?? 0;
    // Coins arrive newest first, so the strip keeps the latest five.
    if (p.recent.length < 5) p.recent.push({ mint: v.mint, ticker: v.ticker });
    if ((cap ?? -1) > (p.top.mcapUsd ?? -1)) p.top = { mint: v.mint, ticker: v.ticker, mcapUsd: cap };
    if (v.createdAt > p.latest) {
      p.latest = v.createdAt;
      p.profile = v.recipient;
    }
  }
  return [...by.values()].sort((a, b) => b.feesSol - a.feesSol || b.mcapUsd - a.mcapUsd);
}

/** Coins launched here, newest first; every coin launched for one wallet (?for=); or pump profiles (?view=profiles). */
export async function GET(req: Request) {
  const slow = await limited(req, "tokens");
  if (slow) return slow;
  const url = new URL(req.url);
  const forWallet = url.searchParams.get("for");
  const page = Math.max(0, Math.min(50, Number(url.searchParams.get("page")) || 0));
  try {
    if (forWallet) {
      if (!isAddress(forWallet)) return json({ error: "not a solana address" }, 400);
      const views = await withMarkets(await Promise.all((await coinsFor(forWallet)).map((c) => coinView(c))));
      return json({ coins: views, total: views.length });
    }
    // Every coin is read once (fees and markets are cached), so totals cover them all.
    const all = await withMarkets(await Promise.all((await latestCoins(0, 500)).map((c) => coinView(c))));
    if (url.searchParams.get("view") === "profiles") return json({ profiles: profiles(all), coins: all.length, totals: totals(all) });
    return json({ coins: all.slice(page * 30, page * 30 + 30), total: all.length, totals: totals(all) });
  } catch (e) {
    return fail(e, "tokens");
  }
}
