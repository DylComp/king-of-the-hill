// Server-only: squad coins, hourly board readings and each hour's King, in Redis.
import { getJson, hasDb, pipeline, redis, setJson } from "../redis";
import type { Reign, SquadCoin } from "./model";

const k = {
  coin: (groupId: string) => `pt:king:coin:${groupId}`,
  byMint: (mint: string) => `pt:king:mint:${mint}`,
  coins: "pt:king:coins",
  board: (hour: number) => `pt:king:board:${hour}`,
  fees: (hour: number) => `pt:king:fees:${hour}`,
  holders: (hour: number, mint: string) => `pt:king:holders:${hour}:${mint}`,
  reign: (hour: string) => `pt:king:reign:${hour}`,
  reigns: "pt:king:reigns",
  carry: "pt:king:carry",
  launching: (groupId: string) => `pt:king:launching:${groupId}`,
  banked: (hour: number) => `pt:king:banked:${hour}`,
  bankedTotal: "pt:king:banked",
  cursor: "pt:king:cursor",
  scanned: "pt:king:scanned",
};
export const kingKeys = k;

const WEEK = 7 * 86_400;

export async function saveSquadCoin(c: SquadCoin) {
  await pipeline([
    ["SET", k.coin(c.groupId), JSON.stringify(c)],
    ["SET", k.byMint(c.mint), c.groupId],
    ["ZADD", k.coins, c.createdAt, c.groupId],
  ]);
}

export const squadCoin = (groupId: string) => getJson<SquadCoin>(k.coin(groupId));

export async function squadCoinByMint(mint: string) {
  const id = await redis<string | null>("GET", k.byMint(mint));
  return id ? squadCoin(id) : null;
}

export async function allSquadCoins(): Promise<SquadCoin[]> {
  if (!hasDb()) return [];
  const ids = await redis<string[]>("ZRANGE", k.coins, 0, -1);
  if (!ids.length) return [];
  const raw = await redis<(string | null)[]>("MGET", ...ids.map(k.coin));
  return raw.flatMap((r) => (r ? [JSON.parse(r) as SquadCoin] : []));
}

const hash = async (key: string): Promise<Record<string, string>> => {
  if (!hasDb()) return {};
  const flat = (await redis<string[] | null>("HGETALL", key)) ?? [];
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
};

/** Lamports each squad's members banked in an hour, and since tracking began. */
export const bankedAt = (hour: number) => hash(k.banked(hour));
export const bankedTotal = () => hash(k.bankedTotal);

/** Per wallet: the newest transaction already counted, and when it was last scanned. */
export const cursors = () => hash(k.cursor);
export const scannedAt = () => hash(k.scanned);

/**
 * Records one wallet's scan: what its squad banked per hour, and how far the scan got.
 * One transaction, so the cursor only moves together with the numbers it counted.
 */
export async function saveScan(groupId: string, wallet: string, perHour: Map<number, bigint>, cursor: string | null, at: number) {
  const cmds: (string | number)[][] = [["HSETNX", "pt:king:wallet:since", wallet, at]];
  let total = 0n;
  for (const [hour, lamports] of perHour) {
    if (lamports === 0n) continue;
    cmds.push(["HINCRBY", k.banked(hour), groupId, lamports.toString()], ["EXPIRE", k.banked(hour), 30 * 86_400]);
    cmds.push(["HINCRBY", `pt:king:wallet:hour:${hour}`, wallet, lamports.toString()], ["EXPIRE", `pt:king:wallet:hour:${hour}`, 30 * 86_400]);
    total += lamports;
  }
  if (total !== 0n) cmds.push(["HINCRBY", k.bankedTotal, groupId, total.toString()]);
  if (total !== 0n) cmds.push(["HINCRBY", "pt:king:wallet:total", wallet, total.toString()]);
  if (cursor) cmds.push(["HSET", k.cursor, wallet, cursor]);
  cmds.push(["HSET", k.scanned, wallet, at]);
  await pipeline(cmds, true);
}

/** Lifetime creator fees per squad coin (lamports) at the top of an hour. */
export const saveFees = (hour: number, fees: Record<string, string>) => setJson(k.fees(hour), fees, WEEK);
export const feesAt = (hour: number) => getJson<Record<string, string>>(k.fees(hour));

/** Holder balances of one coin at the hour's secret snapshot minute. */
export const saveHolders = (hour: number, mint: string, balances: Record<string, string>) => setJson(k.holders(hour, mint), balances, WEEK);
export const holdersAt = (hour: number, mint: string) => getJson<Record<string, string>>(k.holders(hour, mint));
export const hasHolders = async (hour: number, mint: string) => (await redis<number>("EXISTS", k.holders(hour, mint))) === 1;

export async function saveReign(r: Reign) {
  await pipeline([
    ["SET", k.reign(r.hour), JSON.stringify(r)],
    ["ZADD", k.reigns, Date.parse(r.hour.replace("Z", ":00:00Z")), r.hour],
  ]);
}
export const reign = (hour: string) => getJson<Reign>(k.reign(hour));

export async function recentReigns(count = 48): Promise<Reign[]> {
  if (!hasDb()) return [];
  const hours = await redis<string[]>("ZREVRANGE", k.reigns, 0, count - 1);
  if (!hours.length) return [];
  const raw = await redis<(string | null)[]>("MGET", ...hours.map(k.reign));
  return raw.flatMap((r) => (r ? [JSON.parse(r) as Reign] : []));
}

/** SOL left over from hours with no King or dust payouts, added to the next pot. */
export const carried = async () => BigInt((await redis<string | null>("GET", k.carry)) ?? "0");
export const setCarried = (lamports: bigint) => redis("SET", k.carry, lamports.toString());

/** One launch per squad at a time. */
export const claimLaunch = async (groupId: string) => (await redis<string | null>("SET", k.launching(groupId), "1", "NX", "EX", 300)) === "OK";
export const releaseLaunch = (groupId: string) => redis("DEL", k.launching(groupId));

export const walletStats = async (hour:number) => { const [current,last,total,since,scans]=await Promise.all([hash(`pt:king:wallet:hour:${hour}`),hash(`pt:king:wallet:hour:${hour-3600000}`),hash("pt:king:wallet:total"),hash("pt:king:wallet:since"),scannedAt()]);return {current,last,total,since,scans}; };
