import { randomUUID } from "node:crypto";
import { redis } from "../redis";
import type { BuybackAttempt } from "./buyback-model.ts";

export type Collection = { signature: string; signed: string; lastValidBlockHeight: number; mint: string };
export type State = {
  mint: string; credit: string; debit: string; burned: string;
  day: string; dailyDebit: string;
  pending: BuybackAttempt | null; collection: Collection | null;
  scan: { until?: string; before?: string; head?: string };
  coinOffset: number; lastOutcome: string; updatedAt: number;
  lastBuyback?: { signature: string; slot: number; debit: string; burned: string; success: boolean };
};
export async function openStore(mint: string, namespace: "buyback" | "profile-fees" = "buyback") {
  const KEY = `pt:${namespace}:v1`, LOCK = `${KEY}:lock`;
  const lease = randomUUID();
  if (await redis("SET", LOCK, lease, "NX", "EX", 180) !== "OK") return null;
  let expected = await redis<string | null>("GET", KEY);
  const state: State = expected ? JSON.parse(expected) : {
    mint, credit: "0", debit: "0", burned: "0", day: "", dailyDebit: "0", pending: null,
    collection: null, scan: {}, coinOffset: 0, lastOutcome: "new", updatedAt: Date.now(),
  };
  // Never reuse the prior coin's revenue or attempts for a changed destination mint.
  if (state.mint !== mint) {
    await redis("EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, LOCK, lease);
    throw Error("Official mint differs from the pinned ledger mint");
  }
  return {
    state,
    async save(receipt?: string) {
      state.updatedAt = Date.now();
      const next = JSON.stringify(state);
      const ok = await redis<number>("EVAL", `
        if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
        if (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end
        if ARGV[4]~='' and redis.call('EXISTS',KEYS[3])==1 then return 0 end
        redis.call('SET',KEYS[2],ARGV[3])
        if ARGV[4]~='' then redis.call('SET',KEYS[3],ARGV[4]) end
        return 1`, 3, LOCK, KEY, `${KEY}:receipt:${receipt ?? "unused"}`, lease, expected ?? "", next, receipt ?? "");
      if (ok !== 1) throw Error("Buyback ledger lease or revision lost");
      expected = next;
    },
    async seen(id: string) { return !!await redis("EXISTS", `${KEY}:receipt:${id}`); },
    async maySend() {
      if (await redis<string | null>("GET", LOCK) !== lease ||
          await redis<string | null>("GET", KEY) !== expected) throw Error("Buyback lease lost before send");
    },
    async close() {
      await redis("EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, LOCK, lease);
    },
  };
}
export type Store = NonNullable<Awaited<ReturnType<typeof openStore>>>;
