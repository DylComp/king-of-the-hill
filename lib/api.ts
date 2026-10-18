import { NextResponse } from "next/server";
import { alert } from "./alert";
import { NoDb } from "./redis";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export function fail(e: unknown, where: string) {
  if (e instanceof NoDb) return json({ error: "saving is offline right now" }, 503);
  if (!(e instanceof Error && e.message === "busy, try again")) void alert(where, e);
  return json({ error: e instanceof Error && e.message === "busy, try again" ? e.message : "something broke, try again" }, 500);
}

export async function body<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}
