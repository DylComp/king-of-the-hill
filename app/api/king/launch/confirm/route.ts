// Called once a squad coin's launch lands: reads it back off chain and lists it only if
// the treasury-plus-members split is locked in.
import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { isAddress } from "@/lib/launch/model";
import { launchProgress, verifyLaunch } from "@/lib/launch/pump";
import { assetKeys } from "@/lib/launch/registry";
import { pendingKey } from "@/lib/launch/server";
import { coinName, coinTicker, type SquadCoin } from "@/lib/king/model";
import type { PendingSquad } from "@/lib/king/launch";
import { releaseLaunch, saveSquadCoin, squadCoin, squadCoinByMint } from "@/lib/king/store";
import { getJson, pipeline } from "@/lib/redis";

type Pending = PendingSquad & { signature: string | null; raw?: string; lastValidBlockHeight?: number };

export async function POST(req: Request) {
  const slow = await limited(req, "confirm");
  if (slow) return slow;
  try {
    const { mint } = await body<{ mint: string }>(req);
    if (!isAddress(mint)) return json({ error: "bad request" }, 400);
    const done = await squadCoinByMint(mint);
    if (done) return json({ coin: done });
    const p = await getJson<Pending>(pendingKey(mint));
    if (!p || p.kind !== "squad") return json({ error: "No squad launch in progress for that coin." }, 404);
    const check = await verifyLaunch(mint, p.shares[1].address, p.treasury, p.shares);
    if (!check.ok && check.reason === "not on chain yet") {
      if (p.signature && p.raw && p.lastValidBlockHeight) {
        const state = await launchProgress(p.raw, p.signature, p.lastValidBlockHeight);
        if (state === "failed" || state === "expired") {
          await releaseLaunch(p.squad.groupId);
          return json({ error: state === "failed" ? "Solana rejected the launch. Only the network fee was spent." : "The launch didn't land in time. Nothing was spent." }, 410);
        }
      }
      return json({ error: check.reason, retry: true }, 202);
    }
    if (!check.ok) return json({ error: check.reason }, 400);
    if (await squadCoin(p.squad.groupId)) return json({ error: "That squad already has a coin." }, 409);
    const coin: SquadCoin = {
      mint,
      groupId: p.squad.groupId,
      squad: p.squad.name,
      name: coinName(p.squad.name),
      ticker: coinTicker(p.squad.name),
      image: p.image,
      shares: p.shares,
      members: p.members,
      launcher: p.launcher,
      signature: p.signature ?? "",
      createdAt: Date.now(),
    };
    await saveSquadCoin(coin);
    await pipeline([["PERSIST", assetKeys.image(mint)], ["PERSIST", assetKeys.meta(mint)]]);
    await releaseLaunch(p.squad.groupId);
    return json({ coin });
  } catch (e) {
    return fail(e, "king confirm");
  }
}
