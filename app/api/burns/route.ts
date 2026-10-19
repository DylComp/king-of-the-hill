import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { burns } from "@/lib/burns";

/** Every $PTWR bought back and burned so far, plus the latest buybacks. */
export async function GET() {
  try {
    return NextResponse.json(await burns(), { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return fail(e, "burns");
  }
}
