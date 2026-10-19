// A pump.fun profile picture, served through our CDN. Pump's image hosts rate limit busy
// pages; this way each picture is fetched once a day per region and then served from cache.
import { isAddress } from "@/lib/launch/model";
import { findProfile } from "@/lib/launch/profile";

const MAX_BYTES = 2_000_000;
const notFound = () => new Response("not found", { status: 404, headers: { "cache-control": "public, s-maxage=600" } });

export async function GET(_req: Request, ctx: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await ctx.params;
  if (!isAddress(wallet)) return notFound();
  const profile = await findProfile(wallet).catch(() => null);
  if (!profile?.image) return notFound();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(profile.image, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (res?.ok) {
      const type = res.headers.get("content-type") ?? "";
      // Raster images only: no SVG, no HTML passed off as a picture.
      if (!/^image\/(png|jpe?g|gif|webp|avif)/i.test(type)) return notFound();
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) return notFound();
      return new Response(buf, {
        headers: {
          "content-type": type,
          "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          "content-security-policy": "default-src 'none'",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (res && res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  // Busy upstream: a short-lived miss, so the page shows initials and tries again soon.
  return new Response("busy", { status: 503, headers: { "cache-control": "public, s-maxage=60" } });
}
