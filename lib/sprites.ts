// Original pixel art for Pump Tower, drawn as character maps.
// "." is transparent; every other character is looked up in the palette.

export type Pal = Record<string, string>;
export type Sprite = { w: number; h: number; rows: string[] };

const s = (rows: string[]): Sprite => ({ w: rows[0].length, h: rows.length, rows });

const cache = new Map<string, HTMLCanvasElement>();

/** Bakes a sprite+palette into a small canvas so each frame is a single drawImage. */
export function baked(key: string, sp: Sprite, pal: Pal): HTMLCanvasElement {
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

// ---------- citizens (7x12, two walk frames) ----------
export const CITIZEN = [
  s([
    "..hhh..",
    ".hhhhh.",
    ".hsess.",
    ".sssss.",
    "..sss..",
    ".bbbbb.",
    "sbbbbbs",
    "sbbbbbs",
    ".bbbbb.",
    ".ll.ll.",
    ".ll.ll.",
    ".kk.kk.",
  ]),
  s([
    "..hhh..",
    ".hhhhh.",
    ".hsess.",
    ".sssss.",
    "..sss..",
    ".bbbbb.",
    "sbbbbbs",
    "sbbbbbs",
    ".bbbbb.",
    "..lll..",
    ".ll.l..",
    ".k..kk.",
  ]),
];

// Accessories drawn over the base citizen, same 7x12 grid.
export const ACCESSORY: Record<string, Sprite> = {
  hoodie: s([".ggggg.", "g.....g", "g......", ".......", ".......", ".......", ".......", ".......", ".......", ".......", ".......", "......."]),
  cap: s(["..ccc..", ".ccccccc", ".......", ".......", ".......", ".......", ".......", ".......", ".......", ".......", ".......", "......."].map((r) => r.slice(0, 7))),
  suit: s([".......", ".......", ".......", ".......", ".......", "..wtw..", "...t...", "...t...", ".......", ".......", ".......", "......."]),
  chain: s([".......", ".......", ".......", ".......", ".......", ".y...y.", "..yyy..", "...y...", ".......", ".......", ".......", "......."]),
  crown: s(["y.y.y..", "yyyyy..", ".......", ".......", ".......", ".......", ".......", ".......", ".......", ".......", ".......", "......."].map((r) => "." + r.slice(0, 6))),
};

export const OUTFIT_BODY: Record<string, { b: string; l: string }> = {
  none: { b: "#5b6170", l: "#272a33" },
  hoodie: { b: "#8b9099", l: "#2a2d36" },
  pumptee: { b: "#86efac", l: "#1f2937" },
  cap: { b: "#86efac", l: "#1f2937" },
  suit: { b: "#16171c", l: "#16171c" },
  chain: { b: "#101114", l: "#22252d" },
  crown: { b: "#3b1f5e", l: "#16171c" },
};

export const SKINS = ["#f1c7a0", "#d9a273", "#a8714a", "#6e4630", "#f5d6b8"];
export const HAIRS = ["#1b1b1f", "#5a3a22", "#c9a24a", "#8a3b2a", "#d8d8d8"];

// ---------- pets ----------
export const PETS: Record<string, { sp: Sprite[]; pal: Pal }> = {
  rat: {
    sp: [s(["........", ".....aa.", "aaaaaaea", ".aaaaaa.", ".a.a..a."]), s(["........", ".....aa.", "aaaaaaea", ".aaaaaa.", "..a.aa.."])],
    pal: { a: "#8a8f98", e: "#ff6b6b" },
  },
  cat: {
    sp: [s(["a.....a.", "a....aaa", ".aaaaaea", ".aaaaaa.", ".a.a.a.a"]), s(["a.....a.", "a....aaa", ".aaaaaea", ".aaaaaa.", "..a.a.a."])],
    pal: { a: "#e08a3c", e: "#111" },
  },
  dog: {
    sp: [s(["......a.", "aa...aaa", ".aaaaaea", ".awwwaa.", ".a.a.a.a"]), s(["......a.", "aa...aaa", ".aaaaaea", ".awwwaa.", "..a.a.a."])],
    pal: { a: "#d98c3f", w: "#f4e6d0", e: "#111" },
  },
  frog: {
    sp: [s(["..e..e..", ".aaaaaa.", "aaaaaaaa", "aawwwwaa", ".a....a."]), s(["........", "..e..e..", ".aaaaaa.", "aawwwwaa", "a......a"])],
    pal: { a: "#4ade80", w: "#bbf7d0", e: "#111" },
  },
  ape: {
    sp: [s(["..aaa...", ".awwwa..", ".aweea..", "aaaaaaa.", ".a...a.."]), s(["..aaa...", ".awwwa..", ".aweea..", ".aaaaaa.", "a.....a."])],
    pal: { a: "#6b4a2f", w: "#c9a27a", e: "#111" },
  },
  bull: {
    sp: [s(["w......w", "wa....aw", ".aaaaaea", ".aaaaaa.", ".a.a.a.a"]), s(["w......w", "wa....aw", ".aaaaaea", ".aaaaaa.", "..a.a.a."])],
    pal: { a: "#e5b93c", w: "#fff7d6", e: "#111" },
  },
};

// ---------- furniture (sits on the floor line; drawn bottom aligned) ----------
export const FURNITURE: Record<string, { sp: Sprite; pal: Pal; hang?: boolean }> = {
  crate: { sp: s(["aaaaaaaa", "a.a..a.a", "aaaaaaaa", "a.a..a.a", "aaaaaaaa"]), pal: { a: "#3b82f6" } },
  lamp: {
    sp: s(["..gg..", ".gGGg.", ".gGgg.", ".gggG.", "..gg..", "..mm..", ".mmmm."]),
    pal: { g: "#22c55e", G: "#bbf7d0", m: "#9ca3af" },
  },
  beanbag: { sp: s(["..aaaa...", ".aaaaaaa.", "aaabaaaaa", "aaaaaaaaa", ".aaaaaaa."]), pal: { a: "#a855f7", b: "#c084fc" } },
  plant: {
    sp: s(["g..g..g", ".gg.gg.", "g.ggg.g", ".ggggg.", "...g...", "..ppp..", "..ppp..", "...p..."]),
    pal: { g: "#22c55e", p: "#b45309" },
  },
  couch: {
    sp: s(["aaaaaaaaaaaaaa", "aAAAAAAAAAAAAa", "aAAAAAAAAAAAAa", "aaaaaaaaaaaaaa", "d............d"]),
    pal: { a: "#15803d", A: "#22c55e", d: "#1f2937" },
  },
  arcade: {
    sp: s(["kkkkkkk", "kgggggk", "kgGgGgk", "kgggggk", "kkkkkkk", "krkbkkk", "kkkkkkk", "kkkkkkk", "kkkkkkk"]),
    pal: { k: "#1e1b4b", g: "#0f172a", G: "#86efac", r: "#ef4444", b: "#3b82f6" },
  },
  tank: {
    sp: s(["wwwwwwwwww", "wbbbbbbbbw", "wbbobbbbbw", "wbbbbbbobw", "wbgbbgbbbw", "wwwwwwwwww", ".k......k.", ".k......k."]),
    pal: { w: "#cbd5e1", b: "#0e7490", o: "#fb923c", g: "#22c55e", k: "#1f2937" },
  },
  chart: {
    sp: s(["kkkkkkkkkkkk", "k..........k", "k.......g..k", "k..r..g.g..k", "k.rgg.g....k", "k.r..g.....k", "kkkkkkkkkkkk", ".....kk.....", "...kkkkkk..."]),
    pal: { k: "#111827", ".": "#030712", g: "#86efac", r: "#ef4444" },
  },
  piano: {
    sp: s(["kkkkkkkkkkk.", "kkkkkkkkkkkk", "wkwkwwkwkwk.", "wwwwwwwwwww.", ".k.......k..", ".k.......k.."]),
    pal: { k: "#0b0b0e", w: "#f1f5f9" },
  },
  throne: {
    sp: s(["y.y.y...", "yyyyy...", "yrrry...", "yrrry...", "yrrryyyy", "yyyyyyyy", "y......y", "y......y"]),
    pal: { y: "#facc15", r: "#7f1d1d" },
  },
  chandelier: {
    sp: s(["....y....", "....y....", ".yyyyyyy.", "y.c.y.c.y", "c.......c"]),
    pal: { y: "#facc15", c: "#fef9c3" },
    hang: true,
  },
};
