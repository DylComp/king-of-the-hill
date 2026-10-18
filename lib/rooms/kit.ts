// Shared building blocks for themed rooms. A room is drawn once into an offscreen
// canvas (the static background) and registers small animated effects that run
// every frame on top of it, so a 24 floor tower stays cheap to animate.
import type { TierId } from "../game";
import { type Ctx, GOLD, GREEN, bands, box, glow, mix, noise, outline, rect, rgba, rng, shade, tiny } from "../pixel";

/** Room size in logical pixels. The wall runs to WALL, the floor band below it. */
export const ROOM_W = 256;
export const ROOM_H = 96;
export const WALL = 80;
/** Where props standing against the back wall sit, and where citizens' feet land. */
export const BACK = 84;
export const FEET = 93;

export type Mood = "red" | "flat" | "green";
export const moodOf = (change24: number | null | undefined): Mood =>
  change24 == null ? "flat" : change24 <= -12 ? "red" : change24 >= 12 ? "green" : "flat";

/** An animated effect; ctx is already translated to the room's top-left corner. */
export type FX = (ctx: Ctx, t: number) => void;

export type Win = { x: number; y: number; w: number; h: number };

export type Room = {
  ctx: Ctx;
  tier: TierId;
  /** Accent colour sampled from the token's logo, so every floor carries its coin's colours. */
  accent: string;
  mood: Mood;
  symbol: string;
  logo: CanvasImageSource | null;
  usd: number | null;
  isHouse: boolean;
  /** The coin's 24h move, shown on tickers. */
  change24?: number | null;
  seed: string;
  r: () => number;
  /** Effects drawn behind the citizens (lights, steam, screens). */
  fx: FX[];
  /** Effects drawn in front of the citizens (bar fronts, foreground plants). */
  front: FX[];
  /** Windows get rain on red days and fireworks on green days, drawn by the renderer. */
  windows: Win[];
};

export type Theme = {
  id: string;
  name: string;
  draw: (room: Room) => void;
};

export function makeRoom(ctx: Ctx, o: Omit<Room, "ctx" | "r" | "fx" | "front" | "windows">): Room {
  return { ...o, ctx, r: rng(o.seed), fx: [], front: [], windows: [] };
}

// ---------- walls ----------

export function wallFlat(room: Room, c: string, tex = 0.05) {
  const { ctx, r } = room;
  rect(ctx, 0, 0, ROOM_W, WALL, c);
  noise(ctx, r, 0, 0, ROOM_W, WALL, [shade(c, -0.06), shade(c, 0.05)], tex);
}

export function wallStripes(room: Room, a: string, b: string, w = 6) {
  const { ctx } = room;
  for (let x = 0; x < ROOM_W; x += w * 2) {
    rect(ctx, x, 0, w, WALL, a);
    rect(ctx, x + w, 0, w, WALL, b);
  }
}

export function wallBrick(room: Room, c: string, mortar: string) {
  const { ctx, r } = room;
  rect(ctx, 0, 0, ROOM_W, WALL, mortar);
  for (let row = 0; row * 6 < WALL; row++) {
    const off = row % 2 ? 6 : 0;
    for (let x = -off; x < ROOM_W; x += 12) {
      const v = shade(c, (r() - 0.5) * 0.18);
      rect(ctx, x + 1, row * 6 + 1, 10, 4, v);
      rect(ctx, x + 1, row * 6 + 1, 10, 1, shade(v, 0.12));
    }
  }
}

export function wallPanels(room: Room, c: string, panelW = 16) {
  const { ctx } = room;
  rect(ctx, 0, 0, ROOM_W, WALL, c);
  for (let x = 0; x < ROOM_W; x += panelW) {
    rect(ctx, x, 0, 1, WALL, shade(c, -0.25));
    rect(ctx, x + 1, 0, 1, WALL, shade(c, 0.12));
  }
}

/** Wainscot: a darker lower wall with a rail. */
export function wainscot(room: Room, c: string, h = 26) {
  const { ctx } = room;
  rect(ctx, 0, WALL - h, ROOM_W, h, c);
  for (let x = 4; x < ROOM_W; x += 20) outline(ctx, x, WALL - h + 5, 16, h - 9, shade(c, -0.2));
  rect(ctx, 0, WALL - h - 2, ROOM_W, 2, shade(c, 0.2));
  rect(ctx, 0, WALL - h, ROOM_W, 1, shade(c, -0.3));
}

export function tiles(room: Room, x: number, y: number, w: number, h: number, a: string, b: string, size = 6) {
  const { ctx } = room;
  for (let ty = 0; ty < h; ty += size)
    for (let tx = 0; tx < w; tx += size) rect(ctx, x + tx, y + ty, Math.min(size, w - tx), Math.min(size, h - ty), ((tx + ty) / size) % 2 ? a : b);
}

