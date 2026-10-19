import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/lib/site";
import { isAddress } from "@/lib/chain";
import { limited } from "@/lib/limit";
import { type Floor, LOBBY_MINT, TIERS, citizensFor, daysHeld, shortAddr, tierFor, towerRate, fmtCash } from "@/lib/game";
import { towerFor } from "@/lib/store";
import { font } from "@/lib/ogfont";

export const maxDuration = 60;

const WALL = ["#24262d", "#30343e", "#3d3530", "#4a3328", "#173322", "#3a3014"];
const TRIM = ["#3a3d46", "#4b5060", "#6b5a4a", "#8a5a3e", "#4ade80", "#facc15"];
const SHOW = 8;

export async function GET(req: Request) {
  const w = new URL(req.url).searchParams.get("w") ?? "";
  let floors: Floor[] = [];
  // Over the cap the card still renders, just without a chain read.
  if (isAddress(w) && !(await limited(req, "og"))) floors = await towerFor(w, { stale: true }).catch(() => []);
  const now = Date.now();
  const sorted = [...floors].sort((a, b) => (a.heldSince ?? Infinity) - (b.heldSince ?? Infinity));
  const citizens = sorted.reduce((n, f) => n + citizensFor(tierFor(f.heldSince, now)), 0);
  const longest = sorted[0] ? Math.floor(daysHeld(sorted[0].heldSince, now)) : 0;
  const shown = sorted.slice(0, SHOW);
  const [pixel, term] = await Promise.all([font("Press+Start+2P"), font("VT323")]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#08090b", color: "#e7e9ee", fontFamily: "Term", padding: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "Pixel", fontSize: 22, color: "#86efac" }}>PUMP TOWER</div>
            <div style={{ fontFamily: "Pixel", fontSize: 40, lineHeight: 1.3 }}>{w && isAddress(w) ? `${shortAddr(w)}'s tower` : "your bags are a building"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 40 }}>
            {[
              ["floors", String(sorted.length)],
              ["citizens", String(citizens)],
              ["rent", `$${fmtCash(towerRate(sorted, now))}/hr`],
              ["longest hold", `${longest} days`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 16 }}>
                <span style={{ color: "#8a8f9e", width: 240 }}>{k}</span>
                <span style={{ color: "#86efac" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 30, color: "#8a8f9e" }}>{`hold longer, live higher · ${SITE_HOST}`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 420, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", width: 360, height: 46, background: "#16171d", border: "3px solid #2a2c33", alignItems: "center", justifyContent: "center", fontFamily: "Pixel", fontSize: 16, color: "#4ade80" }}>
            PUMP TOWER
          </div>
          {sorted.length > SHOW && (
            <div style={{ display: "flex", width: 400, height: 30, background: "#16171d", justifyContent: "center", alignItems: "center", fontSize: 24, color: "#8a8f9e" }}>
              {`+${sorted.length - SHOW} more floors`}
            </div>
          )}
          {shown.length ? (
            shown.map((f) => {
              const t = tierFor(f.heldSince, now);
              return (
                <div
                  key={f.mint}
                  style={{
                    display: "flex",
                    width: 400,
                    height: 52,
                    background: WALL[t],
                    ...(f.isHouse ? { border: "3px solid #4ade80" } : { borderTop: `3px solid ${TRIM[t]}` }),
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontFamily: "Pixel", fontSize: 14, color: f.isHouse ? "#4ade80" : "#e7e9ee" }}>
                    {`${f.mint === LOBBY_MINT ? "" : "$"}${f.symbol.toUpperCase().slice(0, 9)}`}
                  </span>
                  <span style={{ fontSize: 26, color: TRIM[t] === "#3a3d46" ? "#8a8f9e" : TRIM[t] }}>{TIERS[t].name}</span>
                </div>
              );
            })
          ) : (
            <div style={{ display: "flex", width: 400, height: 140, background: "#16171d", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#8a8f9e" }}>
              empty lot
            </div>
          )}
          <div style={{ display: "flex", width: 440, height: 24, background: "#2a2c33" }} />
        </div>
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
