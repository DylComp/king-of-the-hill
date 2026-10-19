// Token metadata (name, image, links) that pump.fun, wallets and explorers read.
import { isAddress } from "@/lib/launch/model";
import { assetKeys } from "@/lib/launch/registry";
import { hasDb, redis } from "@/lib/redis";

export async function GET(_req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isAddress(mint) || !hasDb()) return new Response("not found", { status: 404 });
  const meta = await redis<string | null>("GET", assetKeys.meta(mint)).catch(() => null);
  if (!meta) return new Response("not found", { status: 404 });
  return new Response(meta, {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=60, s-maxage=3600", "access-control-allow-origin": "*" },
  });
}
