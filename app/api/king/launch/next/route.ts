// The launch worker's queue: squads still without a coin, best ranked first. Public data only;
// launching itself goes through /api/king/launch/prepare, signed by the worker's own key.
import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { launchable } from "@/lib/king/model";
import { competitionBoard } from "@/lib/king/source";
import { allSquadCoins } from "@/lib/king/store";

export async function GET(req: Request) {
  const slow = await limited(req, "king");
  if (slow) return slow;
  try {
    const coins = await allSquadCoins();
    const board = await competitionBoard(new Set(coins.map((c) => c.groupId)));
    const has = new Set(coins.map((c) => c.groupId));
    const squads = board.squads
      .filter((s) => !has.has(s.groupId) && !s.struck && launchable(s.name))
      .sort((a, b) => a.rank - b.rank)
      .map((s) => ({ groupId: s.groupId, name: s.name, rank: s.rank }));
    return json({ squads });
  } catch (e) {
    return fail(e, "king next");
  }
}
