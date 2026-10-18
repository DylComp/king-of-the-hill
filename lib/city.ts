// The city: every ranked tower drawn side by side as a skyline. Each lit band is
// a floor, coloured by its tier; $PTWR floors glow green and penthouses gold.
import { GOLD, GREEN, GREEN_HI, box, glow, rect, rng, shade, tiny, tinyWidth } from "./pixel";

export type CityTower = {
  wallet: string;
  top: string;
  floors: number;
  rate: number;
  house: boolean;
  tiers: number[];
  houses: number[];
};

const BW = 30; // building width
const GAP = 8;
const FH = 5; // floor height
const MAX_FLOORS = 40;
const PAD = 14;
const SKY = 46; // room above the tallest roof for signs and antennas
const STREET = 22;

const WINDOW = ["#3f3f46", "#fde68a", "#fdba74", "#5eead4", "#86efac", GOLD];
const FACADES = ["#1d2028", "#22202a", "#1b2420", "#26201c", "#1c2230", "#24242a"];

export const cityHeight = (towers: CityTower[]) => SKY + Math.min(MAX_FLOORS, Math.max(4, ...towers.map((t) => t.floors))) * FH + 12 + STREET;
export const cityWidth = (towers: CityTower[]) => PAD * 2 + Math.max(towers.length, 6) * (BW + GAP) - GAP;

/** Rank 1 stands in the middle and the rest fan out either side, so the skyline peaks. */
export function arrange<T>(xs: T[]): T[] {
  const out: T[] = [];
  xs.forEach((x, i) => (i % 2 ? out.push(x) : out.unshift(x)));
  return out;
}

export function buildingAt(x: number, n: number): number | null {
  const i = Math.floor((x - PAD) / (BW + GAP));
  if (i < 0 || i >= n) return null;
  return x - PAD - i * (BW + GAP) <= BW ? i : null;
}

export function drawCity(ctx: CanvasRenderingContext2D, towers: CityTower[], rank: Map<string, number>, t: number, o: { me: string | null; hover: number | null }) {
  const W = cityWidth(towers);
  const H = cityHeight(towers);
  const ground = H - STREET;
  ctx.imageSmoothingEnabled = false;

  // sky, stars, far city
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#04050a");
  g.addColorStop(0.7, "#08100c");
  g.addColorStop(1, "#0d1a14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = rng("city-stars");
  for (let i = 0; i < W / 4; i++) {
    const sx = Math.floor(r() * W);
    const sy = Math.floor(r() * (H * 0.5));
    rect(ctx, sx, sy, 1, 1, Math.sin(t / 800 + i) > 0.75 ? "#ffffff" : "#3f4652");
  }
  const far = rng("city-far");
  for (let x = 0; x < W; ) {
    const w = 10 + Math.floor(far() * 18);
    const h = 20 + Math.floor(far() * 50);
    rect(ctx, x, ground - h, w, h, "#09100d");
    x += w + 1;
  }

  towers.forEach((tw, i) => {
    const x = PAD + i * (BW + GAP);
    const shown = Math.min(MAX_FLOORS, tw.floors);
    const top = ground - shown * FH - 6;
    const br = rng(tw.wallet);
    const facade = FACADES[Math.floor(br() * FACADES.length)];
    const mine = tw.wallet === o.me;
    const hot = o.hover === i;

    // body and roof
    box(ctx, x, top, BW, ground - top, hot ? shade(facade, 0.15) : facade);
    rect(ctx, x - 1, top - 2, BW + 2, 3, shade(facade, 0.25));
    // floors, oldest hold at the top like the real tower
    for (let f = 0; f < shown; f++) {
      const tier = tw.tiers[f] ?? 0;
      const house = tw.houses[f] === 1;
      const fy = top + 4 + f * FH;
      const col = house ? GREEN_HI : WINDOW[tier];
      for (let wx = 0; wx < 6; wx++) {
        const lit = tier > 0 || house || Math.sin(t / 1500 + f * 3 + wx * 7 + i) > 0.2;
        const flick = Math.sin(t / 2300 + f * 11 + wx * 5 + i * 3) > 0.985;
        rect(ctx, x + 3 + wx * 4, fy, 3, 3, lit && !flick ? col : "#14161c");
      }
      if (house) glow(ctx, x + BW / 2, fy + 1, 18, GREEN_HI, 0.05);
    }
    if (tw.floors > MAX_FLOORS) tiny(ctx, "+", x + BW - 5, top + 3, "#94a3b8");

    // rooftop: sign with the top floor's coin, antenna on the podium
    const label = tw.top === "RESIDENT" ? "HOME" : `$${tw.top.toUpperCase()}`.slice(0, 7);
    const lw = tinyWidth(label) + 4;
    const sx = Math.round(x + BW / 2 - lw / 2);
    rect(ctx, sx, top - 11, lw, 8, "#0b0b10");
    rect(ctx, sx + 2, top - 3, 1, 2, "#27272a");
    rect(ctx, sx + lw - 3, top - 3, 1, 2, "#27272a");
    tiny(ctx, label, sx + 2, top - 10, tw.house ? GREEN : tw.tiers[0] === 5 ? GOLD : "#e2e8f0");
    const rk = rank.get(tw.wallet) ?? 99;
    if (rk <= 3) {
      const ax = x + BW / 2;
      rect(ctx, ax, top - 24, 1, 12, "#4b5563");
      const on = Math.floor(t / 500 + i) % 2 === 0;
      const c = rk === 1 ? GOLD : rk === 2 ? "#e5e7eb" : "#d97706";
      rect(ctx, ax - 1, top - 26, 3, 2, on ? c : shade(c, -0.6));
      if (on) glow(ctx, ax, top - 25, 9, c, 0.3);
      const place = ["1ST", "2ND", "3RD"][rk - 1];
      tiny(ctx, place, ax - Math.floor(tinyWidth(place) / 2), top - 33, c);
    }
    if (mine || hot) {
      ctx.strokeStyle = mine ? GREEN : "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 1.5, top - 12.5, BW + 3, ground - top + 13);
    }
    if (mine) tiny(ctx, "YOU", x + BW / 2 - 5, ground + 6, GREEN);
  });

  // street
  rect(ctx, 0, ground, W, STREET, "#0a0a0c");
  rect(ctx, 0, ground, W, 3, "#26272c");
  for (let x = (Math.floor(t / 40) % 16) - 16; x < W; x += 16) rect(ctx, x, ground + 14, 8, 1, "#3f3f46");
  for (let k = 0; k < 2; k++) {
    const dir = k ? -1 : 1;
    const span = W + 80;
    const cx = Math.round(dir > 0 ? ((t / 22 + k * 400) % span) - 40 : W + 40 - ((t / 26 + k * 300) % span));
    const cy = ground + (k ? 6 : 10);
    const col = k ? "#3b82f6" : "#ef4444";
    box(ctx, cx, cy, 18, 4, col);
    rect(ctx, cx + 4, cy - 2, 9, 2, shade(col, -0.2));
    rect(ctx, cx + 2, cy + 4, 3, 2, "#111");
    rect(ctx, cx + 13, cy + 4, 3, 2, "#111");
    const front = dir > 0 ? cx + 18 : cx - 1;
    rect(ctx, front, cy + 1, 1, 2, "#fef9c3");
    glow(ctx, front + dir * 6, cy + 2, 8, "#fef9c3", 0.15);
  }
}
