// Canvas renderer for the tower. Everything is drawn at logical pixel size and
// scaled up by CSS with image-rendering: pixelated.
//
// Each floor is a row: a floor-number gutter, the themed room (cached background
// plus animated effects, citizens and pets) and, on wide screens, a token card
// with the coin's logo, bag, 24h move, hold time and rent.
import {
  type Floor,
  type Placement,
  type TierId,
  LOBBY_MINT,
  TIERS,
  citizensFor,
  daysHeld,
  floorLevel,
  floorRate,
  msToNextTier,
  tierFor,
} from "./game";
import { CIT_H, CIT_W, PETS, citizenSprite, lineFor, lookFor, petSprite, walkFrame, type Look } from "./people";
import { GOLD, GREEN, GREEN_HI, PIXEL_FONT, box, glow, outline, rect, rgba, rng, shade, text, tiny, tinyWidth } from "./pixel";
import { FEET, ROOM_H, ROOM_W, moodOf } from "./rooms/kit";
import { POOLS, THEMES, buildRoom, themeFor } from "./rooms";

// ---------- layout ----------

const BX = 6; // building left edge
const GUT = 26; // floor number gutter
const RX = BX + GUT; // room left edge
const CARD_GAP = 4;
const CX = RX + ROOM_W + CARD_GAP; // token card left edge
const CW = 92;
export const FLOOR_H = ROOM_H + 4;
export const ROOF_H = 96;
export const LOBBY_H = 74;
export const STREET_H = 22;

/** Wide layout shows the token card beside each room; compact drops it for phones. */
export const widthFor = (compact: boolean) => (compact ? RX + ROOM_W + 6 + BX : CX + CW + 6 + BX);
export const W = widthFor(false);
export const towerHeight = (n: number) => ROOF_H + Math.max(n, 1) * FLOOR_H + LOBBY_H + STREET_H;
export const floorTop = (i: number) => ROOF_H + i * FLOOR_H;

/** Which floor a logical y lands on, or null. */
export function floorAt(y: number, n: number): number | null {
  const i = Math.floor((y - ROOF_H) / FLOOR_H);
  return i >= 0 && i < n ? i : null;
}

// ---------- scene state ----------

type Walker = { x: number; dir: number; pause: number; step: number; look: Look; lane: number; speed: number };
type Pet = { x: number; dir: number; pause: number; step: number };
type Bubble = { who: number; text: string; until: number };
type Pop = { x: number; y: number; t: number; text: string };

export type Scene = {
  walkers: Map<string, Walker[]>;
  pets: Map<string, Pet>;
  bubbles: Map<string, Bubble>;
  nextTalk: Map<string, number>;
  nextPop: Map<string, number>;
  pops: Pop[];
  images: Map<string, HTMLImageElement | "loading" | "failed">;
  accents: Map<string, string>;
  cards: Map<string, { key: string; canvas: HTMLCanvasElement }>;
  cars: { x: number; dir: number; color: string; next: number };
};

export const newScene = (): Scene => ({
  walkers: new Map(),
  pets: new Map(),
  bubbles: new Map(),
  nextTalk: new Map(),
  nextPop: new Map(),
  pops: [],
  images: new Map(),
  accents: new Map(),
  cards: new Map(),
  cars: { x: -40, dir: 1, color: "#ef4444", next: 0 },
});

// ---------- logos and accent colours ----------

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function hsl(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** The logo's most vivid colour, so each floor is lit in its coin's colours. */
function sampleAccent(img: HTMLImageElement): string | null {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 12;
    const x = c.getContext("2d", { willReadFrequently: true })!;
    x.drawImage(img, 0, 0, 12, 12);
    const d = x.getImageData(0, 0, 12, 12).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      const mn = Math.min(d[i], d[i + 1], d[i + 2]);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (sat < 0.35 || mx < 90) continue;
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
    if (n < 3) return null;
    const hex = "#" + [r / n, g / n, b / n].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / n / 255;
    return lum < 0.45 ? shade(hex, 0.35) : hex;
  } catch {
    return null; // logo host without CORS: keep the hashed colour
  }
}

function logoFor(scene: Scene, f: Floor): HTMLImageElement | null {
  if (!f.image) return null;
  const hit = scene.images.get(f.image);
  if (hit instanceof HTMLImageElement) return hit;
  if (!hit) {
    scene.images.set(f.image, "loading");
    const el = new Image();
    // CORS-clean images keep the canvas exportable for "save png".
    el.crossOrigin = "anonymous";
    el.referrerPolicy = "no-referrer";
    el.onload = () => {
      scene.images.set(f.image!, el);
      const a = sampleAccent(el);
      if (a) scene.accents.set(f.mint, a);
    };
    el.onerror = () => scene.images.set(f.image!, "failed");
    el.src = f.image;
  }
  return null;
}

