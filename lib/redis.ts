// Minimal Upstash Redis REST client (works with the Vercel Marketplace integration's env names).
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const hasDb = () => !!(URL_() && TOKEN());

export class NoDb extends Error {
  constructor() {
    super("database not connected");
  }
}

type Arg = string | number;

export async function redis<T = unknown>(...cmd: Arg[]): Promise<T> {
  if (!hasDb()) throw new NoDb();
  const res = await fetch(URL_(), {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN()}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(`redis ${cmd[0]}: ${json.error}`);
  return json.result as T;
}

export async function pipeline(cmds: Arg[][]): Promise<unknown[]> {
  if (!hasDb()) throw new NoDb();
  const res = await fetch(`${URL_()}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN()}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown; error?: string }[];
  return json.map((r) => {
    if (r.error) throw new Error(`redis: ${r.error}`);
    return r.result;
  });
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis<string | null>("GET", key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setJson(key: string, value: unknown, ttlSec?: number) {
  const args: Arg[] = ["SET", key, JSON.stringify(value)];
  if (ttlSec) args.push("EX", ttlSec);
  await redis(...args);
}
