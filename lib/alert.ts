// Error alerts. Every server error is logged; if ALERT_WEBHOOK_URL is set (a Discord or Slack
// incoming webhook), the first of each kind in a 10 minute window is also posted there.
// Recent errors are counted in Redis so /api/health can show them.
import { hasDb, pipeline, redis } from "./redis";

const QUIET_SEC = 600;
const RECENT = "pt:errors";

export async function alert(where: string, e: unknown) {
  const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
  console.error(where, e);
  if (!hasDb()) return;
  try {
    const kind = `${where}:${msg.slice(0, 60)}`;
    const [, , first] = await pipeline([
      ["LPUSH", RECENT, JSON.stringify({ at: Date.now(), where, msg })],
      ["LTRIM", RECENT, 0, 49],
      ["SET", `pt:alerted:${kind}`, 1, "EX", QUIET_SEC, "NX"],
    ]);
    const hook = process.env.ALERT_WEBHOOK_URL;
    if (first === "OK" && hook) {
      const text = `pump tower error in ${where}: ${msg}`;
      await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Discord reads `content`, Slack reads `text`.
        body: JSON.stringify({ content: text, text }),
      });
    }
  } catch (err) {
    console.error("alert", err);
  }
}

/** Errors in the last hour, for the health check. */
export async function recentErrors(): Promise<number> {
  if (!hasDb()) return 0;
  const rows = await redis<string[]>("LRANGE", RECENT, 0, 49);
  const since = Date.now() - 3600_000;
  return rows.filter((r) => {
    try {
      return (JSON.parse(r) as { at: number }).at > since;
    } catch {
      return false;
    }
  }).length;
}