function accentFor(scene: Scene, f: Floor) {
  if (f.isHouse) return GREEN_HI;
  if (f.mint === LOBBY_MINT) return GREEN;
  return scene.accents.get(f.mint) ?? hsl(hashHue(f.mint), 0.7, 0.6);
}

// ---------- formatting ----------

export const fmtUsd = (n: number | null | undefined) =>
  n == null ? "--" : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `$${Math.round(n / 1e3)}K` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : n >= 1 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;

const fmtHeld = (days: number) => (days < 1 ? `${Math.floor(days * 24)}H` : days < 10 ? `${Math.floor(days)}D ${Math.floor((days % 1) * 24)}H` : `${Math.floor(days)}D`);

const fmtPct = (c: number | null | undefined) => (c == null ? "--" : `${c >= 0 ? "+" : ""}${Math.abs(c) >= 100 ? c.toFixed(0) : c.toFixed(1)}%`);

const fmtWait = (ms: number) => {
  const h = ms / 3_600_000;
  return h >= 24 ? `${Math.ceil(h / 24)}D` : h >= 1 ? `${Math.ceil(h)}H` : `${Math.max(1, Math.ceil(ms / 60_000))}M`;
};

// ---------- token card ----------

type CardInfo = { f: Floor; tier: TierId; now: number; accent: string; logo: HTMLImageElement | null; room: string };

function drawCard(o: CardInfo): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = CW;
  c.height = ROOM_H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const { f, tier, accent } = o;
  const lobby = f.mint === LOBBY_MINT;
  rect(ctx, 0, 0, CW, ROOM_H, "#0c0d12");
  outline(ctx, 0, 0, CW, ROOM_H, f.isHouse ? "#166534" : "#23262e");
  rect(ctx, 1, 1, CW - 2, 2, accent);
  rect(ctx, 1, 3, CW - 2, 1, shade(accent, -0.5));

  // logo
  box(ctx, 5, 8, 22, 22, "#1b1d24");
  if (o.logo) ctx.drawImage(o.logo, 6, 9, 20, 20);
  else {
    rect(ctx, 6, 9, 20, 20, shade(accent, -0.55));
    if (lobby) {
      rect(ctx, 11, 14, 10, 12, shade(accent, -0.2));
      rect(ctx, 14, 20, 4, 6, "#0c0d12");
      rect(ctx, 10, 13, 12, 1, accent);
    } else tiny(ctx, f.symbol.slice(0, 4), 16 - tinyWidth(f.symbol.slice(0, 4)) / 2, 17, accent);
  }

  // symbol and level
  const sym = lobby ? "HOME" : f.symbol.toUpperCase().slice(0, 7);
  const label = lobby ? sym : `$${sym}`;
  text(ctx, label, 31, 17, f.isHouse ? GREEN : "#f1f5f9", label.length > 7 ? 6 : 8);
  const lvl = floorLevel(f.usd, f.heldSince, o.now);
  box(ctx, 31, 21, tinyWidth(`LV ${lvl}`) + 4, 8, "#2a2410");
  tiny(ctx, `LV ${lvl}`, 33, 22, GOLD);
  if (f.isHouse) {
    box(ctx, 31 + tinyWidth(`LV ${lvl}`) + 7, 21, 19, 8, "#0f2e1b");
    tiny(ctx, "X3", 31 + tinyWidth(`LV ${lvl}`) + 10, 22, GREEN);
  }

  // stats
  const rows: [string, string, string][] = [
    ["BAG", lobby ? "FREE" : fmtUsd(f.usd), "#e2e8f0"],
    ["24H", lobby ? "--" : fmtPct(f.change24), f.change24 == null || lobby ? "#94a3b8" : f.change24 >= 0 ? GREEN : "#f87171"],
    ["HELD", fmtHeld(daysHeld(f.heldSince, o.now)), "#e2e8f0"],
    ["RENT", `$${floorRate(tier, f.isHouse)}/HR`, GREEN],
  ];
  rows.forEach(([k, v, col], i) => {
    const y = 34 + i * 8;
    tiny(ctx, k, 6, y, "#64748b");
    tiny(ctx, v, CW - 6 - tinyWidth(v), y, col);
    if (i < rows.length - 1) for (let x = 6; x < CW - 6; x += 2) rect(ctx, x, y + 6, 1, 1, "#1b1d24");
  });

  // room name and progress to the next tier
  const ry = f.isHouse ? 76 : 70;
  const room = o.room.toUpperCase();
  tiny(ctx, room.length > 21 ? room.slice(0, 21) : room, 6, ry, shade(accent, 0.15));
  const left = msToNextTier(f.heldSince, o.now);
  const by = ry + 8;
  rect(ctx, 6, by, CW - 12, 4, "#1b1d24");
  if (left == null) {
    rect(ctx, 6, by, CW - 12, 4, GOLD);
    rect(ctx, 6, by, CW - 12, 1, "#fff1a8");
    if (!f.isHouse) tiny(ctx, "TOP TIER", 6, by + 7, GOLD);
  } else {
    const cur = TIERS[tier].minDays;
    const next = TIERS[tier + 1].minDays;
    const k = Math.max(0, Math.min(1, (daysHeld(f.heldSince, o.now) - cur) / (next - cur)));
    rect(ctx, 6, by, Math.max(1, Math.round((CW - 12) * k)), 4, accent);
    rect(ctx, 6, by, Math.max(1, Math.round((CW - 12) * k)), 1, shade(accent, 0.4));
    if (!f.isHouse) tiny(ctx, `${TIERS[tier + 1].key.toUpperCase()} IN ${fmtWait(left)}`, 6, by + 7, "#64748b");
  }
  return c;
}

