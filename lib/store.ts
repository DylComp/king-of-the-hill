// Server-side game state. Cash is never stored: it is recomputed from on-chain hold time
// minus what the wallet has bought, so the database only holds purchases and placements.
import { after } from "next/server";
import { buildTower } from "./chain";
import { getJson, hasDb, pipeline, redis, setJson } from "./redis";
import { rewardsFor } from "./rewards";
import {
  type Floor,
  type Streak,
  checkInPoints,
  collect as collectStreak,
  emptyStreak,
  lobbyFloor,
  seasonOf,
  type Resident,
  type Save,
  type SkylineRow,
  WALLET_BONUS,
  rewardCash,
  buyAndPlace,
  cashOf,
  emptySave,
  itemById,
  removeFurniture,
  residentOf,
  skylineRow,
  tierFor,
  towerRate,
} from "./game";

const TOWER_TTL = 300;
const TOWER_KEEP = 3600;
const k = {
  tower: (w: string) => `pt:tw:${w}`,
  save: (w: string) => `pt:save:${w}`,
  lock: (w: string) => `pt:lock:${w}`,
  board: "pt:skyline",
  residents: "pt:residents",
  joined: (w: string) => `pt:joined:${w}`,
  streak: (w: string) => `pt:streak:${w}`,
  season: (n: number) => `pt:season:${n}`,
};

/** First sign-in stamps the resident floor's clock; later sign-ins keep the original date. */
export async function markJoined(owner: string) {
  await redis("SET", k.joined(owner), Date.now(), "NX");
}

export async function joinedAt(owner: string): Promise<number | null> {
  const v = await redis<string | null>("GET", k.joined(owner));
  return v ? Number(v) : null;
}

type CachedTower = { at: number; chain: Floor[] };

/**
 * Read a wallet's tower. Chain reads are cached for 5 minutes so buys and reloads don't hammer
 * the RPC. With `stale`, a cached copy up to an hour old is served at once and refreshed after the
 * response, so big wallets don't wait on a full rescan. Buys never use stale data.
 */
export async function towerFor(owner: string, o: { fresh?: boolean; stale?: boolean } = {}): Promise<Floor[]> {
  if (!hasDb()) return buildTower(owner);
  const [hit, joined] = await Promise.all([
    getJson<CachedTower>(k.tower(owner)).catch(() => null),
    joinedAt(owner).catch(() => null),
  ]);
  const age = hit ? Date.now() - hit.at : Infinity;
  const withLobby = (chain: Floor[]) => (joined ? [...chain, lobbyFloor(joined)] : chain);
  const refresh = async () => {
    const chain = await buildTower(owner);
    await Promise.all([setJson(k.tower(owner), { at: Date.now(), chain } satisfies CachedTower, TOWER_KEEP), rank(owner, withLobby(chain))]);
    return chain;
  };

  if (hit && !o.fresh && (age < TOWER_TTL * 1000 || o.stale)) {
    const floors = withLobby(hit.chain);
    if (age >= TOWER_TTL * 1000) after(() => refresh().catch((e) => console.error("refresh", owner, e)));
    else await rank(owner, floors).catch((e) => console.error("cache", e));
    return floors;
  }
  const chain = await refresh().catch(async (e) => {
    // Chain read failed: a cached copy, however old, beats an error.
    if (hit) return hit.chain;
    throw e;
  });
  return withLobby(chain);
}

async function rank(owner: string, floors: Floor[]) {
  if (!floors.length) {
    await pipeline([["ZREM", k.board, owner], ["HDEL", k.residents, owner]]);
    return;
  }
  await pipeline([
    ["ZADD", k.board, towerRate(floors), owner],
    ["HSET", k.residents, owner, JSON.stringify(residentOf(owner, floors))],
  ]);
}

/** Top towers by rent per hour, re-scored at read time since tiers keep climbing. */
export async function skyline(limit = 25): Promise<SkylineRow[]> {
  const ids = await redis<string[]>("ZREVRANGE", k.board, 0, limit * 2 - 1);
  if (!ids.length) return [];
  const raw = await redis<(string | null)[]>("HMGET", k.residents, ...ids);
  const now = Date.now();
  return raw
    .filter((r): r is string => !!r)
    .map((r) => skylineRow(JSON.parse(r) as Resident, now))
    .sort((a, b) => b.rate - a.rate || b.longest - a.longest)
    .slice(0, limit);
}

/** One building in the city: each floor's tier, oldest hold first. */
export type CityTower = SkylineRow & { tiers: number[]; houses: number[] };

