// Everything the King of the Hill page shows: pump's squad board with each squad's fan coin,
// the pot building this hour, and recent reigns. Cached a few seconds at the CDN.
import { fail, live } from "@/lib/api";
import { limited } from "@/lib/limit";
import { markets } from "@/lib/launch/market";
import { cachedPot, latestBoard } from "@/lib/king/engine";
import { COMPETITION_ENDS, HOUR, hourOf } from "@/lib/king/model";
import { competitionBoard } from "@/lib/king/source";
import { allSquadCoins, recentReigns } from "@/lib/king/store";

export async function GET(req: Request) {
  const slow = await limited(req, "king");
  if (slow) return slow;
  try {
    const [board, coins, reigns, pot] = await Promise.all([
      latestBoard().then((b) => b ?? competitionBoard()),
      allSquadCoins(),
      recentReigns(48),
      cachedPot(),
    ]);
    const mkt = await markets(coins.map((c) => c.mint)).catch(() => ({}) as Awaited<ReturnType<typeof markets>>);
    const byGroup = new Map(coins.map((c) => [c.groupId, c]));
    const squads = board.squads.map((s) => {
      const c = byGroup.get(s.groupId);
      return { ...s, coin: c ? { mint: c.mint, ticker: c.ticker, image: c.image, members: c.shares.length - 1, ...mkt[c.mint] } : null };
    });
    const now = Date.now();
    return live({
      board: { builtAt: board.builtAt, totalRanked: board.totalRanked, entries: board.entries },
      squads,
      coins: coins.length,
      pot: { lamports: pot.toString(), hourStart: hourOf(now), nextCrown: hourOf(now) + HOUR },
      endsAt: COMPETITION_ENDS,
      reigns: reigns.map((r) => ({ ...r, payouts: r.payouts.length })),
    }, 10);
  } catch (e) {
    return fail(e, "king board");
  }
}
