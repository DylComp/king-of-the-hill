import { isAddress } from "@/lib/launch/model";
import { assetKeys } from "@/lib/launch/registry";
import { getJson, hasDb } from "@/lib/redis";

export async function GET(_req: Request, ctx: { params: Promise<{ mint: string }> }) {
  const { mint } = await ctx.params;
  if (!isAddress(mint) || !hasDb()) return new Response("not found", { status: 404 });
  const img = await getJson<{ type: string; b64: string }>(assetKeys.image(mint)).catch(() => null);
  if (!img) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(img.b64, "base64"), {
    headers: {
      "content-type": img.type,
      "cache-control": "public, max-age=300, s-maxage=86400",
      "content-security-policy": "default-src 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}