export function crown(room: Room, c: string) {
  rect(room.ctx, 0, 0, ROOM_W, 3, c);
  rect(room.ctx, 0, 3, ROOM_W, 1, shade(c, -0.35));
}

export function baseboard(room: Room, c: string) {
  rect(room.ctx, 0, WALL - 3, ROOM_W, 3, c);
  rect(room.ctx, 0, WALL - 3, ROOM_W, 1, shade(c, 0.3));
}

// ---------- floors ----------

export function floorPlanks(room: Room, c: string) {
  const { ctx, r } = room;
  for (let y = WALL; y < ROOM_H; y += 4) {
    rect(ctx, 0, y, ROOM_W, 4, shade(c, ((y / 4) % 2) * -0.06));
    rect(ctx, 0, y + 3, ROOM_W, 1, shade(c, -0.25));
    for (let x = Math.floor(r() * 30); x < ROOM_W; x += 24 + Math.floor(r() * 20)) rect(ctx, x, y, 1, 3, shade(c, -0.3));
  }
  rect(ctx, 0, WALL, ROOM_W, 1, shade(c, -0.45));
}

export function floorTiles(room: Room, a: string, b: string, size = 8) {
  tiles(room, 0, WALL, ROOM_W, ROOM_H - WALL, a, b, size);
  rect(room.ctx, 0, WALL, ROOM_W, 1, shade(a, -0.45));
}

export function floorCarpet(room: Room, c: string) {
  const { ctx, r } = room;
  rect(ctx, 0, WALL, ROOM_W, ROOM_H - WALL, c);
  noise(ctx, r, 0, WALL, ROOM_W, ROOM_H - WALL, [shade(c, -0.1), shade(c, 0.08)], 0.18);
  rect(ctx, 0, WALL, ROOM_W, 1, shade(c, -0.45));
}

export function floorConcrete(room: Room, c: string) {
  const { ctx, r } = room;
  bands(ctx, 0, WALL, ROOM_W, ROOM_H - WALL, shade(c, -0.1), c, 3);
  noise(ctx, r, 0, WALL, ROOM_W, ROOM_H - WALL, [shade(c, -0.15), shade(c, 0.1)], 0.08);
  rect(ctx, 0, WALL, ROOM_W, 1, shade(c, -0.45));
}

export function floorMarble(room: Room, a: string, b: string) {
  const { ctx, r } = room;
  for (let x = 0; x < ROOM_W; x += 16) {
    rect(ctx, x, WALL, 16, ROOM_H - WALL, (x / 16) % 2 ? a : b);
    rect(ctx, x, WALL, 1, ROOM_H - WALL, shade(a, -0.2));
  }
  for (let i = 0; i < 14; i++) {
    let vx = Math.floor(r() * ROOM_W);
    for (let vy = WALL + 1; vy < ROOM_H; vy++) {
      if (r() < 0.6) rect(ctx, vx, vy, 1, 1, shade(a, -0.12));
      vx += r() < 0.5 ? 1 : -1;
    }
  }
  rect(ctx, 0, WALL, ROOM_W, 1, GOLD);
}

export function rug(room: Room, x: number, w: number, c: string, pattern: "plain" | "stripe" | "persian" = "plain") {
  const { ctx } = room;
  const y = WALL + 6;
  const h = 7;
  rect(ctx, x, y, w, h, c);
  outline(ctx, x + 1, y + 1, w - 2, h - 2, shade(c, 0.25));
  if (pattern === "stripe") for (let i = 4; i < w - 4; i += 6) rect(ctx, x + i, y + 2, 2, h - 4, shade(c, -0.25));
  if (pattern === "persian") {
    rect(ctx, x + 3, y + 3, w - 6, 1, GOLD);
    for (let i = 6; i < w - 6; i += 8) rect(ctx, x + i, y + 2, 3, 3, shade(c, 0.35));
  }
  rect(ctx, x, y + h, w, 1, shade(c, -0.5));
}

// ---------- windows ----------

