// Citizens, pets and their shop icons. Citizens are drawn procedurally so every
// floor gets its own mix of faces, hair and clothes; outfits bought in the shop
// are layered on top. Each pose is baked once into a tiny cached canvas.
import { GOLD, GREEN, GREEN_HI, baked, rect, px, shade, sprite } from "./pixel";

export const CIT_W = 11;
export const CIT_H = 23;

export type Look = {
  skin: string;
  hair: string;
  style: number;
  shirt: string;
  pants: string;
  shoes: string;
  shades: boolean;
};

const SKINS = ["#f6d3b3", "#eebf98", "#d9a273", "#b97d52", "#8d5a3b", "#5e3b28"];
const HAIRS = ["#17171b", "#3b2417", "#6b4423", "#c9a24a", "#e9d7a5", "#8a3b2a", "#d8d8d8", "#7c3aed", "#ec4899", "#22c55e"];
const SHIRTS = ["#ef4444", "#f59e0b", "#3b82f6", "#e5e7eb", "#a855f7", "#14b8a6", "#f472b6", "#64748b", "#facc15", "#0ea5e9"];
const PANTS = ["#1e3a8a", "#27272a", "#44403c", "#1f2937", "#78350f", "#334155"];
const SHOES = ["#f8fafc", "#111827", "#7c2d12", "#ef4444"];

/** Same seed, same person: a floor keeps its residents between visits. */
export function lookFor(r: () => number, tier: number): Look {
  const p = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  // wild hair colours turn up more on fancier floors
  const hair = r() < 0.12 + tier * 0.03 ? p(HAIRS.slice(7)) : p(HAIRS.slice(0, 7));
  return { skin: p(SKINS), hair, style: Math.floor(r() * 6), shirt: p(SHIRTS), pants: p(PANTS), shoes: p(SHOES), shades: r() < tier * 0.08 };
}

type C = CanvasRenderingContext2D;