function cardFor(scene: Scene, o: CardInfo) {
  const minute = Math.floor(o.now / 60_000);
  const key = [o.f.mint, o.f.symbol, o.f.usd?.toFixed(2), o.f.change24?.toFixed(1), minute, o.tier, o.accent, o.logo ? 1 : 0, o.room].join("|");
  const hit = scene.cards.get(o.f.mint);
  if (hit && hit.key === key) return hit.canvas;
  const canvas = drawCard(o);
  scene.cards.set(o.f.mint, { key, canvas });
  return canvas;
}

// ---------- city, roof, lobby, street ----------

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#04050a");
  g.addColorStop(0.5, "#070b10");
  g.addColorStop(1, "#0b1a14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng("stars");
  for (let i = 0; i < w / 3; i++) {
    const sx = Math.floor(r() * w);
    const sy = Math.floor(r() * 80);
    const tw = Math.sin(t / 700 + i) > 0.7;
    rect(ctx, sx, sy, 1, 1, tw ? "#ffffff" : "#4b5563");
  }
  // moon
  const mx = w - 48;
  for (const [dy, x0, x1] of [[0, 3, 7], [1, 1, 9], [2, 1, 9], [3, 0, 10], [4, 0, 10], [5, 0, 10], [6, 0, 10], [7, 1, 9], [8, 1, 9], [9, 3, 7]])
    rect(ctx, mx + x0, 12 + dy, x1 - x0, 1, "#fef9c3");
  for (const [dx, dy] of [[3, 3], [6, 6], [4, 7]]) rect(ctx, mx + dx, 12 + dy, 2, 1, "#e5dca0");
  glow(ctx, mx + 5, 17, 24, "#fef9c3", 0.09);
  // far skyline behind the roof
  const fr = rng("far");
  let x = 0;
  while (x < w) {
    const bw = 8 + Math.floor(fr() * 16);
    const bh = 18 + Math.floor(fr() * 40);
    rect(ctx, x, ROOF_H - bh, bw, bh + 4, "#0a110e");
    for (let wy = ROOF_H - bh + 3; wy < ROOF_H - 2; wy += 4)
      for (let wx = x + 2; wx < x + bw - 2; wx += 3) if (fr() < 0.25) rect(ctx, wx, wy, 1, 2, fr() < 0.2 ? "#2d6a45" : "#4a4325");
    x += bw + 2;
  }
}

