// Per-IP request caps, so a bot can't flood sign-in, buying or chain reads on launch day.
// Fixed one-minute windows counted in Redis. If Redis is down the request goes through:
// a broken limiter should never lock real players out.
import { json } from "./api";
import { hasDb, pipeline } from "./redis";

/** Requests allowed per IP per minute, by route. */
export const LIMITS = {
  report: 10,
  nonce: 20,
  verify: 20,
  buy: 60,
  remove: 60,
  checkin: 10,
  tower: 60,
  fresh: 10,
  save: 90,
  og: 30,
  profile: 60,
  names: 120,
  /** Launch steps. Generous, since a phone network can put many people behind one IP and a retry must never be refused. */
  asset: 30,
  launch: 40,
  send: 60,
  /** The launch page polls this every couple of seconds while a launch lands. */
  confirm: 180,
  /** Live stats pages poll every few seconds; the CDN answers most of these before they get here. */
  tokens: 300,
  collect: 10,
  quests: 90,
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