function paintCitizen(ctx: C, k: Look, outfit: string | null, frame: number) {
  const bx = 1;
  const by = 3;
  let shirt = k.shirt;
  let pants = k.pants;
  let shoes = k.shoes;
  if (outfit === "hoodie") shirt = "#8b9099";
  if (outfit === "pumptee") shirt = GREEN;
  if (outfit === "suit") (shirt = "#17181d"), (pants = "#17181d"), (shoes = "#0b0b0e");
  if (outfit === "chain") shirt = "#101114";
  if (outfit === "crown") shirt = "#5b21b6";
  const walking = frame > 0;
  const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  // legs and shoes
  const ly = by + 15;
  const left = bx + 2 - (walking ? Math.abs(stride) : 0);
  const right = bx + 5 + (walking ? Math.abs(stride) : 0);
  rect(ctx, left, ly, 3, 4 - (stride > 0 ? 1 : 0), pants);
  rect(ctx, right, ly, 3, 4 - (stride < 0 ? 1 : 0), shade(pants, -0.18));
  rect(ctx, left, ly + 4 - (stride > 0 ? 1 : 0), 4, 1, shoes);
  rect(ctx, right, ly + 4 - (stride < 0 ? 1 : 0), 4, 1, shade(shoes, -0.15));

  // torso, belt, arms
  rect(ctx, bx + 1, by + 8, 8, 7, shirt);
  rect(ctx, bx + 1, by + 8, 8, 1, shade(shirt, 0.22));
  rect(ctx, bx + 8, by + 9, 1, 6, shade(shirt, -0.22));
  rect(ctx, bx + 1, by + 14, 8, 1, outfit === "crown" ? GOLD : shade(pants, -0.35));
  const swing = walking ? (frame === 1 ? 1 : frame === 3 ? -1 : 0) : 0;
  rect(ctx, bx, by + 9, 1, 4 + swing, shade(shirt, -0.08));
  px(ctx, bx, by + 13 + swing, k.skin);
  rect(ctx, bx + 9, by + 9, 1, 4 - swing, shade(shirt, -0.3));
  px(ctx, bx + 9, by + 13 - swing, shade(k.skin, -0.1));

  // neck and head
  rect(ctx, bx + 4, by + 7, 2, 1, shade(k.skin, -0.18));
  rect(ctx, bx + 2, by + 1, 6, 6, k.skin);
  rect(ctx, bx + 7, by + 2, 1, 5, shade(k.skin, -0.12));
  px(ctx, bx + 4, by + 4, "#111111");
  px(ctx, bx + 6, by + 4, "#111111");
  px(ctx, bx + 5, by + 6, shade(k.skin, -0.3));
  if (k.shades || outfit === "suit") rect(ctx, bx + 3, by + 4, 5, 1, "#0b0b0e");

  // hair
  const h = k.hair;
  const hd = shade(h, -0.25);
  const style = outfit === "cap" || outfit === "crown" ? 0 : k.style;
  if (style === 0) {
    rect(ctx, bx + 2, by, 6, 2, h);
    rect(ctx, bx + 2, by + 2, 1, 2, hd);
  } else if (style === 1) {
    rect(ctx, bx + 1, by, 7, 2, h);
    rect(ctx, bx + 1, by + 2, 2, 6, hd);
    px(ctx, bx + 7, by + 2, h);
  } else if (style === 2) {
    rect(ctx, bx + 2, by, 6, 2, h);
    rect(ctx, bx + 3, by - 2, 3, 2, hd);
    px(ctx, bx + 2, by + 2, hd);
  } else if (style === 3) {
    rect(ctx, bx + 4, by - 2, 2, 3, h);
    rect(ctx, bx + 2, by + 1, 6, 1, hd);
  } else if (style === 4) {
    px(ctx, bx + 3, by + 1, shade(k.skin, 0.35)); // bald, with a shine
    rect(ctx, bx + 2, by + 3, 1, 2, hd);
  } else {
    rect(ctx, bx + 1, by - 1, 8, 3, h);
    rect(ctx, bx + 1, by + 2, 1, 3, hd);
    px(ctx, bx + 8, by + 2, hd);
    px(ctx, bx + 3, by - 1, shade(h, 0.2));
  }

  // outfit details
  if (outfit === "hoodie") {
    rect(ctx, bx + 1, by + 1, 1, 7, shade(shirt, -0.15));
    rect(ctx, bx + 2, by + 7, 6, 1, shade(shirt, -0.25));
    rect(ctx, bx + 3, by + 11, 4, 2, shade(shirt, -0.12));
    px(ctx, bx + 4, by + 8, "#e5e7eb");
    px(ctx, bx + 6, by + 8, "#e5e7eb");
  } else if (outfit === "pumptee") {
    rect(ctx, bx + 4, by + 10, 2, 2, "#f8fafc");
    rect(ctx, bx + 6, by + 10, 1, 2, "#166534");
  } else if (outfit === "cap") {
    rect(ctx, bx + 2, by - 1, 6, 3, "#16a34a");
    rect(ctx, bx + 2, by - 1, 6, 1, GREEN_HI);
    rect(ctx, bx + 7, by + 1, 3, 1, "#14532d");
    px(ctx, bx + 4, by, "#f8fafc");
  } else if (outfit === "suit") {
    rect(ctx, bx + 4, by + 8, 2, 4, "#f8fafc");
    rect(ctx, bx + 4, by + 9, 1, 4, "#b91c1c");
    px(ctx, bx + 7, by + 9, GREEN);
  } else if (outfit === "chain") {
    px(ctx, bx + 3, by + 8, GOLD);
    px(ctx, bx + 3, by + 9, GOLD);
    px(ctx, bx + 4, by + 10, GOLD);
    px(ctx, bx + 6, by + 8, GOLD);
    px(ctx, bx + 6, by + 9, GOLD);
    px(ctx, bx + 5, by + 10, GOLD);
    rect(ctx, bx + 4, by + 11, 2, 2, "#fde68a");
  } else if (outfit === "crown") {
    rect(ctx, bx + 2, by - 1, 6, 2, GOLD);
    px(ctx, bx + 2, by - 2, GOLD);
    px(ctx, bx + 4, by - 3, GOLD);
    px(ctx, bx + 4, by - 2, GOLD);
    px(ctx, bx + 7, by - 2, GOLD);
    px(ctx, bx + 5, by - 1, "#ef4444");
    rect(ctx, bx + 1, by + 8, 1, 7, GOLD);
  }
}

const cache = new Map<string, HTMLCanvasElement>();

