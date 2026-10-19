// Builds the unsigned launch for the signed-in wallet. The browser adds the mint's
// signature and the wallet's, then hands it back to /api/launch/send.
import { body, fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { limited } from "@/lib/limit";
import { cleanDraft, isAddress, metadataJson } from "@/lib/launch/model";
import { findProfile } from "@/lib/launch/profile";
import { prepareLaunch } from "@/lib/launch/pump";
import { DRAFT_TTL, assetKeys, getCoin } from "@/lib/launch/registry";
import { launchStatus, pendingKey } from "@/lib/launch/server";
import { redis, setJson } from "@/lib/redis";
import { SITE_URL } from "@/lib/site";

export const maxDuration = 30;

export async function POST(req: Request) {
  const slow = await limited(req, "launch");
  if (slow) return slow;
  try {
    const launcher = await sessionWallet();
    if (!launcher) return json({ error: "sign in first" }, 401);
    const status = await launchStatus();
    if (!status.open || !status.treasury) return json({ error: status.reason }, 503);
    const b = await body<{ mint: string; draft: unknown; recipient: string }>(req);
    if (!isAddress(b.mint) || !isAddress(b.recipient)) return json({ error: "bad request" }, 400);
    let draft;
    try {
      draft = cleanDraft(b.draft);
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
    if (b.recipient === status.treasury) return json({ error: "Pick a different recipient." }, 400);
    if (await getCoin(b.mint)) return json({ error: "That coin already launched." }, 409);
    if ((await redis<string | null>("GET", `${assetKeys.image(b.mint)}:by`)) !== launcher) return json({ error: "Add the coin's image first." }, 400);
    const recipient = (await findProfile(b.recipient))!;
    const meta = metadataJson(draft, b.mint, `${SITE_URL}/i/${b.mint}`);
    await redis("SET", assetKeys.meta(b.mint), JSON.stringify(meta), "EX", DRAFT_TTL);
    let prepared;
    try {
      prepared = await prepareLaunch({ draft, launcher, mint: b.mint, recipient: recipient.wallet, treasury: status.treasury, metadataUri: `${SITE_URL}/m/${b.mint}` });
    } catch (e) {
      const msg = (e as Error).message;
      // Our own messages are written for the launcher; anything else is a bug or an outage.
      if (/^[A-Z].*[.!]$/.test(msg)) return json({ error: msg }, 400);
      throw e;
    }
    await setJson(pendingKey(b.mint), { draft, recipient, launcher, treasury: status.treasury, message: prepared.message, setup: prepared.setup && { table: prepared.setup.table, expected: prepared.setup.expected, messages: prepared.setup.messages }, signature: null }, 3600);
    return json({ ...prepared, setup: prepared.setup?.txs ?? null, recipient, metadata: meta });
  } catch (e) {
    return fail(e, "launch prepare");
  }
}