function roof(ctx: CanvasRenderingContext2D, w: number, t: number, compact: boolean, houseLive: boolean, sign: string) {
  const top = ROOF_H - 12;
  const bw = w - BX * 2;
  // parapet and roof slab
  box(ctx, BX, top, bw, 12, "#1d1f26");
  rect(ctx, BX, top + 4, bw, 1, "#15161b");
  for (let x = BX + 4; x < BX + bw - 4; x += 12) rect(ctx, x, top + 7, 6, 2, "#26282f");
  // antenna with a blinking light
  const ax = BX + 30;
  rect(ctx, ax, top - 46, 1, 46, "#4b5563");
  for (let y = top - 40; y < top; y += 8) rect(ctx, ax - 2, y, 5, 1, "#374151");
  const blink = Math.floor(t / 600) % 2 === 0;
  rect(ctx, ax - 1, top - 48, 3, 2, blink ? "#ef4444" : "#450a0a");
  if (blink) glow(ctx, ax, top - 47, 10, "#ef4444", 0.25);
  // water tower
  const wx = BX + bw - 60;
  box(ctx, wx, top - 26, 26, 16, "#5b4636");
  for (let x = wx + 3; x < wx + 26; x += 4) rect(ctx, x, top - 26, 1, 16, "#4a382a");
  rect(ctx, wx - 2, top - 29, 30, 3, "#3f3f46");
  rect(ctx, wx + 11, top - 33, 4, 4, "#3f3f46");
  for (const lx of [wx + 2, wx + 22]) rect(ctx, lx, top - 10, 2, 10, "#27272a");
  rect(ctx, wx + 2, top - 6, 22, 1, "#27272a");
  // billboard for the house coin
  if (!compact) {
    const bx = BX + 60;
    rect(ctx, bx + 8, top - 6, 2, 6, "#27272a");
    rect(ctx, bx + 52, top - 6, 2, 6, "#27272a");
    box(ctx, bx, top - 30, 62, 24, "#0b1510");
    outline(ctx, bx, top - 30, 62, 24, "#166534");
    tiny(ctx, "KING", bx + 6, top - 27, GREEN);
    tiny(ctx, houseLive ? "BUY + BURN" : "LAUNCHING", bx + 6, top - 20, houseLive ? GOLD : "#e2e8f0");
    tiny(ctx, houseLive ? "3X RENT" : "SOON", bx + 6, top - 13, "#94a3b8");
    glow(ctx, bx + 31, top - 18, 34, GREEN_HI, 0.06 + 0.03 * Math.sin(t / 500));
  }
  // neon sign, glitches now and then
  const glitch = Math.sin(t / 3100) > 0.985;
  const cx = compact ? w / 2 : BX + bw / 2 + 50;
  ctx.font = `10px ${PIXEL_FONT}`;
  ctx.textAlign = "center";
  ctx.shadowColor = GREEN_HI;
  ctx.shadowBlur = 6;
  ctx.fillStyle = glitch ? "#14532d" : GREEN;
  ctx.fillText(sign, cx + (glitch ? 1 : 0), top - 6);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  rect(ctx, cx - 52, top - 3, 104, 1, "#27272a");
  for (const sx of [cx - 40, cx + 40]) rect(ctx, sx, top - 3, 1, 3, "#27272a");
}

function lobby(ctx: CanvasRenderingContext2D, w: number, y: number, t: number) {
  const bw = w - BX * 2;
  rect(ctx, BX, y, bw, LOBBY_H, "#16171d");
  rect(ctx, BX, y, bw, 3, "#2a2c33");
  // marble wall and floor
  for (let x = BX + 4; x < BX + bw - 4; x += 16) {
    rect(ctx, x, y + 8, 15, 46, "#1f2128");
    rect(ctx, x, y + 8, 15, 1, "#2a2d36");
  }
  for (let x = BX; x < BX + bw; x += 8) rect(ctx, x, y + 54, 8, 20, (x / 8) % 2 ? "#20222a" : "#191a20");
  rect(ctx, BX, y + 54, bw, 1, "#3a3d46");
  // doors
  const cx = Math.round(w / 2);
  box(ctx, cx - 30, y + 12, 60, 42, "#0f1712");
  rect(ctx, cx - 28, y + 16, 27, 38, "#0b1f15");
  rect(ctx, cx + 1, y + 16, 27, 38, "#0b1f15");
  rect(ctx, cx - 28, y + 16, 56, 1, GREEN);
  rect(ctx, cx - 4, y + 32, 2, 6, "#9ca3af");
  rect(ctx, cx + 2, y + 32, 2, 6, "#9ca3af");
  for (let i = 0; i < 4; i++) rect(ctx, cx - 26 + i * 7, y + 18 + i * 3, 2, 10, "rgba(134,239,172,0.12)");
  glow(ctx, cx, y + 34, 50, GREEN_HI, 0.08 + 0.02 * Math.sin(t / 900));
  text(ctx, "LOBBY", cx, y + 10, GREEN, 8, "center");
  // planters and windows either side
  for (const side of [-1, 1]) {
    const px = cx + side * 64 - (side < 0 ? 12 : 0);
    box(ctx, px, y + 46, 12, 8, "#3f2a1a");
    for (let i = 0; i < 6; i++) rect(ctx, px + 1 + i * 2, y + 38 + ((i * 3) % 5), 2, 8 - ((i * 3) % 5), i % 2 ? "#16a34a" : "#22c55e");
    const wx = cx + side * 110 - (side < 0 ? 40 : 0);
    box(ctx, wx, y + 16, 40, 26, "#2f323a");
    rect(ctx, wx + 2, y + 18, 36, 22, "#0a1210");
    rect(ctx, wx + 19, y + 18, 2, 22, "#2f323a");
    for (let i = 0; i < 6; i++) rect(ctx, wx + 4 + i * 6, y + 28 + ((i * 5) % 9), 3, 12 - ((i * 5) % 9), "#0f1d17");
    rect(ctx, wx + 2, y + 18, 36, 1, "rgba(255,255,255,0.12)");
  }
  // doorman
  const k: Look = { skin: "#b97d52", hair: "#17171b", style: 0, shirt: "#14532d", pants: "#14532d", shoes: "#0b0b0e", shades: false };
  const img = citizenSprite(k, "cap", 0);
  ctx.drawImage(img, cx + 34, y + 54 - CIT_H + 2);
}

