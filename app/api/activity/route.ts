import { fail, live } from "@/lib/api";
import { limited } from "@/lib/limit";
import { treasuryTxs } from "@/lib/treasury";

/** The buy & burn wallet's latest transactions, labelled, for the /activity page. */
export async function GET(req: Request) {
  const slow = await limited(req, "tokens");
  if (slow) return slow;
  try {
    return live(await treasuryTxs());
  } catch (e) {
    return fail(e, "activity");
  }
}
