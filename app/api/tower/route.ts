import { NextResponse } from "next/server";
import { isAddress } from "@/lib/chain";
import { limited } from "@/lib/limit";
import { towerFor } from "@/lib/store";
import { alert } from "@/lib/alert";

export const maxDuration = 60;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const owner = params.get("owner")?.trim() ?? "";
  if (!isAddress(owner)) return NextResponse.json({ error: "not a solana address" }, { status: 400 });
  const slow = await limited(req, params.has("fresh") ? "fresh" : "tower");
  if (slow) return slow;
  try {
    const floors = await towerFor(owner, { fresh: params.has("fresh"), stale: true });
    return NextResponse.json(
      { owner, floors, at: Date.now() },
      // Redis caches the chain read; skipping the CDN means every visit lands on the skyline.
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    await alert("tower", e);
    return NextResponse.json({ error: "could not read this wallet right now, try again" }, { status: 502 });
  }
}
