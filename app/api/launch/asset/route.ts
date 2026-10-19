// Stores a coin's image before launch. The browser has already generated the mint
// address, so the image is filed under it and served from /i/<mint>.
import { fail, json } from "@/lib/api";
import { sessionWallet } from "@/lib/auth";
import { limited } from "@/lib/limit";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, isAddress } from "@/lib/launch/model";
import { DRAFT_TTL, assetKeys, getCoin } from "@/lib/launch/registry";
import { redis } from "@/lib/redis";
import { SITE_URL } from "@/lib/site";

export async function POST(req: Request) {
  const slow = await limited(req, "asset");
  if (slow) return slow;
  try {
    const wallet = await sessionWallet();
    if (!wallet) return json({ error: "sign in first" }, 401);
    if (!req.headers.get("content-type")?.includes("application/json") || Number(req.headers.get("content-length") ?? 0) > 700_000) return json({ error: "Image is too big." }, 413);
    const { mint, image } = (await req.json().catch(() => ({}))) as { mint?: unknown; image?: unknown };
    if (!isAddress(mint) || typeof image !== "string") return json({ error: "bad request" }, 400);
    const m = image.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!m || !(IMAGE_TYPES as readonly string[]).includes(m[1])) return json({ error: "Use a PNG, JPG, GIF or WebP image." }, 400);
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "Image must be 400 KB or smaller." }, 413);
    const magic = bytes.subarray(0, 12).toString("hex");
    const real = magic.startsWith("89504e47") || magic.startsWith("ffd8ff") || magic.startsWith("47494638") || (magic.startsWith("52494646") && magic.slice(16, 24) === "57454250");
    if (!real) return json({ error: "That file isn't an image." }, 400);
    if (await getCoin(mint)) return json({ error: "That coin already launched." }, 409);
    // Only the wallet that uploaded first can replace a draft image.
    const owner = await redis<string | null>("GET", `${assetKeys.image(mint)}:by`);
    if (owner && owner !== wallet) return json({ error: "Start over for a fresh coin." }, 409);
    await redis("SET", `${assetKeys.image(mint)}:by`, wallet, "EX", DRAFT_TTL);
    await redis("SET", assetKeys.image(mint), JSON.stringify({ type: m[1], b64: m[2] }), "EX", DRAFT_TTL);
    return json({ image: `${SITE_URL}/i/${mint}` });
  } catch (e) {
    return fail(e, "launch asset");
  }
}
