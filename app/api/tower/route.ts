import { NextResponse } from "next/server";
import { buildTower, isAddress } from "@/lib/chain";

export const maxDuration = 60;

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner")?.trim() ?? "";
  if (!isAddress(owner)) return NextResponse.json({ error: "not a solana address" }, { status: 400 });
  try {
    const floors = await buildTower(owner);
    return NextResponse.json(
      { owner, floors, at: Date.now() },
      { headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch (e) {
    console.error("tower", owner, e);
    return NextResponse.json({ error: "could not read this wallet right now, try again" }, { status: 502 });
  }
}
