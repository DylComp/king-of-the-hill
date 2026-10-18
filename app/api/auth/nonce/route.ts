import { body, fail, json } from "@/lib/api";
import { newNonce } from "@/lib/auth";
import { isAddress } from "@/lib/chain";
import { limited } from "@/lib/limit";

export async function POST(req: Request) {
  const slow = await limited(req, "nonce");
  if (slow) return slow;
  const { wallet } = await body<{ wallet: string }>(req);
  if (!wallet || !isAddress(wallet)) return json({ error: "not a solana address" }, 400);
  try {
    return json({ message: await newNonce(wallet) });
  } catch (e) {
    return fail(e, "nonce");
  }
}
