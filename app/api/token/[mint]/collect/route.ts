// Pays out a coin's waiting creator fees, 80% to the recipient and 20% to the treasury.
// pump.fun lets anyone trigger the payout; the signed-in wallet only pays the network fee.
import { fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { limited } from "@/lib/limit";
import { isAddress } from "@/lib/launch/model";
import { collectTx } from "@/lib/launch/pump";
import { getCoin } from "@/lib/launch/registry";

export async function POST(req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isAddress(mint)) return json({ error: "bad request" }, 400);
  const slow = await limited(req, "collect");
  if (slow) return slow;
  try {
    const payer = await sessionWallet();
    if (!payer) return json({ error: "sign in first" }, 401);
    if (!(await getCoin(mint))) return json({ error: "not launched here" }, 404);
    try {
      return json(await collectTx(mint, payer));
    } catch (e) {
      const msg = (e as Error).message;
      if (/^[A-Z].*[.!]$/.test(msg)) return json({ error: msg }, 400);
      throw e;
    }
  } catch (e) {
    return fail(e, "collect");
  }
}
