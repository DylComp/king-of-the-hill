// Server-side game state. Cash is never stored: it is recomputed from on-chain hold time
// minus what the wallet has bought, so the database only holds purchases and placements.
import { buildTower } from "./chain";
import { getJson, hasDb, pipeline, redis, setJson } from "./redis";
import {
  type Floor,
  type Resident,
  type Save,
  type SkylineRow,
  WALLET_BONUS,
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
const k = {
  tower: (w: string) => `pt:tower:${w}`,
  save: (w: string) => `pt:save:${w}`,
  lock: (w: string) => `pt:lock:${w}`,
  board: "pt:skyline",
  residents: "pt:residents",
};

/** Read a wallet's tower, served from a 5 minute cache so buys and reloads don't hammer the RPC. */
export async function towerFor(owner: string, fresh = false): Promise<Floor[]> {
  if (hasDb() && !fresh) {
    const hit = await getJson<Floor[]>(k.tower(owner)).catch(() => null);
    if (hit) return hit;
  }
  const floors = await buildTower(owner);
  if (hasDb()) {
    await Promise.all([setJson(k.tower(owner), floors, TOWER_TTL), rank(owner, floors)]).catch((e) => console.error("cache", e));
  }
  return floors;
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
    const [floors, save] = await Promise.all([towerFor(owner), loadSave(owner)]);
    const floor = floors.find((f) => f.mint === mint);
    if (!floor) return { ok: false, reason: "that floor isn't in your tower" };
    const cash = cashOf(floors, save.owned, WALLET_BONUS);
    const r = buyAndPlace(save, item, mint, tierFor(floor.heldSince), cash);
    if (!r.ok) return r;
    await setJson(k.save(owner), r.save);
    return { ok: true, save: r.save, cash: cashOf(floors, r.save.owned, WALLET_BONUS) };
  });
}

export function remove(owner: string, mint: string, itemId: string): Promise<Outcome> {
  return withLock(owner, async () => {
    const [floors, save] = await Promise.all([towerFor(owner), loadSave(owner)]);
    const next = removeFurniture(save, mint, itemId);
    await setJson(k.save(owner), next);
    return { ok: true, save: next, cash: cashOf(floors, next.owned, WALLET_BONUS) };
  });
}
