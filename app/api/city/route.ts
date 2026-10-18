import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { hasDb } from "@/lib/redis";
import { city, totalResidents } from "@/lib/store";

/** Every ranked tower and its floors, drawn as the city skyline. */
export async function GET() {
  if (!hasDb()) return NextResponse.json({ db: false, towers: [], total: 0 });
  try {
    const [towers, total] = await Promise.all([city(80), totalResidents()]);
    return NextResponse.json({ db: true, towers, total }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return fail(e, "city");
  }
}
