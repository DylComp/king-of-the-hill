import { body, fail, json } from "@/lib/api";
import { checkSignature, startSession } from "@/lib/auth";
import { isAddress } from "@/lib/chain";
import { markJoined } from "@/lib/store";

export async function POST(req: Request) {
  const { wallet, signature } = await body<{ wallet: string; signature: string }>(req);
  if (!wallet || !isAddress(wallet) || typeof signature !== "string") return json({ error: "bad request" }, 400);
  try {
    if (!(await checkSignature(wallet, signature))) return json({ error: "signature didn't check out, try again" }, 401);
    await Promise.all([startSession(wallet), markJoined(wallet)]);
    return json({ wallet });
  } catch (e) {
    return fail(e, "verify");
  }
}
