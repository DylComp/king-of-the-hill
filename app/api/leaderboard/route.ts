import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { seasonEnds, seasonOf } from "@/lib/game";
import { hasDb } from "@/lib/redis";
import { seasonBoard, skyline, totalResidents } from "@/lib/store";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ db: false, rows: [], total: 0 });
  try {
    const season = seasonOf();
    const [rows, total, week] = await Promise.all([skyline(25), totalResidents(), seasonBoard(season)]);
    return NextResponse.json(
      { db: true, rows, total, season: { n: season, ends: seasonEnds(season), ...week } },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch (e) {
    return fail(e, "leaderboard");
  }
}
