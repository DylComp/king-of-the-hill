import { fail, json } from "@/lib/api";
import { isAddress } from "@/lib/chain";
import { hasDb } from "@/lib/redis";
import { loadSave } from "@/lib/store";

/** Anyone can see how a tower is decorated; only its owner can change it. */
export async function GET(req: Request) {
  const w = new URL(req.url).searchParams.get("w") ?? "";
  if (!isAddress(w)) return json({ error: "not a solana address" }, 400);
  if (!hasDb()) return json({ save: null });
  try {
    return json({ save: await loadSave(w) });
  } catch (e) {
    return fail(e, "save");
  }
}
