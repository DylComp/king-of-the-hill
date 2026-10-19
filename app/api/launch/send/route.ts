import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { isAddress } from "@/lib/launch/model";
import { broadcastLaunch } from "@/lib/launch/pump";
import { pendingKey } from "@/lib/launch/server";
import { getJson, setJson } from "@/lib/redis";

type Pending = { message: string; signature: string | null } & Record<string, unknown>;

export async function POST(req: Request) {
  const slow = await limited(req, "launch");
  if (slow) return slow;
  try {
    const b = await body<{ mint: string; tx: string }>(req);
    if (!isAddress(b.mint) || typeof b.tx !== "string") return json({ error: "bad request" }, 400);
    const pending = await getJson<Pending>(pendingKey(b.mint));
    if (!pending) return json({ error: "This launch expired. Start over." }, 410);
    let signature: string;
    try {
      signature = await broadcastLaunch(b.tx, pending.message);
    } catch (e) {
      const msg = (e as Error).message;
      console.error("launch send", msg);
      if (/blockhash|expired/i.test(msg)) return json({ error: "The launch took too long to sign. Try again." }, 400);
      if (/insufficient|0x1\b/i.test(msg)) return json({ error: "Not enough SOL in this wallet for the launch and dev buy." }, 400);
      return json({ error: /^[A-Z].*[.!]$/.test(msg) ? msg : "The network rejected the launch. Nothing was spent, try again." }, 400);
    }
    await setJson(pendingKey(b.mint), { ...pending, signature }, 3600);
    return json({ signature });
  } catch (e) {
    return fail(e, "launch send");
  }
}
