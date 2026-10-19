import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { treasuryState } from "@/lib/launch/treasury";

/** Treasury balance, $PTWR burned so far, fees waiting across every launched coin, and recent buybacks. */
export async function GET(req: Request) {
  const slow = await limited(req, "treasury");
  if (slow) return slow;
  try {
    return json(await treasuryState());
  } catch (e) {
    return fail(e, "treasury");
  }
}
