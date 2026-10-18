import { fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { hasDb } from "@/lib/redis";
import { markJoined } from "@/lib/store";

export async function GET() {
  if (!hasDb()) return json({ db: false, wallet: null });
  try {
    const wallet = await sessionWallet();
    // Sessions from before resident floors existed never stamped a move-in date; stamp it now (no-op if set).
    if (wallet) await markJoined(wallet);
    return json({ db: true, wallet });
  } catch (e) {
    return fail(e, "me");
  }
}
