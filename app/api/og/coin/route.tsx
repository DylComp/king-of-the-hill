import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/lib/site";
import { fmtSol, fmtUsd } from "@/components/CoinCard";
import { limited } from "@/lib/limit";
import { coinView } from "@/lib/launch/fees";
import { marketCaps } from "@/lib/launch/market";
import { FEE_TIERS, FEE_TIER_NAMES, isAddress } from "@/lib/launch/model";
import { assetKeys, getCoin } from "@/lib/launch/registry";
import { getJson, hasDb } from "@/lib/redis";
import { shortAddr } from "@/lib/game";
import { font } from "@/lib/ogfont";

export const maxDuration = 60;

const TIER_COLOR = ["#8a8f9e", "#86efac", "#5eead4", "#fdba74", "#facc15", "#facc15"];

/** The share card for one launched coin: logo, who it pays, fees, market cap and its floor. */
export async function GET(req: Request) {
  const m = new URL(req.url).searchParams.get("m") ?? "";
  const c = isAddress(m) && hasDb() && !(await limited(req, "og")) ? await getCoin(m).catch(() => null) : null;
  const [v, caps, img] = c
    ? await Promise.all([
        coinView(c).catch(() => null),
        marketCaps([c.mint]).catch(() => ({}) as Record<string, number | null>),
        getJson<{ type: string; b64: string }>(assetKeys.image(c.mint)).catch(() => null),
      ])
    : [null, {} as Record<string, number | null>, null];
  // The renderer only reads PNG and JPEG reliably; anything else falls back to the ticker block.
  const logo = img && /^image\/(png|jpe?g)$/.test(img.type) ? `data:${img.type};base64,${img.b64}` : null;
  const tier = v?.tier ?? 0;
  const next = FEE_TIERS[tier + 1];
  const who = c ? (c.recipient.username ? `@${c.recipient.username}` : shortAddr(c.recipient.wallet)) : "";
  const [pixel, term] = await Promise.all([font("Press+Start+2P"), font("VT323")]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#08090b", color: "#e7e9ee", fontFamily: "Term", padding: 56, gap: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Pixel", fontSize: 22, color: "#86efac" }}>PUMP TOWER</div>
          <div style={{ fontSize: 30, color: "#8a8f9e" }}>{`launched on ${SITE_HOST}`}</div>
        </div>
        {c ? (
          <div style={{ display: "flex", gap: 44, flex: 1, alignItems: "center" }}>
            <div style={{ display: "flex", width: 300, height: 300, border: "6px solid #4ade80", background: "#16171d", alignItems: "center", justifyContent: "center", boxShadow: "0 0 60px rgba(74,222,128,0.25)" }}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} width={288} height={288} style={{ objectFit: "cover" }} alt="" />
              ) : (
                <div style={{ fontFamily: "Pixel", fontSize: 64, color: "#86efac" }}>{c.ticker.slice(0, 3).toUpperCase()}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
              <div style={{ fontFamily: "Pixel", fontSize: 52, color: "#86efac" }}>{`$${c.ticker.toUpperCase().slice(0, 10)}`}</div>
              <div style={{ fontSize: 44 }}>{c.name.slice(0, 32)}</div>
              <div style={{ fontSize: 36, color: "#8a8f9e" }}>{`80% of creator fees to ${who}`}</div>
              <div style={{ display: "flex", gap: 18, marginTop: 16 }}>
                {[
                  ["market cap", fmtUsd(caps[c.mint] ?? null)],
                  ["fees", `${fmtSol(v?.feesSol ?? 0)} SOL`],
                  ["floor", FEE_TIER_NAMES[tier]],
                ].map(([k, val]) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", flex: 1, background: "#101115", border: "3px solid #1f2a22", padding: "14px 18px" }}>
                    <span style={{ fontSize: 26, color: "#8a8f9e" }}>{k}</span>
                    <span style={{ fontSize: 38, color: k === "floor" ? TIER_COLOR[tier] : "#e7e9ee" }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 28, color: "#8a8f9e", marginTop: 10 }}>
                {next != null ? `next floor upgrade at ${next} SOL in fees · 20% goes to the treasury` : "top floor reached · 20% goes to the treasury"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1, alignItems: "center", fontFamily: "Pixel", fontSize: 40, lineHeight: 1.4 }}>launch a coin for any pump user</div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Pixel", data: await pixel, style: "normal" },
        { name: "Term", data: await term, style: "normal" },
      ],
      headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" },
    },
  );
}
