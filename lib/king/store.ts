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

/** Banked profit per squad at the top of an hour, kept a week. */
export const saveBoard = (hour: number, realized: Record<string, number>) => setJson(k.board(hour), realized, WEEK);
export const boardAt = (hour: number) => getJson<Record<string, number>>(k.board(hour));

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
