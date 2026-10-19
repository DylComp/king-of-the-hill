// One-time launchpad setup, only for dlao's dev wallet: builds the lookup-table
// transactions for that wallet to sign, then records the table once it is on chain.
import { body, fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { DEV_WALLET, TREASURY_WALLET } from "@/lib/game";
import { confirmLookupTable, lookupTableAddress, lookupTableSetup } from "@/lib/launch/alt";

async function dev() {
  const w = await sessionWallet();
  return DEV_WALLET && w === DEV_WALLET ? w : null;
}

export async function GET() {
  try {
    const w = await dev();
    if (!w) return json({ error: "Only the Pump Tower dev wallet can set up the launchpad." }, 403);
    if (!TREASURY_WALLET) return json({ error: "Set the treasury wallet first." }, 400);
    const existing = await lookupTableAddress();
    return json({ existing, ...(await lookupTableSetup(w, TREASURY_WALLET)) });
  } catch (e) {
    return fail(e, "launch setup");
  }
}

export async function POST(req: Request) {
  try {
    const w = await dev();
    if (!w) return json({ error: "Only the Pump Tower dev wallet can set up the launchpad." }, 403);
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
