import { body, fail, json } from "@/lib/api";
import { checkSignature, startSession } from "@/lib/auth";
import { isAddress } from "@/lib/chain";
import { limited } from "@/lib/limit";
import { markJoined } from "@/lib/store";
import { recordReferral } from "@/lib/missions";

export async function POST(req: Request) {
  const slow = await limited(req, "verify");
  if (slow) return slow;
  const { wallet, signature, nonce, ref } = await body<{ wallet: string; signature: string; nonce: string; ref: string }>(req);
  if (!wallet || !isAddress(wallet) || typeof signature !== "string" || typeof nonce !== "string" || signature.length > 200) return json({ error: "bad request" }, 400);
  try {
    if (!(await checkSignature(wallet, nonce, signature))) return json({ error: "signature didn't check out, try again" }, 401);
    const [, isNew] = await Promise.all([startSession(wallet), markJoined(wallet)]);
    // Only a wallet's very first sign-in can be credited to whoever invited it.
    if (isNew && typeof ref === "string" && isAddress(ref) && ref !== wallet) await recordReferral(wallet, ref).catch(() => {});
    return json({ wallet });
  } catch (e) {
    return fail(e, "verify");
  }
}
