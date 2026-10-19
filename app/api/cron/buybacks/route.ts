import { timingSafeEqual } from "node:crypto";
import { runBuybacks } from "@/lib/buyback/worker";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET ? Buffer.from(`Bearer ${process.env.CRON_SECRET}`) : null;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (!expected || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await runBuybacks()); }
  catch (e) {
    // Do not log provider URLs, environment values, or signed transaction bytes.
    console.error("Buyback worker failed", e instanceof Error ? e.name : "Error");
    return Response.json({ error: "Buyback worker halted; inspect ledger and RPC before retrying" }, { status: 503 });
  }
}
