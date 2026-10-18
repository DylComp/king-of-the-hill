import { json } from "@/lib/api";
import { hasDb, redis } from "@/lib/redis";

export async function GET() {
  let db = false;
  if (hasDb()) db = (await redis("PING").catch(() => null)) === "PONG";
  return json({ ok: true, db, rpc: !!process.env.HELIUS_API_KEY });
}
