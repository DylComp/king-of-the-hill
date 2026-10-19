// Per-IP request caps, so a bot can't flood sign-in, buying or chain reads on launch day.
// Set well above what a real player does, since phone carriers and offices put many players
// behind one IP; outside APIs are protected by caching instead.
// Fixed one-minute windows counted in Redis. If Redis is down the request goes through:
// a broken limiter should never lock real players out.
import { json } from "./api";
import { hasDb, pipeline } from "./redis";

/** Requests allowed per IP per minute, by route. */
export const LIMITS = {
  report: 20,
  nonce: 30,
  verify: 30,
  buy: 120,
  remove: 120,
  checkin: 20,
  tower: 180,
  fresh: 30,
  save: 180,
  og: 60,
  profile: 240,
  names: 600,
  asset: 30,
  launch: 40,
  /** The launch page polls this every couple of seconds while a launch lands. */
  confirm: 300,
  tokens: 300,
  collect: 30,
  quests: 180,
} as const;

export type LimitName = keyof typeof LIMITS;

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Returns a 429 response when this IP is over the cap for `name`, otherwise null. */
export async function limited(req: Request, name: LimitName): Promise<Response | null> {
  if (!hasDb()) return null;
  const window = Math.floor(Date.now() / 60_000);
  const key = `pt:rl:${name}:${clientIp(req)}:${window}`;
  try {
    const [, count] = await pipeline([
      ["SET", key, 0, "EX", 90, "NX"],
      ["INCR", key],
    ]);
    if (Number(count) <= LIMITS[name]) return null;
    const res = json({ error: "slow down a little, try again in a minute" }, 429);
    res.headers.set("retry-after", String(60 - (Math.floor(Date.now() / 1000) % 60)));
    return res;
  } catch (e) {
    console.error("limit", e);
    return null;
  }
}