/** City view through glass; registered so the renderer can add rain or fireworks. */
export function cityWindow(room: Room, x: number, y: number, w: number, h: number, frame: string, opts: { mullion?: boolean; sill?: boolean } = {}) {
  const { ctx } = room;
  const r = rng(room.seed + x);
  bands(ctx, x, y, w, h, "#070912", "#16223a", 4);
  for (let i = 0; i < w / 3; i++) rect(ctx, x + Math.floor(r() * w), y + Math.floor(r() * h * 0.5), 1, 1, r() < 0.3 ? "#ffffff" : "#64748b");
  let bx = x;
  while (bx < x + w) {
    const bw = 3 + Math.floor(r() * 7);
    const bh = Math.floor(h * (0.25 + r() * 0.55));
    rect(ctx, bx, y + h - bh, bw, bh, r() < 0.5 ? "#0c1220" : "#111a2c");
    for (let wy = y + h - bh + 2; wy < y + h - 1; wy += 3)
      for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) if (r() < 0.35) rect(ctx, wx, wy, 1, 1, r() < 0.15 ? GREEN : "#f5d77a");
    bx += bw + 1;
  }
  rect(ctx, x + 2, y + 2, 1, h - 6, "rgba(255,255,255,0.08)");
  outline(ctx, x - 1, y - 1, w + 2, h + 2, frame);
  outline(ctx, x - 2, y - 2, w + 4, h + 4, shade(frame, -0.35));
  if (opts.mullion !== false) {
    rect(ctx, x + Math.floor(w / 2), y, 1, h, frame);
    if (h > 18) rect(ctx, x, y + Math.floor(h / 2), w, 1, frame);
  }
  if (opts.sill !== false) box(ctx, x - 3, y + h + 1, w + 6, 2, shade(frame, 0.1));
  room.windows.push({ x, y, w, h });
}

export function curtains(room: Room, x: number, y: number, h: number, w: number, c: string) {
  const { ctx } = room;
  for (const cx of [x - 5, x + w + 1]) {
    rect(ctx, cx, y - 2, 5, h + 4, c);
    for (let i = 1; i < 5; i += 2) rect(ctx, cx + i, y - 2, 1, h + 4, shade(c, -0.25));
    rect(ctx, cx, y + h + 1, 5, 1, shade(c, -0.4));
  }
  rect(ctx, x - 7, y - 4, w + 14, 2, shade(c, -0.5));
}

// ---------- token touches ----------

/** Framed portrait of the coin's logo. Every room hangs one somewhere. */
export function tokenArt(room: Room, x: number, y: number, size: number, frame: "wood" | "gold" | "black" | "neon" | "tape" = "wood") {
  const { ctx } = room;
  const fc = frame === "gold" ? GOLD : frame === "black" ? "#15161b" : frame === "neon" ? room.accent : frame === "tape" ? "#d6d3d1" : "#6b4423";
  if (frame !== "tape") {
    rect(ctx, x - 2, y - 2, size + 4, size + 4, fc);
    rect(ctx, x - 2, y - 2, size + 4, 1, shade(fc, 0.35));
    rect(ctx, x - 2, y + size + 1, size + 4, 1, shade(fc, -0.4));
    rect(ctx, x - 1, y - 1, size + 2, size + 2, shade(fc, -0.25));
  }
  rect(ctx, x, y, size, size, "#0b0b0e");
  if (room.logo) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(room.logo, x, y, size, size);
  } else {
    rect(ctx, x, y, size, size, shade(room.accent, -0.5));
    tiny(ctx, room.symbol.slice(0, Math.max(1, Math.floor(size / 4))), x + 1, y + Math.floor(size / 2) - 2, room.accent);
  }
  if (frame === "tape") {
    rect(ctx, x - 2, y - 1, 5, 2, "rgba(231,229,228,0.85)");
    rect(ctx, x + size - 3, y - 1, 5, 2, "rgba(231,229,228,0.85)");
  }
  if (frame === "neon") room.fx.push((c, t) => glow(c, x + size / 2, y + size / 2, size, room.accent, 0.1 + 0.05 * Math.sin(t / 400)));
  if (frame === "gold") rect(ctx, x + size / 2 - 1, y - 6, 3, 4, shade(GOLD, -0.3)); // hanging wire
}

/** Coin name in neon tubes; flickers now and then. */
export function neonSign(room: Room, label: string, cx: number, y: number, color = room.accent) {
  const w = label.length * 4 + 5;
  const x = Math.round(cx - w / 2);
  rect(room.ctx, x, y, w, 11, "#0b0b10");
  outline(room.ctx, x, y, w, 11, shade(color, -0.55));
  room.fx.push((ctx, t) => {
    const flick = Math.sin(t / 2300 + x) > 0.97 && Math.floor(t / 60) % 2 === 0;
    glow(ctx, cx, y + 5, w * 0.8, color, flick ? 0.04 : 0.16);
    tiny(ctx, label, x + 3, y + 3, flick ? shade(color, -0.6) : shade(color, 0.35));
  });
}

