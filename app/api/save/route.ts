import { fail, json } from "@/lib/api";
import { isAddress } from "@/lib/chain";
import { limited } from "@/lib/limit";
import { hasDb } from "@/lib/redis";
import { loadSave, loadStreak } from "@/lib/store";
import { launchEarnings } from "@/lib/launch/fees";
import { extraCash } from "@/lib/missions";

/** Anyone can see how a tower is decorated; only its owner can change it. */
export async function GET(req: Request) {
  const w = new URL(req.url).searchParams.get("w") ?? "";
  if (!isAddress(w)) return json({ error: "not a solana address" }, 400);
  const slow = await limited(req, "save");
  if (slow) return slow;
  if (!hasDb()) return json({ save: null, streak: null, launchSol: 0, extraCash: 0 });
  try {
    const [save, streak, launchSol, extra] = await Promise.all([loadSave(w), loadStreak(w), launchEarnings(w), extraCash(w)]);
    return json({ save, streak, launchSol, extraCash: extra });
  } catch (e) {
    return fail(e, "save");
  }
}
