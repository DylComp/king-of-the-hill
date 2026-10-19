import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { coinView } from "@/lib/launch/fees";
import { isAddress } from "@/lib/launch/model";
import { coinCount, coinsFor, latestCoins } from "@/lib/launch/registry";

/** Coins launched here, newest first, or every coin launched for one wallet (?for=). */
export async function GET(req: Request) {
  const slow = await limited(req, "tokens");
  if (slow) return slow;
  const url = new URL(req.url);
  const forWallet = url.searchParams.get("for");
  const page = Math.max(0, Math.min(50, Number(url.searchParams.get("page")) || 0));
  try {
    if (forWallet && !isAddress(forWallet)) return json({ error: "not a solana address" }, 400);
    const coins = forWallet ? await coinsFor(forWallet) : await latestCoins(page * 30, 30);
    const [views, total] = await Promise.all([Promise.all(coins.map((c) => coinView(c))), coinCount()]);
    return json({ coins: views, total });
  } catch (e) {
    return fail(e, "tokens");
  }
}
