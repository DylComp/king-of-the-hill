// Pays out every launched coin with fees waiting. pump.fun lets anyone trigger it; the
// signed-in wallet only covers the network fee and the SOL goes 80/20 as locked at launch.
import { fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { limited } from "@/lib/limit";
import { payoutAllTxs } from "@/lib/launch/treasury";

export async function POST(req: Request) {
  const slow = await limited(req, "collect");
  if (slow) return slow;
  try {
    const payer = await sessionWallet();
    if (!payer) return json({ error: "sign in first" }, 401);
    try {
      return json(await payoutAllTxs(payer));
    } catch (e) {
      const msg = (e as Error).message;
      if (/^[A-Z].*[.!]$/.test(msg)) return json({ error: msg }, 400);
      throw e;
    }
  } catch (e) {
    return fail(e, "payout-all");
  }
}
