// Pixel drawing kit shared by the rooms, props and citizens. Everything works in
// logical pixels; the canvas is scaled up with image-rendering: pixelated.

export type Ctx = CanvasRenderingContext2D;

export const PIXEL_FONT = "'Press Start 2P', monospace";
export const GREEN = "#86efac";
export const GREEN_HI = "#4ade80";
export const GOLD = "#e8b931";

export function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export const px = (ctx: Ctx, x: number, y: number, c: string) => rect(ctx, x, y, 1, 1, c);

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** Lighten (amt > 0) or darken (amt < 0) a colour; amt is -1..1. */
export function shade(hex: string, amt: number) {
  const [r, g, b] = parse(hex);
  return amt >= 0 ? toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt) : toHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

export function mix(a: string, b: string, k: number) {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** A solid block with a 1px highlight on top/left and shadow on bottom/right, so props read as 3D. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, c: string, opts: { outline?: boolean } = {}) {
  rect(ctx, x, y, w, h, c);
  rect(ctx, x, y, w, 1, shade(c, 0.28));
  rect(ctx, x, y, 1, h, shade(c, 0.14));
  rect(ctx, x, y + h - 1, w, 1, shade(c, -0.35));
  rect(ctx, x + w - 1, y, 1, h, shade(c, -0.22));
  if (opts.outline) outline(ctx, x - 1, y - 1, w + 2, h + 2, shade(c, -0.6));
}

export function outline(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  rect(ctx, x, y, w, 1, c);
  rect(ctx, x, y + h - 1, w, 1, c);
  rect(ctx, x, y, 1, h, c);
  rect(ctx, x + w - 1, y, 1, h, c);
}

/** Vertical gradient band built from a few flat steps (keeps the pixel look). */
export function bands(ctx: Ctx, x: number, y: number, w: number, h: number, top: string, bottom: string, steps = 4) {
  const sh = Math.ceil(h / steps);
  for (let i = 0; i < steps; i++) rect(ctx, x, y + i * sh, w, Math.min(sh, h - i * sh), mix(top, bottom, i / (steps - 1 || 1)));
}

/** Sprinkle noise pixels for texture (plaster, concrete, carpet). */
export function noise(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number, colors: string[], density = 0.04) {
  const n = Math.floor(w * h * density);
  for (let i = 0; i < n; i++) px(ctx, x + Math.floor(r() * w), y + Math.floor(r() * h), colors[Math.floor(r() * colors.length)]);
}

/** Soft additive glow, used for lamps and neon. */
export function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Light cone from a ceiling lamp down to the floor. */
export function cone(ctx: Ctx, x: number, top: number, bottom: number, spread: number, color: string, a: number) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 2, top);
  ctx.lineTo(x + 2, top);
  ctx.lineTo(x + spread, bottom);
  ctx.lineTo(x - spread, bottom);
  ctx.closePath();
  ctx.fill();
}

export function text(ctx: Ctx, s: string, x: number, y: number, color: string, size = 8, align: CanvasTextAlign = "left") {
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.fillText(s, Math.round(x), Math.round(y));
  ctx.textAlign = "left";
}

/** Tiny 3x5 pixel font for LED tickers, clocks and price tags; crisp at any scale. */
const GLYPHS: Record<string, string> = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
  "5": "111100111001111", "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", "$": "011110010011110", "%": "101001010100101", "+": "000010111010000", "-": "000000111000000",
  ".": "000000000000010", ":": "000010000010000", "/": "001001010100100", "!": "010010010000010", "?": "111001010000010",
  " ": "000000000000000", "#": "101111101111101", "'": "010010000000000", ",": "000000000010100", "<": "001010100010001",
  ">": "100010001010100", "*": "000101010101000", "^": "010101000000000", "x": "000101010101000",
};

export function tiny(ctx: Ctx, s: string, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of s.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let i = 0; i < 15; i++) if (g[i] === "1") ctx.fillRect(cx + (i % 3), Math.round(y) + Math.floor(i / 3), 1, 1);
    cx += 4;
  }
  return cx - x;
}

export const tinyWidth = (s: string) => s.length * 4 - 1;

export type Sprite = { w: number; h: number; rows: string[] };
export const sprite = (rows: string[]): Sprite => ({ w: Math.max(...rows.map((r) => r.length)), h: rows.length, rows });

const cache = new Map<string, HTMLCanvasElement>();

/** Bakes a char-map sprite with a palette into a cached canvas ("." is transparent). */
export function baked(key: string, sp: Sprite, pal: Record<string, string>): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = sp.w;
  c.height = sp.h;
  const ctx = c.getContext("2d")!;
  sp.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  cache.set(key, c);
  return c;
}

export function draw(ctx: Ctx, img: CanvasImageSource, x: number, y: number, flip = false, w?: number) {
  if (!flip) return ctx.drawImage(img, Math.round(x), Math.round(y));
  const width = w ?? (img as HTMLCanvasElement).width;
  ctx.save();
  ctx.translate(Math.round(x) + width, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
