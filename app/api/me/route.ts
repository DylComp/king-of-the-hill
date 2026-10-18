import { fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { hasDb } from "@/lib/redis";
import { loadSave } from "@/lib/store";

export async function GET() {
  if (!hasDb()) return json({ db: false, wallet: null, save: null });
  try {
    const wallet = await sessionWallet();
    return json({ db: true, wallet, save: wallet ? await loadSave(wallet) : null });
  } catch (e) {
    return fail(e, "me");
  }
}
