// King of the Hill rules shared by the server, the cron and the pages. No chain or node code.
// Every squad in pump.fun's Squad Invitational gets an unofficial fan coin. Its creator fees
// are split on chain: half to the Pump Tower treasury (the King pot), half to the squad's
// members. Each hour the squad whose banked (realized) profit rose most is King, and the pot
// pays holders of the King's coin in SOL.
import { SITE_URL } from "../site.ts";

/** pump.fun's Squad Invitational, Oct 26 to Nov 9 2026 at 14:00 UTC. */
export const COMPETITION_ID = "f0f80f25-3b5c-4996-8750-7940f6950965";
export const COMPETITION_ENDS = Date.parse("2026-11-09T14:00:00Z");

/** Creator-fee split: the treasury funds the King pot, members share the rest equally. */
export const POT_BPS = 5000;
/** pump.fun allows 10 shareholders, and 8 members keep the launch inside one transaction. */
export const MAX_MEMBERS = 8;
/** Of each hour's pot: holders of the King's coin, then $PTWR buy-and-burn. */
export const HOLDERS_BPS = 8000;
/** Holders paid per hour, largest first, so one hour is a bounded number of transfers. */
export const MAX_PAYEES = 200;
/** Smaller payouts roll into the next hour instead of costing more than they're worth. */
export const MIN_PAYOUT_LAMPORTS = 1_000_000n;

export const HOUR = 3_600_000;
export const hourOf = (ms: number) => Math.floor(ms / HOUR) * HOUR;
export const hourId = (ms: number) => new Date(hourOf(ms)).toISOString().slice(0, 13) + "Z";

/** One squad as pump's competition board reports it. */
export type Squad = {
  groupId: string;
  name: string;
  image: string | null;
  rank: number;
  pnlUsd: number;
  realizedUsd: number;
  unrealizedUsd: number;
  members: number;
  struck: boolean;
};

export type Member = { wallet: string; username: string | null; role: string; joinedAt: number; inCompetition: boolean };

/** A squad's fan coin, as launched. `shares` is the on-chain split, treasury included. */
export type SquadCoin = {
  mint: string;
  groupId: string;
  squad: string;
  name: string;
  ticker: string;
  image: string | null;
  shares: { address: string; shareBps: number }[];
  members: Member[];
  launcher: string;
  signature: string;
  createdAt: number;
};

/** A squad name in the URL: pump usernames are letters, numbers and underscores. */
export const squadSlug = (name: string) => name.trim().toLowerCase();
export const squadPage = (name: string) => `${SITE_URL}/king/${encodeURIComponent(squadSlug(name))}`;

export function coinName(squad: string) {
  const name = `${squad.trim()} squad`;
  return new TextEncoder().encode(name).length <= 32 ? name : squad.trim().slice(0, 32);
}

export function coinTicker(squad: string) {
  const t = squad.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return t || "SQUAD";
}

export const coinDescription = (squad: string) =>
  `Unofficial fan coin for the ${squad} squad in pump.fun's Squad Invitational. Not affiliated with the squad or pump.fun. ` +
  `Half of creator fees go to ${squad}'s members, half to the King of the Hill pot: every hour the squad whose banked profit rose most is King, and holders of its coin are paid in SOL.`;

/** The members who get fees: the owner first, then by join date, at most MAX_MEMBERS, no duplicates. */
export function payees(members: Member[], treasury: string): Member[] {
  const seen = new Set([treasury]);
  return [...members]
    .sort((a, b) => (a.role === "OWNER" ? -1 : 0) - (b.role === "OWNER" ? -1 : 0) || a.joinedAt - b.joinedAt)
    .filter((m) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m.wallet) && !seen.has(m.wallet) && seen.add(m.wallet))
    .slice(0, MAX_MEMBERS);
}

/** The on-chain split: members share half equally, the treasury takes half plus any rounding. */
export function squadShares(members: Member[], treasury: string) {
  const who = payees(members, treasury);
  if (!who.length) throw Error("That squad has no member wallets to pay.");
  const each = Math.floor((10_000 - POT_BPS) / who.length);
  return [
    { address: treasury, shareBps: 10_000 - each * who.length },
    ...who.map((m) => ({ address: m.wallet, shareBps: each })),
  ];
}

export function sameShares(a: { address: string; shareBps: number }[], b: { address: string; shareBps: number }[]) {
  return a.length === b.length && a.every((x) => b.some((y) => y.address === x.address && y.shareBps === x.shareBps));
}

/** Banked profit at the start of the hour and at its end, for every squad seen in both. */
export type HourBoard = { hour: number; start: Record<string, number>; end: Record<string, number> };

/** The King: the squad with a coin whose banked profit rose most this hour, if any rose at all. */
export function pickKing(board: HourBoard, withCoins: Set<string>, struck: Set<string> = new Set()) {
  let best: { groupId: string; gainUsd: number } | null = null;
  for (const [id, end] of Object.entries(board.end)) {
    if (!withCoins.has(id) || struck.has(id) || !(id in board.start)) continue;
    const gainUsd = end - board.start[id];
    if (gainUsd > 0 && (!best || gainUsd > best.gainUsd || (gainUsd === best.gainUsd && id < best.groupId))) best = { groupId: id, gainUsd };
  }
  return best;
}

/** The treasury's half of every squad coin's fees earned this hour, in lamports. */
export function potLamports(start: Record<string, string>, end: Record<string, string>) {
  let total = 0n;
  for (const [mint, e] of Object.entries(end)) {
    const gained = BigInt(e) - BigInt(start[mint] ?? e);
    if (gained > 0n) total += gained;
  }
  return (total * BigInt(POT_BPS)) / 10_000n;
}

export type Payout = { wallet: string; tokens: string; lamports: string };

/**
 * Splits the holders' share of the pot pro rata to balance among the largest MAX_PAYEES
 * holders. Payouts under the minimum are dropped and their SOL rolls into the next hour.
 */
export function splitPot(holdersLamports: bigint, balances: { wallet: string; amount: bigint }[]) {
  const top = balances.filter((b) => b.amount > 0n).sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : a.wallet < b.wallet ? -1 : 1)).slice(0, MAX_PAYEES);
  const supply = top.reduce((n, b) => n + b.amount, 0n);
  const payouts: Payout[] = [];
  let paid = 0n;
  if (supply > 0n && holdersLamports > 0n) {
    for (const b of top) {
      const lamports = (holdersLamports * b.amount) / supply;
      if (lamports < MIN_PAYOUT_LAMPORTS) continue;
      payouts.push({ wallet: b.wallet, tokens: b.amount.toString(), lamports: lamports.toString() });
      paid += lamports;
    }
  }
  return { payouts, paid, rollover: holdersLamports - paid };
}

/**
 * When in an hour the holders are counted: a minute between :05 and :55 picked from a
 * secret, so nobody can buy just before the count and sell right after.
 */
export async function snapshotMinute(hour: number, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`king:${hour}`)));
  return 5 + (mac[0] % 51);
}

/** One hour's result, published for anyone to check and for the treasury workers to pay. */
export type Reign = {
  hour: string;
  king: { groupId: string; squad: string; mint: string; gainUsd: number } | null;
  potLamports: string;
  holdersLamports: string;
  burnLamports: string;
  carriedInLamports: string;
  rolloverLamports: string;
  snapshotAt: number | null;
  payouts: Payout[];
  status: "pending" | "paid";
  paidSignatures?: string[];
};
