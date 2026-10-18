import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { sessionWallet } from "@/lib/auth";
import { remove } from "@/lib/store";

export const maxDuration = 60;

export async function POST(req: Request) {
  const slow = await limited(req, "remove");
  if (slow) return slow;
  try {
    const wallet = await sessionWallet();
    if (!wallet) return json({ error: "sign in first" }, 401);
    const { item, mint } = await body<{ item: string; mint: string }>(req);
    if (typeof item !== "string" || typeof mint !== "string") return json({ error: "bad request" }, 400);
    const r = await remove(wallet, mint, item);
    return r.ok ? json(r) : json({ error: r.reason }, 400);
  } catch (e) {
    return fail(e, "remove");
  }
}
