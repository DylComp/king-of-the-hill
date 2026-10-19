import { fail, live } from "@/lib/api";
import { limited } from "@/lib/limit";
import { feesRouted } from "@/lib/launch/routed";

/** Where every creator fee has gone: to pump users, to the treasury, into $PTWR buybacks and burns. */
export async function GET(req: Request) {
  const slow = await limited(req, "tokens");
  if (slow) return slow;
  try {
    return live(await feesRouted());
  } catch (e) {
    return fail(e, "fees");
  }
}
