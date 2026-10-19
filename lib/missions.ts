// Server side of daily quests and referrals. Cash earned here goes into one counter per
// wallet ("extra cash") that is added to the tower's cash like the daily bonus is.
import { dayIndex, type Floor } from "./game.ts";
import { ALL_QUESTS_BONUS, QUESTS, REFERRED_REWARD, REFERRER_REWARD, questById, type QuestId, type QuestState, type Referrals } from "./quests.ts";
import { hasDb, pipeline, redis } from "./redis.ts";

const DAY_TTL = 3 * 86_400;
const k = {
  quest: (w: string, d: number) => `pt:q:${w}:${d}`,
  visited: (w: string, d: number) => `pt:qv:${w}:${d}`,
  extra: (w: string) => `pt:xcash:${w}`,
  ref: (w: string) => `pt:ref:${w}`,
  refPaid: (w: string) => `pt:refpaid:${w}`,
  refs: (w: string) => `pt:refs:${w}`,
};

export async function extraCash(owner: string): Promise<number> {
  if (!hasDb()) return 0;
  return Number((await redis<string | null>("GET", k.extra(owner)).catch(() => null)) ?? 0);
}

export async function questState(owner: string, now = Date.now()): Promise<QuestState> {
  const day = dayIndex(now);
  const flat = await redis<string[]>("HGETALL", k.quest(owner, day));
  const map: Record<string, number> = {};
  for (let i = 0; i < flat.length; i += 2) map[flat[i]] = Number(flat[i + 1]);
  const progress: QuestState["progress"] = {};
  for (const q of QUESTS) if (map[q.id]) progress[q.id] = Math.min(q.target, map[q.id]);
  return { day, progress, allDone: map.all === 1 };
}

/**
 * Counts one step of a quest. Pays the reward the moment a quest hits its target, and the
 * all-quests bonus once every quest is done. A visit only counts once per tower per day.
 */
export async function questStep(owner: string, id: QuestId, target?: string, now = Date.now()): Promise<{ paid: number }> {
  const q = questById(id);
  if (!q || !hasDb()) return { paid: 0 };
  const day = dayIndex(now);
  const key = k.quest(owner, day);
  if (id === "visit") {
    if (!target || target === owner) return { paid: 0 };
    const [added] = (await pipeline([["SADD", k.visited(owner, day), target], ["EXPIRE", k.visited(owner, day), DAY_TTL]])) as number[];
    if (!added) return { paid: 0 };
  }
  const [count] = (await pipeline([["HINCRBY", key, id, 1], ["EXPIRE", key, DAY_TTL]])) as number[];
  if (count !== q.target) return { paid: 0 };
  let paid = q.reward;
  const flat = await redis<string[]>("HGETALL", key);
  const map: Record<string, number> = {};
  for (let i = 0; i < flat.length; i += 2) map[flat[i]] = Number(flat[i + 1]);
  if (QUESTS.every((x) => (map[x.id] ?? 0) >= x.target) && (await redis<number>("HSETNX", key, "all", 1)) === 1) paid += ALL_QUESTS_BONUS;
  await redis("INCRBY", k.extra(owner), paid);
  return { paid };
}

/** Remembers who invited a brand new wallet. Only the first sign-in counts. */
export async function recordReferral(wallet: string, referrer: string) {
  if (!hasDb() || wallet === referrer) return;
  await redis("SET", k.ref(wallet), referrer, "NX");
}

/** Pays both sides once the invited wallet has a real floor. Safe to call any time. */
export async function settleReferral(wallet: string, floors: Floor[]) {
  if (!hasDb()) return;
  const referrer = await redis<string | null>("GET", k.ref(wallet));
  if (!referrer) return;
  if (!floors.some((f) => f.amount > 0 && (f.usd ?? 0) >= 0.5)) return;
  if (!(await redis("SET", k.refPaid(wallet), 1, "NX"))) return;
  await pipeline([
    ["INCRBY", k.extra(referrer), REFERRER_REWARD],
    ["INCRBY", k.extra(wallet), REFERRED_REWARD],
    ["INCR", k.refs(referrer)],
  ]);
}

export async function referrals(owner: string): Promise<Referrals> {
  const n = Number((await redis<string | null>("GET", k.refs(owner))) ?? 0);
  return { count: n, cash: n * REFERRER_REWARD };
}
