// One squad: the SOL it banked, its fan coin and fee split, and the hours it was King.
import { fail, json, live } from "@/lib/api";
import { limited } from "@/lib/limit";
import { markets } from "@/lib/launch/market";
import { squadSlug } from "@/lib/king/model";
import { competitionBoard } from "@/lib/king/source";
import { allSquadCoins, recentReigns } from "@/lib/king/store";

export async function GET(req: Request) {
  const slow = await limited(req, "king");
  if (slow) return slow;
  try {
    const name = squadSlug(new URL(req.url).searchParams.get("name") ?? "");
    if (!name || name.length > 40) return json({ error: "bad request" }, 400);
    const coins = await allSquadCoins();
    const [board, reigns] = await Promise.all([competitionBoard(new Set(coins.map((c) => c.groupId))), recentReigns(500)]);
    const squad = board.squads.find((s) => squadSlug(s.name) === name) ?? null;
    const coin = coins.find((c) => squadSlug(c.squad) === name) ?? null;
    if (!squad && !coin) return json({ error: "No squad by that name in the cup's top 100." }, 404);
    const groupId = squad?.groupId ?? coin!.groupId;
    const market = coin ? (await markets([coin.mint]).catch(() => ({})))[coin.mint as never] ?? null : null;
    return live({ squad, coin, market, reigns: reigns.filter((r) => r.king?.groupId === groupId).map((r) => ({ ...r, payouts: r.payouts.length })) }, 10);
  } catch (e) {
    return fail(e, "king squad");
  }
}
