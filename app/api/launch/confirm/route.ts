// Called once the launch lands: reads the coin back off chain and, only if the 80/20
// split is locked in, lists it on King of the Hill.
import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { isAddress, type Draft } from "@/lib/launch/model";
import { launchProgress, verifyLaunch } from "@/lib/launch/pump";
import { getCoin, saveCoin, type Coin, type Profile } from "@/lib/launch/registry";
import { pendingKey } from "@/lib/launch/server";
import { getJson } from "@/lib/redis";
import { after } from "next/server";
import { towerFor } from "@/lib/store";

type Pending = { draft: Draft; recipient: Profile; launcher: string; treasury: string; signature: string | null; raw?: string; lastValidBlockHeight?: number };

export async function POST(req: Request) {
  const slow = await limited(req, "confirm");
  if (slow) return slow;
  try {
    const { mint } = await body<{ mint: string }>(req);
    if (!isAddress(mint)) return json({ error: "bad request" }, 400);
    const done = await getCoin(mint);
    if (done) return json({ coin: done });
    const p = await getJson<Pending>(pendingKey(mint));
    if (!p) return json({ error: "No launch in progress for that coin." }, 404);
    const check = await verifyLaunch(mint, p.recipient.wallet, p.treasury);
    if (!check.ok && check.reason === "not on chain yet") {
      if (p.signature && p.raw && p.lastValidBlockHeight) {
        const state = await launchProgress(p.raw, p.signature, p.lastValidBlockHeight);
        if (state === "failed") return json({ error: "Solana rejected the launch, so no coin was made. Only the network fee was spent. Try again." }, 400);
        if (state === "expired") return json({ error: "The launch didn't land on Solana in time, so no coin was made and nothing was spent. Try again." }, 410);
      }
      return json({ error: check.reason, retry: true }, 202);
    }
    if (!check.ok) return json({ error: check.reason }, 400);
    const { draft } = p;
    const coin: Coin = {
      mint,
      name: draft.name,
      ticker: draft.ticker,
      description: draft.description,
      twitter: draft.twitter,
      telegram: draft.telegram,
      recipient: p.recipient,
      launcher: p.launcher,
      signature: p.signature ?? "",
      createdAt: Date.now(),
    };
    await saveCoin(coin);
    // Build the pump user's tower right away so it stands in the city and skyline before they ever visit.
    after(() => towerFor(p.recipient.wallet, { fresh: true }).catch((e) => console.error("launch tower", e)));
    return json({ coin });
  } catch (e) {
    return fail(e, "launch confirm");
  }
}
