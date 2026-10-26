// Builds one squad's fan coin launch for an approved launcher wallet.
import { body, fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { limited } from "@/lib/limit";
import { isAddress } from "@/lib/launch/model";
import { getCoin } from "@/lib/launch/registry";
import { canLaunch, prepareSquadLaunch, workerAuthorized } from "@/lib/king/launch";
import { launchable } from "@/lib/king/model";
import { competitionBoard } from "@/lib/king/source";
import { allSquadCoins, claimLaunch, releaseLaunch, squadCoin } from "@/lib/king/store";

export const maxDuration = 30;

export async function POST(req: Request) {
  const slow = await limited(req, "launch");
  if (slow) return slow;
  try {
    const b = await body<{ mint: string; groupId: string; launcher?: string }>(req);
    // A signed-in launch wallet in the browser, or the launch worker with its secret.
    const launcher = workerAuthorized(req) && typeof b.launcher === "string" ? b.launcher : await sessionWallet();
    if (!canLaunch(launcher)) return json({ error: "Only the launch wallet can launch squad coins." }, 403);
    if (!isAddress(b.mint) || typeof b.groupId !== "string") return json({ error: "bad request" }, 400);
    if (await squadCoin(b.groupId)) return json({ error: "That squad already has a coin." }, 409);
    if (await getCoin(b.mint)) return json({ error: "That coin address is taken. Try again." }, 409);
    const board = await competitionBoard(new Set((await allSquadCoins()).map((c) => c.groupId)));
    const squad = board.squads.find((s) => s.groupId === b.groupId);
    if (!squad) return json({ error: "That squad isn't in the cup's top 100." }, 404);
    if (!launchable(squad.name)) return json({ error: "That squad's name has a slur, so it doesn't get a coin." }, 403);
    if (!(await claimLaunch(squad.groupId))) return json({ error: "That squad is already launching." }, 409);
    try {
      return json(await prepareSquadLaunch(squad, launcher!, b.mint));
    } catch (e) {
      await releaseLaunch(squad.groupId);
      const msg = (e as Error).message;
      if (/^[A-Z].*[.!]$/.test(msg)) return json({ error: msg }, 400);
      throw e;
    }
  } catch (e) {
    return fail(e, "king prepare");
  }
}
