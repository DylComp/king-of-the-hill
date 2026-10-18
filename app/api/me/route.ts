import { fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { hasDb } from "@/lib/redis";

export async function GET() {
  if (!hasDb()) return json({ db: false, wallet: null });
  try {
    return json({ db: true, wallet: await sessionWallet() });
  } catch (e) {
    return fail(e, "me");
  }
}
