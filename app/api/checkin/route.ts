import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { sessionWallet } from "@/lib/auth";
import { checkIn } from "@/lib/store";

export const maxDuration = 60;

export async function POST(req: Request) {
  const slow = await limited(req, "checkin");
  if (slow) return slow;
  try {
    const wallet = await sessionWallet();
    if (!wallet) return json({ error: "sign in first" }, 401);
    const r = await checkIn(wallet);
    return r.ok ? json(r) : json({ error: r.reason }, 400);
  } catch (e) {
    return fail(e, "checkin");
  }
}
