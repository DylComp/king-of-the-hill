import { NextResponse } from "next/server";
import { alert } from "./alert";
import { NoDb } from "./redis";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Public live data (token stats, fees, activity). The CDN holds each answer for a few seconds,
 * so however many people poll, the server and the APIs behind it see about one request per window.
 */
export const live = (body: unknown, fresh = 4) =>
  NextResponse.json(body, { headers: { "cache-control": `public, s-maxage=${fresh}, stale-while-revalidate=60` } });

export function fail(e: unknown, where: string) {
  if (e instanceof NoDb) return json({ error: "saving is offline right now" }, 503);
  if (!(e instanceof Error && e.message === "busy, try again")) void alert(where, e);
  return json({ error: e instanceof Error && e.message === "busy, try again" ? e.message : "something broke, try again" }, 500);
}

/**
 * JSON request body. Requiring a JSON content type means a cross-site form can't post here
 * (browsers preflight JSON), on top of the SameSite session cookie. Bodies over 16 KB are dropped.
 */
export async function body<T>(req: Request): Promise<Partial<T>> {
  if (!req.headers.get("content-type")?.includes("application/json")) return {};
  if (Number(req.headers.get("content-length") ?? 0) > 16_384) return {};
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}
