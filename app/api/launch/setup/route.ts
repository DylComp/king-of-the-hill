// One-time launchpad setup. Any signed-in wallet can open the launchpad: it signs the
// lookup-table transactions the server built (create, fill, freeze), then the table is
// recorded once it is on chain. The table is frozen, so its creator keeps no control.
import { body, fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { TREASURY_WALLET } from "@/lib/game";
import { limited } from "@/lib/limit";
import { confirmLookupTable, loadLookupTable, lookupTableSetup } from "@/lib/launch/alt";

const SIGN_IN = "Connect and sign in with any wallet to open the launchpad.";

export async function GET(req: Request) {
  const slow = await limited(req, "launch");
  if (slow) return slow;
  try {
    const w = await sessionWallet();
    if (!w) return json({ error: SIGN_IN }, 401);
    if (!TREASURY_WALLET) return json({ error: "Set the treasury wallet first." }, 400);
    // Already open: never build a second table.
    const live = await loadLookupTable().catch(() => null);
    if (live) return json({ existing: live.key.toBase58(), txs: [] });
    return json({ existing: null, ...(await lookupTableSetup(w, TREASURY_WALLET)) });
  } catch (e) {
    return fail(e, "launch setup");
  }
}

export async function POST(req: Request) {
  const slow = await limited(req, "launch");
  if (slow) return slow;
  try {
    const w = await sessionWallet();
    if (!w) return json({ error: SIGN_IN }, 401);
    await body(req);
    try {
      return json(await confirmLookupTable(w));
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  } catch (e) {
    return fail(e, "launch setup confirm");
  }
}