function street(ctx: CanvasRenderingContext2D, w: number, y: number, t: number, scene: Scene) {
  rect(ctx, 0, y, w, STREET_H, "#0a0a0c");
  rect(ctx, 0, y, w, 4, "#26272c");
  rect(ctx, 0, y + 4, w, 1, "#3f3f46");
  for (let x = 4; x < w; x += 16) rect(ctx, x, y + 14, 8, 1, "#52525b");
  for (const lx of [16, w - 18]) {
    rect(ctx, lx, y - 34, 1, 36, "#3f3f46");
    rect(ctx, lx - 2, y - 36, 5, 2, "#52525b");
    rect(ctx, lx - 1, y - 34, 3, 1, "#fde68a");
    glow(ctx, lx, y - 30, 22, "#fde68a", 0.1);
  }
  // a car now and then
  const car = scene.cars;
  if (t > car.next) {
    car.x += car.dir * 1.2;
    if (car.x < -40 || car.x > w + 40) {
      car.dir = Math.random() < 0.5 ? 1 : -1;
      car.x = car.dir > 0 ? -36 : w + 36;
      car.color = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#e5e7eb"][Math.floor(Math.random() * 5)];
      car.next = t + 3000 + Math.random() * 9000;
    }
    const cx = Math.round(car.x);
    const cy = y + 8;
    box(ctx, cx, cy + 2, 26, 6, car.color);
    box(ctx, cx + 6, cy - 2, 13, 5, shade(car.color, -0.15));
    rect(ctx, cx + 8, cy - 1, 4, 3, "#93c5fd");
    rect(ctx, cx + 13, cy - 1, 4, 3, "#93c5fd");
    rect(ctx, cx + 3, cy + 8, 5, 3, "#111");
    rect(ctx, cx + 18, cy + 8, 5, 3, "#111");
    const front = car.dir > 0 ? cx + 25 : cx;
    rect(ctx, front, cy + 3, 1, 2, "#fef9c3");
    glow(ctx, front + car.dir * 8, cy + 4, 10, "#fef9c3", 0.15);
  }
}

// ---------- weather in the windows ----------

function weather(ctx: CanvasRenderingContext2D, wins: { x: number; y: number; w: number; h: number }[], mood: "red" | "green" | "flat", t: number, seed: number) {
  if (mood === "flat") return;
  for (const w of wins) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(w.x, w.y, w.w, w.h);
    ctx.clip();
    if (mood === "red") {
      ctx.fillStyle = "rgba(147,197,253,0.55)";
      for (let i = 0; i < Math.max(4, (w.w * w.h) / 60); i++) {
        const rx = w.x + ((i * 37 + seed) % w.w);
        const ry = w.y + ((t / 6 + i * 23) % (w.h + 6)) - 6;
        ctx.fillRect(Math.round(rx - ((ry - w.y) % 3)), Math.round(ry), 1, 3);
      }
      ctx.fillStyle = "rgba(15,23,42,0.25)";
      ctx.fillRect(w.x, w.y, w.w, w.h);
    } else {
      // fireworks for green days
      const cycle = 1600;
      for (let k = 0; k < 2; k++) {
        const phase = (t + k * 800 + seed * 97) % cycle;
        const n = Math.floor((t + k * 800 + seed * 97) / cycle);
        const cx = w.x + 4 + ((n * 53 + k * 29 + seed) % Math.max(1, w.w - 8));
        const cy = w.y + 3 + ((n * 31 + k * 13) % Math.max(1, Math.floor(w.h / 2)));
        const col = [GREEN_HI, GOLD, "#f472b6", "#38bdf8"][(n + k) % 4];
        if (phase < 900) {
          const rad = (phase / 900) * 6;
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2;
            rect(ctx, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 1, 1, rgba(col, 1 - phase / 900));
          }
        }
      }
    }
    ctx.restore();
  }
}

// ---------- citizens and pets ----------

const WALK_MIN = 6;
const WALK_MAX = ROOM_W - 6 - CIT_W;

function walkersFor(scene: Scene, f: Floor, tier: TierId): Walker[] {
  const n = f.mint === LOBBY_MINT ? 1 : citizensFor(tier);
  let ws = scene.walkers.get(f.mint);
  if (ws && ws.length === n) return ws;
  const r = rng(f.mint + ":people");
  ws = Array.from({ length: n }, (_, k) => ({
    x: WALK_MIN + r() * (WALK_MAX - WALK_MIN),
    dir: r() < 0.5 ? -1 : 1,
    pause: r() * 2,
    step: r(),
    look: lookFor(r, tier),
    lane: k % 3 - 1,
    speed: 7 + r() * 5,
  }));
  scene.walkers.set(f.mint, ws);
  return ws;
}

