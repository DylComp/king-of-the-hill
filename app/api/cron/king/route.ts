import { timingSafeEqual } from "node:crypto";
import { runKing } from "@/lib/king/engine";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET ? Buffer.from(`Bearer ${process.env.CRON_SECRET}`) : null;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (!expected || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await runKing()); }
  catch (e) {
    console.error("King clock failed", e instanceof Error ? e.message.slice(0, 200) : "Error");
    return Response.json({ error: "King clock failed; it retries on the next run" }, { status: 503 });
  }
}
