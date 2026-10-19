import { randomUUID } from "node:crypto";
import { redis } from "../redis";
import type { Pending, collectionReceipt } from "./model.ts";
type State = { mint: string; dev: string; pending: Pending | null; nextLeg: "curve" | "amm"; totalNetLamports: string; day: string; dailyNetworkFees: string; lastReceipt?: ReturnType<typeof collectionReceipt>; updatedAt: number };
const KEY = "pt:dev-fees:v1", LOCK = `${KEY}:lock`;
export async function openDevFeeStore(mint: string, dev: string) {
  const lease = randomUUID();
  if (await redis("SET", LOCK, lease, "NX", "EX", 180) !== "OK") return null;
  let expected = await redis<string | null>("GET", KEY);
  const close = () => redis("EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, LOCK, lease);
  const state: State = expected ? JSON.parse(expected) : { mint, dev, pending: null, nextLeg: "curve", totalNetLamports: "0", day: "", dailyNetworkFees: "0", updatedAt: Date.now() };
  if (state.mint !== mint || state.dev !== dev) { await close(); throw Error("Dev collection identity differs from pinned configuration"); }
  return {
    state, close,
    async save() {
      state.updatedAt = Date.now();
      const next = JSON.stringify(state);
      const ok = await redis<number>("EVAL", "if redis.call('GET',KEYS[1])~=ARGV[1] or (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end redis.call('SET',KEYS[2],ARGV[3]) return 1", 2, LOCK, KEY, lease, expected ?? "", next);
      if (ok !== 1) throw Error("Dev collection lease lost");
      expected = next;
    },
    async maySend() {
      if (await redis("GET", LOCK) !== lease || await redis("GET", KEY) !== expected) throw Error("Dev collection lease lost before send");
    },
  };
}