function stepWalker(w: { x: number; dir: number; pause: number; step: number }, dt: number, speed: number, min = WALK_MIN, max = WALK_MAX) {
  if (w.pause > 0) {
    w.pause -= dt;
    return;
  }
  w.x += w.dir * speed * dt;
  w.step += dt * (speed / 10);
  if (w.x < min || w.x > max) {
    w.dir *= -1;
    w.x = Math.min(Math.max(w.x, min), max);
  }
  if (Math.random() < dt * 0.3) w.pause = 0.8 + Math.random() * 2.5;
  else if (Math.random() < dt * 0.1) w.dir *= -1;
}

function bubble(ctx: CanvasRenderingContext2D, s: string, cx: number, top: number) {
  const w = tinyWidth(s) + 6;
  const x = Math.round(Math.max(2, Math.min(ROOM_W - w - 2, cx - w / 2)));
  const y = top - 11;
  rect(ctx, x, y, w, 9, "#f8fafc");
  rect(ctx, x + 1, y - 1, w - 2, 1, "#f8fafc");
  rect(ctx, x + 1, y + 9, w - 2, 1, "#f8fafc");
  rect(ctx, x + 1, y + 10, w - 2, 1, "rgba(0,0,0,0.35)");
  const tx = Math.round(Math.max(x + 3, Math.min(x + w - 4, cx)));
  rect(ctx, tx, y + 10, 2, 1, "#f8fafc");
  rect(ctx, tx, y + 11, 1, 1, "#f8fafc");
  tiny(ctx, s, x + 3, y + 2, "#0b0b0e");
}

// ---------- the tower ----------

export type DrawOpts = {
  floors: Floor[];
  placed: Record<string, Placement>;
  selected: string | null;
  now: number;
  t: number;
  dt: number;
  scene: Scene;
  compact?: boolean;
  houseLive?: boolean;
  /** The owner's pump.fun username, lit up in the rooftop neon instead of "KING OF THE HILL". */
  owner?: string | null;
  /** Logical y range on screen; floors outside it skip their animation. */
  view?: { top: number; bottom: number } | null;
};

