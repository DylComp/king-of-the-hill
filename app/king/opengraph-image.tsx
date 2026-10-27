// King of the Hill's share card: the crowned pill on its squad hill, and the one-line pitch.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { font } from "@/lib/ogfont";
import { SITE_HOST } from "@/lib/site";

export const alt = "King of the Hill: all squads compete for the hourly crown";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [pixel, term, logo] = await Promise.all([font("Press+Start+2P"), font("VT323"), readFile(join(process.cwd(), "public/king-logo.png"))]);
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#08090b", color: "#e7e9ee", fontFamily: "Term", padding: 56, alignItems: "center", gap: 48 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={432} height={432} style={{ imageRendering: "pixelated" }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 26 }}>
          <div style={{ fontFamily: "Pixel", fontSize: 20, color: "#86efac" }}>SQUAD INVITATIONAL</div>
          <div style={{ fontFamily: "Pixel", fontSize: 46, lineHeight: 1.25, color: "#ffd43b" }}>KING OF THE HILL</div>
          <div style={{ fontSize: 44, lineHeight: 1.1 }}>All squads. One crown. Live standings and hourly trading results.</div>
          <div style={{ fontSize: 32, color: "#8a8f9e" }}>{`${SITE_HOST}/king`}</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Pixel", data: pixel }, { name: "Term", data: term }] },
  );
}
