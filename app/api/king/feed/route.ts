// pump.fun refuses requests from Vercel's servers, so dlao's worker reads pump.fun's public
// squad JSON and posts it here: GET says which paths to read, POST hands over the answers.
// Authorization: Bearer KING_FEED_SECRET (or CRON_SECRET).
import { timingSafeEqual } from "node:crypto";
import { fail, json } from "@/lib/api";
import { latestBoard } from "@/lib/king/engine";
import { BOARD_PATH, feedPath, membersPath, saveFeed } from "@/lib/king/source";
import { allSquadCoins } from "@/lib/king/store";

const MAX_BYTES = 2_000_000;

function authed(req: Request) {
  const secret = process.env.KING_FEED_SECRET || process.env.CRON_SECRET;
  const expected = secret ? Buffer.from(`Bearer ${secret}`) : null;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  return !!expected && actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** board: read every 5 minutes. members: squads without a coin yet, read hourly. */
export async function GET(req: Request) {
  if (!authed(req)) return json({ error: "Unauthorized" }, 401);
  try {
    const [board, coins] = await Promise.all([latestBoard(), allSquadCoins()]);
    const launched = new Set(coins.map((c) => c.groupId));
    const members = (board?.squads ?? [])
      .filter((s) => !launched.has(s.groupId) && !s.struck)
      .flatMap((s) => Array.from({ length: Math.min(4, Math.ceil(Math.max(1, s.members) / 50)) }, (_, i) => membersPath(s.groupId, i * 50)));
    return json({ api: "https://frontend-api-v3.pump.fun", board: [BOARD_PATH], members });
  } catch (e) {
    return fail(e, "king feed list");
  }
}

/** Body: { "feed": { "<path>": <pump.fun's JSON for that path>, ... } } */
export async function POST(req: Request) {
  if (!authed(req)) return json({ error: "Unauthorized" }, 401);
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "too big" }, 413);
    const feed = (JSON.parse(text) as { feed?: Record<string, unknown> }).feed;
    if (!feed || typeof feed !== "object") return json({ error: "send { feed: { path: json } }" }, 400);
    const saved: string[] = [];
    const skipped: string[] = [];
    for (const [path, data] of Object.entries(feed).slice(0, 500)) {
      const d = data as { leaderboard?: { entries?: unknown }; members?: unknown };
      const ok = feedPath(path) && (path === BOARD_PATH ? Array.isArray(d?.leaderboard?.entries) : Array.isArray(d?.members));
      if (!ok) {
        skipped.push(path);
        continue;
      }
      await saveFeed(path, data);
      saved.push(path);
    }
    return json({ saved: saved.length, skipped });
  } catch (e) {
    if (e instanceof SyntaxError) return json({ error: "bad json" }, 400);
    return fail(e, "king feed");
  }
}