function drawFloor(ctx: CanvasRenderingContext2D, o: DrawOpts, f: Floor, i: number, n: number) {
  const { scene, t, now } = o;
  const y = floorTop(i);
  const tier = tierFor(f.heldSince, now);
  const p = o.placed[f.mint];
  const logo = logoFor(scene, f);
  const accent = accentFor(scene, f);
  const mood = f.mint === LOBBY_MINT ? "flat" : moodOf(f.change24);
  const theme = themeFor(f, tier);
  const b = buildRoom({
    theme,
    seed: f.mint,
    tier,
    accent,
    mood,
    symbol: f.mint === LOBBY_MINT ? "HOME" : f.symbol.toUpperCase().slice(0, 8),
    logo,
    usd: f.usd,
    isHouse: f.isHouse,
    change24: f.change24,
    bag: f.mint !== LOBBY_MINT,
    furniture: p?.furniture,
  });
  const visible = !o.view || (y + FLOOR_H > o.view.top && y < o.view.bottom);

  // gutter: floor number and tier pips
  const num = String(n - i).padStart(2, "0");
  text(ctx, num, BX + GUT / 2, y + 16, f.isHouse ? GREEN : "#94a3b8", 8, "center");
  for (let k = 0; k < 5; k++) rect(ctx, BX + GUT / 2 - 2, y + 26 + k * 6, 4, 4, k < tier ? (tier === 5 ? GOLD : accent) : "#23262e");

  ctx.save();
  ctx.translate(RX, y);
  ctx.beginPath();
  ctx.rect(0, 0, ROOM_W, ROOM_H);
  ctx.clip();
  ctx.drawImage(b.canvas, 0, 0);
  if (visible) {
    for (const fx of b.fx) fx(ctx, t);
    weather(ctx, b.windows, mood, t, i * 17);

    // citizens, sorted so the ones nearer the front draw last
    const ws = walkersFor(scene, f, tier);
    const outfit = p?.outfit ?? null;
    for (const w of ws) stepWalker(w, o.dt, w.speed);
    const order = [...ws.keys()].sort((a, c) => ws[a].lane - ws[c].lane);
    for (const k of order) {
      const w = ws[k];
      const frame = w.pause > 0 ? 0 : walkFrame(w.step);
      const img = citizenSprite(w.look, outfit, frame);
      const feet = FEET + w.lane;
      const sx = Math.round(w.x);
      rect(ctx, sx + 2, feet, CIT_W - 3, 1, "rgba(0,0,0,0.3)");
      if (w.dir < 0) {
        ctx.save();
        ctx.translate(sx + CIT_W, feet - CIT_H + 1);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else ctx.drawImage(img, sx, feet - CIT_H + 1);
    }

    // pet
    if (p?.pet && PETS[p.pet]) {
      let pw = scene.pets.get(f.mint);
      if (!pw) {
        pw = { x: 90, dir: 1, pause: 0, step: 0 };
        scene.pets.set(f.mint, pw);
      }
      const def = PETS[p.pet];
      stepWalker(pw, o.dt, def.speed, 4, ROOM_W - 18);
      const frame = pw.pause > 0 ? 0 : Math.floor(pw.step * 6) % 2;
      const img = petSprite(p.pet, frame)!;
      const hop = def.hop && pw.pause <= 0 ? Math.round(Math.abs(Math.sin(pw.step * 6)) * 3) : 0;
      const px = Math.round(pw.x);
      const py = FEET + 1 - img.height - hop;
      rect(ctx, px + 1, FEET + 1, img.width - 2, 1, "rgba(0,0,0,0.3)");
      if (pw.dir < 0) {
        ctx.save();
        ctx.translate(px + img.width, py);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else ctx.drawImage(img, px, py);
    }

    for (const fx of b.front) fx(ctx, t);

    // speech bubbles about this floor's own numbers
    const due = scene.nextTalk.get(f.mint) ?? t + 1500 + Math.random() * 8000;
    let bub = scene.bubbles.get(f.mint);
    if (t >= due && !bub) {
      const who = Math.floor(Math.random() * ws.length);
      const s = lineFor(Math.random, {
        symbol: f.symbol.toUpperCase().slice(0, 6),
        days: daysHeld(f.heldSince, now),
        change24: f.change24 ?? null,
        usd: f.usd,
        tier,
        isHouse: f.isHouse,
        lobby: f.mint === LOBBY_MINT,
      });
      bub = { who, text: s, until: t + 2600 };
      scene.bubbles.set(f.mint, bub);
      ws[who].pause = Math.max(ws[who].pause, 2.6);
      scene.nextTalk.set(f.mint, t + 7000 + Math.random() * 12000);
    } else if (!scene.nextTalk.has(f.mint)) scene.nextTalk.set(f.mint, due);
    if (bub) {
      if (t > bub.until || !ws[bub.who]) scene.bubbles.delete(f.mint);
      else bubble(ctx, bub.text, ws[bub.who].x + CIT_W / 2, FEET + ws[bub.who].lane - CIT_H);
    }

    // cash pops: one every few seconds per floor
    const rate = floorRate(tier, f.isHouse);
    const pdue = scene.nextPop.get(f.mint) ?? t + Math.random() * 4000;
    if (t >= pdue) {
      const w = ws[Math.floor(Math.random() * ws.length)];
      scene.pops.push({ x: RX + w.x, y: y + FEET - CIT_H - 2, t, text: `+$${Math.max(1, Math.round(rate / 60))}` });
      scene.nextPop.set(f.mint, t + 3000 + Math.random() * 5000);
    } else scene.nextPop.set(f.mint, pdue);
  }

  // room name tag
  const tag = o.compact ? `${f.mint === LOBBY_MINT ? "HOME" : "$" + f.symbol.toUpperCase().slice(0, 7)} ${f.mint === LOBBY_MINT ? "" : fmtPct(f.change24)}`.trim() : theme.name.toUpperCase();
  const tw = tinyWidth(tag) + 6;
  rect(ctx, 2, 2, tw, 9, "rgba(5,6,8,0.78)");
  rect(ctx, 2, 2, 1, 9, accent);
  tiny(ctx, tag, 5, 4, o.compact && f.change24 != null && f.mint !== LOBBY_MINT ? (f.change24 >= 0 ? GREEN : "#fca5a5") : "#e2e8f0");
  if (o.compact) {
    const lv = `LV ${floorLevel(f.usd, f.heldSince, now)}`;
    rect(ctx, ROOM_W - tinyWidth(lv) - 8, 2, tinyWidth(lv) + 6, 9, "rgba(5,6,8,0.78)");
    tiny(ctx, lv, ROOM_W - tinyWidth(lv) - 5, 4, GOLD);
  }

  // the house coin floor gets a neon frame
  if (f.isHouse) {
    const a = 0.55 + 0.4 * Math.sin(t / 300);
    ctx.strokeStyle = rgba(GREEN_HI, a);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, ROOM_W - 1, ROOM_H - 1);
  }
  ctx.restore();

  // token card
  if (!o.compact) {
    const card = cardFor(scene, { f, tier, now, accent, logo, room: theme.name });
    ctx.drawImage(card, CX, y);
  }

  // slab
  const w = widthFor(!!o.compact);
  rect(ctx, BX, y + ROOM_H, w - BX * 2, 4, "#2a2c33");
  rect(ctx, BX, y + ROOM_H, w - BX * 2, 1, "#3a3d46");
  if (o.selected === f.mint) {
    ctx.strokeStyle = Math.floor(t / 400) % 2 ? "#ffffff" : GREEN;
    ctx.lineWidth = 2;
    ctx.strokeRect(RX - 1, y - 1, (o.compact ? ROOM_W : CX + CW - RX) + 2, ROOM_H + 2);
  }
}

export function drawTower(ctx: CanvasRenderingContext2D, o: DrawOpts) {
  const { floors, scene, t } = o;
  const w = widthFor(!!o.compact);
  const H = towerHeight(floors.length);
  ctx.imageSmoothingEnabled = false;
  sky(ctx, w, H, t);
  roof(ctx, w, t, !!o.compact, !!o.houseLive, o.owner ? `@${o.owner}`.toUpperCase().slice(0, 14) : "KING OF THE HILL");

  // facade behind the floors
  const bodyH = Math.max(floors.length, 1) * FLOOR_H;
  rect(ctx, BX, ROOF_H, w - BX * 2, bodyH, "#1b1c22");
  rect(ctx, BX, ROOF_H, GUT - 2, bodyH, "#202229");
  rect(ctx, BX + GUT - 3, ROOF_H, 1, bodyH, "#121318");
  if (!o.compact) rect(ctx, CX - CARD_GAP, ROOF_H, CARD_GAP, bodyH, "#121318");
  rect(ctx, w - BX - 6, ROOF_H, 6, bodyH, "#202229");

  if (!floors.length) {
    const y = floorTop(0);
    rect(ctx, RX, y, ROOM_W, ROOM_H, "#0e0f13");
    text(ctx, "FOR LEASE", RX + ROOM_W / 2, y + 40, "#6b7280", 8, "center");
    tiny(ctx, "NO BAGS NO FLOORS", RX + ROOM_W / 2 - tinyWidth("NO BAGS NO FLOORS") / 2, y + 52, "#4b5563");
  }

  floors.forEach((f, i) => drawFloor(ctx, o, f, i, floors.length));

  const ly = ROOF_H + bodyH;
  lobby(ctx, w, ly, t);
  street(ctx, w, ly + LOBBY_H, t, scene);

  // cash pops
  scene.pops = scene.pops.filter((p) => t - p.t < 1400);
  for (const p of scene.pops) {
    const k = (t - p.t) / 1400;
    tiny(ctx, p.text, p.x, p.y - k * 12, rgba(GREEN, 1 - k));
  }
}

// ---------- tier previews for the how-it-works ladder ----------

export const PREVIEW_W = ROOM_W;
export const PREVIEW_H = ROOM_H;

const previewScene = newScene();

/** One room of the tier, cycling through that tier's themes. */
export function drawTierPreview(ctx: CanvasRenderingContext2D, tier: TierId, t: number) {
  ctx.imageSmoothingEnabled = false;
  const pool = POOLS[tier].filter((id) => THEMES.has(id));
  const id = pool[Math.floor(t / 4000) % pool.length];
  const accent = ["#f59e0b", "#f472b6", "#38bdf8", "#a78bfa", "#4ade80", "#facc15"][tier];
  const b = buildRoom({ theme: THEMES.get(id)!, seed: `preview${tier}`, tier, accent, mood: "flat", symbol: "MEME", logo: null, usd: [20, 200, 800, 3000, 9000, 40000][tier], isHouse: false, change24: 4.2 });
  ctx.drawImage(b.canvas, 0, 0);
  for (const fx of b.fx) fx(ctx, t);
  const fake: Floor = { mint: `preview${tier}`, symbol: "MEME", name: "", image: null, amount: 1, usd: 1, heldSince: Date.now() - TIERS[tier].minDays * 86_400_000, isHouse: false };
  const ws = walkersFor(previewScene, fake, tier);
  for (const w of ws) {
    stepWalker(w, 1 / 60, w.speed);
    const img = citizenSprite(w.look, null, w.pause > 0 ? 0 : walkFrame(w.step));
    if (w.dir < 0) {
      ctx.save();
      ctx.translate(Math.round(w.x) + CIT_W, FEET + w.lane - CIT_H + 1);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else ctx.drawImage(img, Math.round(w.x), FEET + w.lane - CIT_H + 1);
  }
  for (const fx of b.front) fx(ctx, t);
  const name = THEMES.get(id)!.name.toUpperCase();
  rect(ctx, 2, 2, tinyWidth(name) + 6, 9, "rgba(5,6,8,0.78)");
  tiny(ctx, name, 5, 4, "#e2e8f0");
}

