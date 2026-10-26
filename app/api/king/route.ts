// Everything the King of the Hill page shows: every squad with the SOL it banked and its fan
// coin, the pot building this hour, and recent reigns. Cached a few seconds at the CDN.
import { fail, live } from "@/lib/api";
import { limited } from "@/lib/limit";
import { markets } from "@/lib/launch/market";
import { cachedPot } from "@/lib/king/engine";
import { COMPETITION_ENDS, HOUR, hourOf } from "@/lib/king/model";
import { competitionBoard } from "@/lib/king/source";
import { allSquadCoins, recentReigns } from "@/lib/king/store";

export async function GET(req: Request) {
  const slow = await limited(req, "king");
  if (slow) return slow;
  try {
    const coins = await allSquadCoins();
    const [board, reigns, pot] = await Promise.all([competitionBoard(new Set(coins.map((c) => c.groupId))), recentReigns(48), cachedPot()]);
    const mkt = await markets(coins.map((c) => c.mint)).catch(() => ({}) as Awaited<ReturnType<typeof markets>>);
    const byGroup = new Map(coins.map((c) => [c.groupId, c]));
    const squads = board.squads.map((s) => {
      const c = byGroup.get(s.groupId);
      return { ...s, coin: c ? { mint: c.mint, ticker: c.ticker, image: c.image, members: c.shares.length - 1, ...mkt[c.mint] } : null };
    });
    const now = Date.now();
    return live({
      board: { takenAt: board.takenAt, wallets: board.squads.reduce((n, s) => n + (s.bankedHour != null ? s.members : 0), 0) },
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
