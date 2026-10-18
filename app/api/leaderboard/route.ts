import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { hasDb } from "@/lib/redis";
import { skyline, totalResidents } from "@/lib/store";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ db: false, rows: [], total: 0 });
  try {
    const [rows, total] = await Promise.all([skyline(25), totalResidents()]);
    return NextResponse.json({ db: true, rows, total }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch (e) {
    return fail(e, "leaderboard");
  }
}