/** Every ranked tower with its floors, for the city view. */
export async function city(limit = 80): Promise<CityTower[]> {
  const ids = await redis<string[]>("ZREVRANGE", k.board, 0, limit * 2 - 1);
  if (!ids.length) return [];
  const raw = await redis<(string | null)[]>("HMGET", k.residents, ...ids);
  const now = Date.now();
  return raw
    .filter((r): r is string => !!r)
    .map((r) => {
      const res = JSON.parse(r) as Resident;
      return {
        ...skylineRow(res, now),
        tiers: res.f.map(([since]) => tierFor(since, now)),
        houses: res.f.map(([, h]) => h),
      };
    })
    .filter((t) => t.floors > 0)
    .sort((a, b) => b.rate - a.rate || b.longest - a.longest)
    .slice(0, limit);
}

export type SeasonRow = SkylineRow & { points: number };

/** This week's ranking: points banked by daily check-ins. */
export async function seasonBoard(season: number, limit = 25): Promise<{ rows: SeasonRow[]; total: number }> {
  const flat = await redis<string[]>("ZREVRANGE", k.season(season), 0, limit - 1, "WITHSCORES");
  const ids = flat.filter((_, i) => i % 2 === 0);
  const total = await redis<number>("ZCARD", k.season(season));
  if (!ids.length) return { rows: [], total };
  const raw = await redis<(string | null)[]>("HMGET", k.residents, ...ids);
  const now = Date.now();
  const rows = ids.flatMap((w, i) => {
    const r = raw[i];
    return r ? [{ ...skylineRow(JSON.parse(r) as Resident, now), points: Number(flat[i * 2 + 1]) }] : [];
  });
  return { rows, total };
}

export async function loadStreak(owner: string): Promise<Streak> {
  return (await getJson<Streak>(k.streak(owner))) ?? emptyStreak();
}

/** Starting cash, every daily bonus collected, and $PTWR holder rewards paid out. */
const bonusOf = (s: Streak, rewardsSol = 0) => WALLET_BONUS + s.total + rewardCash(rewardsSol);

export type CollectOutcome = { ok: true; streak: Streak; reward: number; points: number } | { ok: false; reason: string };

export function checkIn(owner: string): Promise<CollectOutcome> {
  return withLock(owner, async () => {
    const [floors, streak] = await Promise.all([towerFor(owner), loadStreak(owner)]);
    const r = collectStreak(streak);
    if (!r.ok) return { ok: false, reason: "already collected today" };
    const points = checkInPoints(floors);
    await Promise.all([setJson(k.streak(owner), r.streak), redis("ZINCRBY", k.season(seasonOf()), points, owner)]);
    return { ok: true, streak: r.streak, reward: r.reward, points };
  });
}

export const totalResidents = () => redis<number>("ZCARD", k.board);

export async function loadSave(owner: string): Promise<Save> {
  const s = await getJson<Save>(k.save(owner));
  return s ? { owned: s.owned ?? [], placed: s.placed ?? {} } : emptySave();
}

/** One write at a time per wallet so two tabs can't double-spend. */
async function withLock<T>(owner: string, fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 20; i++) {
    if (await redis("SET", k.lock(owner), "1", "NX", "EX", 10)) {
      try {
        return await fn();
      } finally {
        await redis("DEL", k.lock(owner)).catch(() => {});
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("busy, try again");
}

export type Outcome = { ok: true; save: Save; cash: number } | { ok: false; reason: string };

export function buy(owner: string, itemId: string, mint: string): Promise<Outcome> {
  return withLock(owner, async () => {
    const item = itemById(itemId);
    if (!item) return { ok: false, reason: "no such item" };
    const [floors, save, streak, sol] = await Promise.all([towerFor(owner), loadSave(owner), loadStreak(owner), rewardsFor(owner)]);
    const floor = floors.find((f) => f.mint === mint);
    if (!floor) return { ok: false, reason: "that floor isn't in your tower" };
    const cash = cashOf(floors, save.owned, bonusOf(streak, sol));
    const r = buyAndPlace(save, item, mint, tierFor(floor.heldSince), cash);
    if (!r.ok) return r;
    await setJson(k.save(owner), r.save);
    return { ok: true, save: r.save, cash: cashOf(floors, r.save.owned, bonusOf(streak, sol)) };
  });
}

export function remove(owner: string, mint: string, itemId: string): Promise<Outcome> {
  return withLock(owner, async () => {
    const [floors, save, streak, sol] = await Promise.all([towerFor(owner), loadSave(owner), loadStreak(owner), rewardsFor(owner)]);
    const next = removeFurniture(save, mint, itemId);
    await setJson(k.save(owner), next);
    return { ok: true, save: next, cash: cashOf(floors, next.owned, bonusOf(streak, sol)) };
  });
}
