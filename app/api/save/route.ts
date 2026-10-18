import { fail, json } from "@/lib/api";
import { isAddress } from "@/lib/chain";
import { hasDb } from "@/lib/redis";
import { loadSave, loadStreak } from "@/lib/store";

/** Anyone can see how a tower is decorated; only its owner can change it. */
export async function GET(req: Request) {
  const w = new URL(req.url).searchParams.get("w") ?? "";
  if (!isAddress(w)) return json({ error: "not a solana address" }, 400);
  if (!hasDb()) return json({ save: null, streak: null });
  try {
    const [save, streak] = await Promise.all([loadSave(w), loadStreak(w)]);
    return json({ save, streak });
  } catch (e) {
    return fail(e, "save");
  }
}
