import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { isAddress } from "@/lib/launch/model";
import { saveTable, tableReady } from "@/lib/launch/alt";
import { broadcastLaunch, broadcastSetup } from "@/lib/launch/pump";
import { pendingKey } from "@/lib/launch/server";
import { getJson, setJson } from "@/lib/redis";

type Pending = { message: string; setup: { table: string; expected: string[]; messages: string[] } | null; signature: string | null } & Record<string, unknown>;

export const maxDuration = 60;

export async function POST(req: Request) {
  const slow = await limited(req, "launch");
  if (slow) return slow;
  try {
    const b = await body<{ mint: string; tx: string; setup?: string[] }>(req);
    if (!isAddress(b.mint) || typeof b.tx !== "string") return json({ error: "bad request" }, 400);
    const pending = await getJson<Pending>(pendingKey(b.mint));
    if (!pending) return json({ error: "This launch expired. Start over." }, 410);
    let signature: string;
    try {
      // The site's first launch also opens its lookup table, in the same approval.
      if (pending.setup && !(await tableReady(pending.setup.table, pending.setup.expected))) {
        if (!Array.isArray(b.setup)) return json({ error: "This launch expired. Start over." }, 410);
        await broadcastSetup(b.setup, pending.setup.messages);
        let ready = false;
        for (let i = 0; i < 20 && !ready; i++) {
          ready = await tableReady(pending.setup.table, pending.setup.expected);
          if (!ready) await new Promise((r) => setTimeout(r, 1000));
        }
        if (!ready) throw Error("Solana is slow right now. Try the launch again.");
      }
      if (pending.setup) await saveTable(pending.setup.table);
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
