import { body, fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { isAddress } from "@/lib/chain";
import { limited } from "@/lib/limit";
import { extraCash, questState, questStep, referrals } from "@/lib/missions";
import { hasDb } from "@/lib/redis";

/** Today's quests, extra cash and referral count for the signed-in wallet. */
export async function GET(req: Request) {
  const slow = await limited(req, "quests");
  if (slow) return slow;
  if (!hasDb()) return json({ error: "saving is offline right now" }, 503);
  try {
    const w = await sessionWallet();
    if (!w) return json({ error: "sign in first" }, 401);
    const [quests, extra, refs] = await Promise.all([questState(w), extraCash(w), referrals(w)]);
    return json({ quests, extraCash: extra, referrals: refs });
  } catch (e) {
    return fail(e, "quests");
  }
}

/** Records a quest step the page saw: visiting a tower, opening a coin, sharing. */
export async function POST(req: Request) {
  const slow = await limited(req, "quests");
  if (slow) return slow;
  try {
    const w = await sessionWallet();
    if (!w) return json({ error: "sign in first" }, 401);
    const { event, target } = await body<{ event: string; target: string }>(req);
    if (event !== "visit" && event !== "coin" && event !== "share") return json({ error: "bad request" }, 400);
    if (event === "visit" && (typeof target !== "string" || !isAddress(target))) return json({ error: "bad request" }, 400);
    const r = await questStep(w, event, typeof target === "string" ? target : undefined);
    const [quests, extra] = await Promise.all([questState(w), extraCash(w)]);
    return json({ ...r, quests, extraCash: extra });
  } catch (e) {
    return fail(e, "quests");
  }
}
