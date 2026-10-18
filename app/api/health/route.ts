import { json } from "@/lib/api";
import { recentErrors } from "@/lib/alert";
import { hasDb, redis } from "@/lib/redis";

export async function GET() {
  let db = false;
  if (hasDb()) db = (await redis("PING").catch(() => null)) === "PONG";
  const errors = db ? await recentErrors().catch(() => -1) : 0;
  return json({ ok: true, db, rpc: !!process.env.HELIUS_API_KEY, errorsLastHour: errors, alerts: !!process.env.ALERT_WEBHOOK_URL });
}
