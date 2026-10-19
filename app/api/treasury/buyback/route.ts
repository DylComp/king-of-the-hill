// Builds the treasury's buy-and-burn transaction. Only the signed-in treasury wallet gets one,
// and only that wallet can sign it.
import { body, fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { TREASURY_WALLET } from "@/lib/game";
import { limited } from "@/lib/limit";
import { buybackTx } from "@/lib/launch/treasury";

export async function POST(req: Request) {
  const slow = await limited(req, "buyback");
  if (slow) return slow;
  try {
    const me = await sessionWallet();
    if (!me) return json({ error: "sign in first" }, 401);
    if (!TREASURY_WALLET || me !== TREASURY_WALLET) return json({ error: "Only the treasury wallet can buy back." }, 403);
    const { sol } = await body<{ sol: number }>(req);
    if (typeof sol !== "number" || !(sol > 0) || sol > 10_000) return json({ error: "Enter how much SOL to spend." }, 400);
    try {
      return json(await buybackTx(sol));
    } catch (e) {
      const msg = (e as Error).message;
      if (/^[A-Z$].*[.!]$/.test(msg)) return json({ error: msg }, 400);
      throw e;
    }
  } catch (e) {
    return fail(e, "buyback");
  }
}
