// Pump.fun names and pictures for a batch of wallets, so towers show who owns them.
// Wallets with no pump profile are left out and keep their short address.
import { NextResponse } from "next/server";
import { fail, json } from "@/lib/api";
import { limited } from "@/lib/limit";
import { isAddress } from "@/lib/launch/model";
import { findProfile } from "@/lib/launch/profile";

export async function GET(req: Request) {
  const wallets = [...new Set((new URL(req.url).searchParams.get("w") ?? "").split(",").filter(isAddress))].slice(0, 40);
  if (!wallets.length) return json({ names: {} });
  const slow = await limited(req, "names");
  if (slow) return slow;
  try {
    const found = await Promise.all(wallets.map((w) => findProfile(w).catch(() => null)));
    const names: Record<string, { username: string; image: string | null }> = {};
    found.forEach((p, i) => {
      if (p?.username) names[wallets[i]] = { username: p.username, image: p.image };
    });
    return NextResponse.json({ names }, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (e) {
    return fail(e, "pump names");
  }
}
