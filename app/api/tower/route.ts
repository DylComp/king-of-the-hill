import { NextResponse } from "next/server";
import { isAddress } from "@/lib/chain";
import { towerFor } from "@/lib/store";

export const maxDuration = 60;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const owner = params.get("owner")?.trim() ?? "";
  if (!isAddress(owner)) return NextResponse.json({ error: "not a solana address" }, { status: 400 });
  try {
    const floors = await towerFor(owner, params.has("fresh"));
    return NextResponse.json(
      { owner, floors, at: Date.now() },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (e) {
    console.error("tower", owner, e);
    return NextResponse.json({ error: "could not read this wallet right now, try again" }, { status: 502 });
  }
}