/** frame 0 is standing; 1..3 cycle the walk. */
export function citizenSprite(k: Look, outfit: string | null, frame: number): HTMLCanvasElement {
  const key = `${k.skin}${k.hair}${k.style}${k.shirt}${k.pants}${k.shoes}${k.shades ? 1 : 0}:${outfit}:${frame}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = CIT_W;
  c.height = CIT_H;
  paintCitizen(c.getContext("2d")!, k, outfit, frame);
  cache.set(key, c);
  if (cache.size > 600) cache.delete(cache.keys().next().value!);
  return c;
}

/** Walk cycle: stand, step, stand, step the other way. */
export const walkFrame = (step: number) => [0, 1, 0, 3][Math.floor(step * 8) % 4];

// ---------- pets ----------

type PetDef = { frames: string[][]; pal: Record<string, string>; speed: number; hop?: boolean };

export const PETS: Record<string, PetDef> = {
  rat: {
    speed: 16,
    pal: { a: "#8a8f98", b: "#6b7079", p: "#f9a8d4", e: "#111111", t: "#f9a8d4" },
    frames: [
      ["........aa..", "......aaaa..", "..aaaaaaaea.", "taaaaaaaaaap", ".baaaaaaab..", "..b.b..b.b.."],
      ["........aa..", "......aaaa..", "..aaaaaaaea.", "taaaaaaaaaap", ".baaaaaaab..", ".b..b.b..b.."],
    ],
  },
  cat: {
    speed: 11,
    pal: { a: "#e08a3c", b: "#b86a26", w: "#fde4c8", e: "#111111", p: "#f472b6" },
    frames: [
      ["a.......a.a.", "a.......aaa.", ".a......aeae", ".aaaaaaaawwp", ".aaaabaaaa..", ".a.a...a.a..", ".b.b...b.b.."],
      ["a.......a.a.", "a.......aaa.", ".a......aeae", ".aaaaaaaawwp", ".aaaabaaaa..", "..a.a.a.a...", "..b.b.b.b..."],
    ],
  },
  dog: {
    speed: 13,
    pal: { a: "#d98c3f", b: "#a8662a", w: "#f4e6d0", e: "#111111", n: "#1f1f1f" },
    frames: [
      ["a........a.a", ".a.......aaa", "..a......aean", "..aaaaaaawww.", "..awwwwwaa...", "..a.a...a.a..", "..b.b...b.b.."],
      ["a........a.a", ".a.......aaa", "..a......aean", "..aaaaaaawww.", "..awwwwwaa...", "...a.a.a.a...", "...b.b.b.b..."],
    ],
  },
  frog: {
    speed: 9,
    hop: true,
    pal: { a: "#4ade80", b: "#16a34a", w: "#dcfce7", e: "#111111", m: "#166534" },
    frames: [
      ["..ee..ee..", ".aaeaaeaa.", "aaaaaaaaaa", "amwwwwwwma", ".bwwwwwwb.", "bb......bb"],
      ["..ee..ee..", ".aaeaaeaa.", "aaaaaaaaaa", "amwwwwwwma", "b.bwwwwb.b", "b........b"],
    ],
  },
  ape: {
    speed: 8,
    pal: { a: "#5b3b25", b: "#3f2817", w: "#c9a27a", e: "#111111", c: "#e8b931" },
    frames: [
      ["...aaaa...", "..awwwwa..", "..aweewa..", "..awwwwa..", "...aaaa...", ".aaaccaaa.", "a.aaaaaa.a", "w.aaaaaa.w", "..aa..aa..", "..bb..bb.."],
      ["...aaaa...", "..awwwwa..", "..aweewa..", "..awwwwa..", "...aaaa...", ".aaaccaaa.", "a.aaaaaa.a", "w.aaaaaa.w", "...aaaa...", "..bb..bb.."],
    ],
  },
  bull: {
    speed: 10,
    pal: { a: "#e8b931", b: "#b8901c", w: "#fff7d6", e: "#111111", n: "#9a7412" },
    frames: [
      ["w..........w", "ww........ww", ".aa......aea", ".aaaaaaaaaan", ".aaaaaaaaaa.", ".aaaaabaaaa.", ".a.a....a.a.", ".b.b....b.b."],
      ["w..........w", "ww........ww", ".aa......aea", ".aaaaaaaaaan", ".aaaaaaaaaa.", ".aaaaabaaaa.", "..a.a..a.a..", "..b.b..b.b.."],
    ],
  },
};

export function petSprite(id: string, frame: number): HTMLCanvasElement | null {
  const p = PETS[id];
  if (!p) return null;
  const rows = p.frames[frame % p.frames.length];
  const w = Math.max(...rows.map((r) => r.length));
  return baked(`pet:${id}:${frame}`, sprite(rows.map((r) => r.padEnd(w, "."))), p.pal);
}

// ---------- what citizens say ----------

export type Talk = { symbol: string; days: number; change24: number | null; usd: number | null; tier: number; isHouse: boolean; lobby: boolean };

const fmtUsd = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Math.round(n)}`);

/** Lines come from the floor's own numbers so the tower talks about your bags. */
export function lineFor(r: () => number, t: Talk): string {
  const sym = `$${t.symbol}`;
  const lines: string[] = [];
  if (t.lobby) lines.push("first day here", "need a bag", "nice lobby", "rent is free", "wen floor");
  else {
    if (t.days >= 1) lines.push(`${Math.floor(t.days)}d no sell`, "diamond hands");
    else lines.push("just moved in", "smells new");
    if (t.change24 != null) {
      const c = `${t.change24 >= 0 ? "+" : ""}${t.change24.toFixed(0)}%`;
      if (t.change24 >= 12) lines.push(`${sym} ${c}!`, "we are so back", "send it");
      else if (t.change24 <= -12) lines.push(`${sym} ${c}..`, "its fine", "buying the dip", "just a shakeout");
      else lines.push(`${sym} ${c}`, "crabbing", "patience");
    }
    if (t.usd != null && t.usd > 0) lines.push(`bag ${fmtUsd(t.usd)}`);
    if ((t.usd ?? 0) >= 10_000) lines.push("whale alert", "need a bigger vault");
    if (t.tier >= 5) lines.push("view is crazy", "penthouse life");
    else lines.push(`${sym} to the top`, "wen penthouse");
    if (t.isHouse) lines.push("gm tower", "burn day", "hold the tower");
    lines.push("gm", "wagmi", "lfg");
  }
  return lines[Math.floor(r() * lines.length)].toUpperCase();
}