/** How much money is lying around scales with the bag. */
export function stash(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  const usd = room.usd ?? 0;
  if (usd < 100) {
    rect(ctx, x, base - 3, 6, 3, "#3b2f2f"); // a sad empty jar
    rect(ctx, x + 1, base - 5, 4, 2, "#94a3b8");
    return;
  }
  if (usd < 1000) {
    for (let i = 0; i < 3; i++) box(ctx, x + i * 2, base - 2 - i * 2, 7, 2, "#3f8f4f");
    return;
  }
  if (usd < 10_000) {
    for (let s = 0; s < 3; s++) for (let i = 0; i < 4 + s; i++) box(ctx, x + s * 8, base - 2 - i * 2, 7, 2, i % 2 ? "#3f8f4f" : "#4ea95f");
    return;
  }
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4 - row; i++) {
      const gx = x + i * 7 + row * 3;
      const gy = base - 4 - row * 4;
      rect(ctx, gx, gy, 7, 4, GOLD);
      rect(ctx, gx + 1, gy, 5, 1, "#fff1a8");
      rect(ctx, gx, gy + 3, 7, 1, "#9a7412");
    }
  room.fx.push((c, t) => {
    if (Math.floor(t / 900) % 4 === 0) rect(c, x + 4 + ((t / 900) % 3) * 6, base - 13, 1, 1, "#ffffff");
  });
}

/** LED ticker showing the coin and its 24h move; scrolls on wide strips. */
export function ticker(room: Room, x: number, y: number, w: number, change24: number | null) {
  const { ctx } = room;
  box(ctx, x - 1, y - 1, w + 2, 9, "#1b1c22");
  rect(ctx, x, y, w, 7, "#050608");
  change24 = change24 ?? room.change24 ?? null;
  const up = (change24 ?? 0) >= 0;
  const label = `$${room.symbol} ${change24 == null ? "--" : `${up ? "+" : ""}${change24.toFixed(1)}%`}   `;
  const col = change24 == null ? "#94a3b8" : up ? GREEN : "#f87171";
  room.fx.push((c, t) => {
    c.save();
    c.beginPath();
    c.rect(x, y, w, 7);
    c.clip();
    const lw = label.length * 4;
    const off = Math.floor(t / 90) % lw;
    for (let k = -1; k < w / lw + 1; k++) tiny(c, label, x + 1 + k * lw - off, y + 1, col);
    c.restore();
  });
}

// ---------- lighting ----------

export function pendant(room: Room, x: number, color = "#fde68a", drop = 10, shadeColor = "#1f2937") {
  const { ctx } = room;
  rect(ctx, x, 0, 1, drop, "#2a2b30");
  rect(ctx, x - 3, drop, 7, 3, shadeColor);
  rect(ctx, x - 4, drop + 2, 9, 1, shade(shadeColor, -0.3));
  room.fx.push((c, t) => {
    rect(c, x - 1, drop + 3, 3, 1, color);
    c.save();
    c.globalCompositeOperation = "lighter";
    const a = 0.05 + 0.01 * Math.sin(t / 700 + x);
    const g = c.createLinearGradient(0, drop + 3, 0, WALL + 10);
    g.addColorStop(0, rgba(color, a * 2.2));
    g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 3, drop + 3);
    c.lineTo(x + 4, drop + 3);
    c.lineTo(x + 24, WALL + 10);
    c.lineTo(x - 23, WALL + 10);
    c.fill();
    c.restore();
  });
}

export function bulb(room: Room, x: number, flicker = true) {
  rect(room.ctx, x, 0, 1, 12, "#1f2023");
  room.fx.push((c, t) => {
    const on = !flicker || Math.sin(t / 110 + x) > -0.92;
    rect(c, x - 1, 12, 3, 3, on ? "#fef3c7" : "#57534e");
    if (on) glow(c, x, 14, 30, "#fef3c7", 0.1);
  });
}

/** Overall tint for the room's mood of light; drawn last over the background. */
export function ambient(room: Room, color: string, a: number) {
  rect(room.ctx, 0, 0, ROOM_W, ROOM_H, rgba(color, a));
}

export function vignette(room: Room) {
  const { ctx } = room;
  const g = ctx.createLinearGradient(0, 0, ROOM_W, 0);
  g.addColorStop(0, "rgba(0,0,0,0.28)");
  g.addColorStop(0.12, "rgba(0,0,0,0)");
  g.addColorStop(0.88, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  const v = ctx.createLinearGradient(0, 0, 0, ROOM_H);
  v.addColorStop(0, "rgba(0,0,0,0.25)");
  v.addColorStop(0.2, "rgba(0,0,0,0)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
}

export { mix, shade, rect, box, outline, glow, rgba, noise, bands };
