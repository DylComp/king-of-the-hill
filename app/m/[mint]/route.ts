// Token metadata (name, image, links) that pump.fun, wallets and explorers read.
import { canonicalSiteUrl } from "@/lib/site";
import { isAddress } from "@/lib/launch/model";
import { assetKeys } from "@/lib/launch/registry";
import { hasDb, redis } from "@/lib/redis";

export async function GET(_req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isAddress(mint) || !hasDb()) return new Response("not found", { status: 404 });
  const meta = await redis<string | null>("GET", assetKeys.meta(mint)).catch(() => null);
  if (!meta) return new Response("not found", { status: 404 });
  const data = JSON.parse(meta);
  data.description = "Historical token retired from the King of the Hill competition. The project now uses one official KING token. This retired squad token has no rewards or payout eligibility in the single-KING system.";
  for (const field of ["image", "website", "external_url", "createdOn"]) {
    if (field in data) data[field] = canonicalSiteUrl(data[field]);
  }
  if (data.extensions?.website) data.extensions.website = canonicalSiteUrl(data.extensions.website);
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=60, s-maxage=3600", "access-control-allow-origin": "*" },
  });
}
