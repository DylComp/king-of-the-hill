// Adds a landed buyback to the burn history. It is read back off chain first, so a report
// only counts if the treasury really signed it and it really burned $PTWR.
import { body, fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { recordBurn } from "@/lib/launch/treasury";

export async function POST(req: Request) {
  const slow = await limited(req, "buyback");
  if (slow) return slow;
  try {
    const { signature } = await body<{ signature: string }>(req);
    if (typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return json({ error: "bad signature" }, 400);
    const burn = await recordBurn(signature);
    return burn ? json({ burn }) : json({ error: "not confirmed yet" }, 404);
  } catch (e) {
    return fail(e, "burns");
  }
}
