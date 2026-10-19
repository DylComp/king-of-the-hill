import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { burns } from "@/lib/burns";
import { HOUSE_SYMBOL, fmtCash, shortAddr } from "@/lib/game";
import { latestCoins } from "@/lib/launch/registry";
import { hasDb } from "@/lib/redis";
import { skyline } from "@/lib/store";

export type Activity = { kind: "launch" | "burn" | "tower"; text: string; href: string; at: number };

const fmtTokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));

/** The ticker under the nav: newest launches, latest buyback burns and the tallest towers. */
export async function GET() {
  if (!hasDb()) return NextResponse.json({ items: [] });
  try {
    const [coins, b, top] = await Promise.all([latestCoins(0, 8), burns().catch(() => null), skyline(3)]);
    const items: Activity[] = [
      ...coins.map((c) => ({
        kind: "launch" as const,
        text: `$${c.ticker} launched for ${c.recipient.username ? `@${c.recipient.username}` : shortAddr(c.recipient.wallet)}`,
        href: `/t/${c.mint}`,
        at: c.createdAt,
      })),
      ...(b?.recent ?? []).slice(0, 5).map((x) => ({
        kind: "burn" as const,
        text: `${fmtTokens(x.tokens)} $${HOUSE_SYMBOL} burned for ${x.sol.toFixed(3)} SOL`,
        href: `https://solscan.io/tx/${x.signature}`,
        at: x.at,
      })),
      ...top.map((t, i) => ({
        kind: "tower" as const,
        text: `#${i + 1} tower ${shortAddr(t.wallet)} · ${t.floors} floors · $${fmtCash(t.rate)}/hr`,
        href: `/?w=${t.wallet}`,
        at: 0,
      })),
    ].sort((x, y) => y.at - x.at);
    if (b && b.tokens > 0) items.unshift({ kind: "burn", text: `${fmtTokens(b.tokens)} $${HOUSE_SYMBOL} burned all time`, href: "/#docs", at: Date.now() });
    return NextResponse.json({ items }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch (e) {
    return fail(e, "activity");
  }
}
