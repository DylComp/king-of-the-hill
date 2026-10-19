import { fail, json, live } from "@/lib/api";
import { limited } from "@/lib/limit";
import { coinView } from "@/lib/launch/fees";
import { isAddress } from "@/lib/launch/model";
import { getCoin } from "@/lib/launch/registry";

export async function GET(req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isAddress(mint)) return json({ error: "not a solana address" }, 400);
  const slow = await limited(req, "tokens");
  if (slow) return slow;
  try {
    const c = await getCoin(mint);
    return c ? live({ coin: await coinView(c, true) }) : json({ error: "not launched here" }, 404);
  } catch (e) {
    return fail(e, "token");
  }
}
