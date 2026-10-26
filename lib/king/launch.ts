// Server-only: builds a squad's fan coin launch. The launcher's wallet signs in the browser,
// exactly like the launchpad; the split is treasury half plus up to 8 members, admin revoked.
import { timingSafeEqual } from "node:crypto";
import { DEV_WALLET, TREASURY_WALLET } from "../game";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, cleanDraft, metadataJson } from "../launch/model";
import { prepareLaunch } from "../launch/pump";
import { DRAFT_TTL, assetKeys } from "../launch/registry";
import { pendingKey } from "../launch/server";
import { redis, setJson } from "../redis";
import { SITE_URL } from "../site";
import { coinDescription, coinName, coinTicker, squadPage, squadShares, type Member, type Squad } from "./model";
import { squadMembers } from "./source";

/** Who may launch squad coins: KING_LAUNCHERS (comma separated) or the dev wallet. */
export function canLaunch(wallet: string | null) {
  if (!wallet) return false;
  const list = (process.env.KING_LAUNCHERS ?? DEV_WALLET ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(wallet);
}

/**
 * A launch worker (dlao's, holding the launcher key) proves itself with
 * Authorization: Bearer KING_LAUNCH_SECRET and names the launcher wallet it signs with.
 */
export function workerAuthorized(req: Request) {
  const secret = process.env.KING_LAUNCH_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Copies the squad's pump picture so the coin keeps it; falls back to linking it. */
async function storeImage(mint: string, url: string | null, launcher: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    const bytes = Buffer.from(await res.arrayBuffer());
    if (res.ok && (IMAGE_TYPES as readonly string[]).includes(type) && bytes.length <= MAX_IMAGE_BYTES) {
      await redis("SET", `${assetKeys.image(mint)}:by`, launcher, "EX", DRAFT_TTL);
      await redis("SET", assetKeys.image(mint), JSON.stringify({ type, b64: bytes.toString("base64") }), "EX", DRAFT_TTL);
      return `${SITE_URL}/i/${mint}`;
    }
  } catch {}
  return url.startsWith("https://") && url.length <= 300 ? url : null;
}

export type PendingSquad = { kind: "squad"; squad: Squad; members: Member[]; shares: { address: string; shareBps: number }[]; image: string | null; launcher: string; treasury: string };

export async function prepareSquadLaunch(squad: Squad, launcher: string, mint: string) {
  if (!TREASURY_WALLET) throw Error("The treasury wallet isn't set.");
  const members = await squadMembers(squad.groupId);
  const shares = squadShares(members, TREASURY_WALLET);
  const draft = cleanDraft({ name: coinName(squad.name), ticker: coinTicker(squad.name), description: coinDescription(squad.name), twitter: "", telegram: "", initialBuy: "" });
  const image = await storeImage(mint, squad.image, launcher);
  const meta = { ...metadataJson(draft, mint, image ?? ""), website: squadPage(squad.name) };
  await redis("SET", assetKeys.meta(mint), JSON.stringify(meta), "EX", DRAFT_TTL);
  const prepared = await prepareLaunch({ draft, launcher, mint, recipient: shares[1].address, treasury: TREASURY_WALLET, metadataUri: `${SITE_URL}/m/${mint}`, split: shares });
  const pending: PendingSquad = { kind: "squad", squad, members, shares, image, launcher, treasury: TREASURY_WALLET };
  // /api/launch/send reads `message`, `setup` and `signature` from the same record.
  await setJson(
    pendingKey(mint),
    { ...pending, message: prepared.message, lastValidBlockHeight: prepared.lastValidBlockHeight, setup: prepared.setup && { table: prepared.setup.table, expected: prepared.setup.expected, messages: prepared.setup.messages }, signature: null },
    3600,
  );
  return { ...prepared, setup: prepared.setup?.txs ?? null, draft, shares, image };
}
