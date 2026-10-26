// The payout list. Anyone can read it and check the math; the treasury workers send what it
// says and then mark the hour paid with their signatures. Nothing here holds or moves SOL.
import { timingSafeEqual } from "node:crypto";
import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { recentReigns, reign, saveReign } from "@/lib/king/store";

export async function GET(req: Request) {
  const slow = await limited(req, "king");
  if (slow) return slow;
  try {
    const url = new URL(req.url);
    const hour = url.searchParams.get("hour");
    if (hour) return json({ reign: await reign(hour) });
    const all = await recentReigns(Math.min(500, Number(url.searchParams.get("count")) || 48));
    return json({ reigns: url.searchParams.get("status") === "pending" ? all.filter((r) => r.status === "pending") : all });
  } catch (e) {
    return fail(e, "king payouts");
  }
}

/** Workers mark an hour paid: Authorization: Bearer KING_PAYER_SECRET (or CRON_SECRET). */
export async function POST(req: Request) {
  const secret = process.env.KING_PAYER_SECRET || process.env.CRON_SECRET;
  const expected = secret ? Buffer.from(`Bearer ${secret}`) : null;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (!expected || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return json({ error: "Unauthorized" }, 401);
  try {
    const b = await body<{ hour: string; signatures: string[] }>(req);
    const r = typeof b.hour === "string" ? await reign(b.hour) : null;
    if (!r) return json({ error: "no such hour" }, 404);
    const sigs = Array.isArray(b.signatures) ? b.signatures.filter((s) => typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{60,90}$/.test(s)).slice(0, 300) : [];
    if (!sigs.length) return json({ error: "send the payout signatures" }, 400);
    await saveReign({ ...r, status: "paid", paidSignatures: [...new Set([...(r.paidSignatures ?? []), ...sigs])] });
    return json({ ok: true });
  } catch (e) {
    return fail(e, "king paid");
  }
}
