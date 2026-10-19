// Shop furniture drawn in the same style as the themed rooms, plus the icons the
// catalog shows. Bought pieces are baked into the room background in a row of
// slots across the floor, so they cost nothing extra to animate.
import { GOLD, box, glow, px, rect, shade } from "./pixel";
import { citizenSprite, petSprite, type Look } from "./people";
import { BACK, type Room, makeRoom } from "./rooms/kit";
import { aquarium, arcade, chandelier, couch, plant, piano } from "./rooms/props";

import { MEME_PIECES, type Piece } from "./memepieces";

export const PIECES: Record<string, Piece> = {
  crate: {
    w: 10,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 8, 10, 8, "#2563eb");
      for (let i = 0; i < 3; i++) rect(ctx, x + 2 + i * 3, base - 6, 2, 4, "#1d4ed8");
      rect(ctx, x + 3, base - 11, 3, 3, "#f5f5f4"); // candle
      room.fx.push((c, t) => {
        rect(c, x + 4, base - 13 - (Math.floor(t / 200) % 2), 1, 2, "#fbbf24");
        glow(c, x + 4, base - 12, 7, "#fbbf24", 0.18);
      });
    },
  },
  lamp: {
    w: 7,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 3, 7, 3, "#9ca3af");
      rect(ctx, x + 1, base - 15, 5, 12, "#14532d");
      box(ctx, x + 2, base - 17, 3, 2, "#9ca3af");
      room.fx.push((c, t) => {
        rect(c, x + 1, base - 15, 5, 12, "#166534");
        for (let i = 0; i < 3; i++) {
          const k = (t / (1800 + i * 500) + i / 3) % 1;
          const by = base - 5 - Math.round(Math.sin(k * Math.PI) * 8);
          rect(c, x + 2 + (i % 2), by, 2 + (i % 2), 2, "#86efac");
        }
        glow(c, x + 3, base - 9, 14, "#4ade80", 0.14);
      });
    },
  },
  beanbag: {
    w: 15,
    draw(room, x, base) {
      const { ctx } = room;
      const c = "#a855f7";
      rect(ctx, x + 2, base - 9, 11, 9, c);
      rect(ctx, x, base - 6, 15, 6, c);
      rect(ctx, x + 3, base - 9, 8, 1, shade(c, 0.3));
      rect(ctx, x + 1, base - 6, 3, 2, shade(c, 0.2));
      rect(ctx, x + 4, base - 5, 7, 2, shade(c, -0.2)); // dent where you sit
      rect(ctx, x, base - 1, 15, 1, shade(c, -0.45));
    },
  },
  plant: {
    w: 14,
    draw(room, x, base) {
      plant(room, x + 3, "l", base);
    },
  },
  couch: {
    w: 32,
    draw(room, x, base) {
      couch(room, x + 2, 28, "#15803d", base);
    },
  },
  arcade: {
    w: 14,
    draw(room, x, base) {
      arcade(room, x, "#1e1b4b", base);
    },
  },
  tank: {
    w: 26,
    draw(room, x, base) {
      box(room.ctx, x, base - 8, 26, 8, "#3f2a1a");
      rect(room.ctx, x + 3, base - 6, 20, 1, "#2a1b10");
      aquarium(room, x + 1, base - 22, 24, 13);
    },
  },
  chart: {
    w: 26,
    draw(room, x, base) {
      const { ctx } = room;
      rect(ctx, x + 4, base - 7, 1, 7, "#374151");
      rect(ctx, x + 21, base - 7, 1, 7, "#374151");
      box(ctx, x, base - 8, 26, 2, "#1f2937");
      box(ctx, x, base - 25, 26, 17, "#111827");
      rect(ctx, x + 1, base - 24, 24, 15, "#030712");
      room.fx.push((c, t) => {
        const step = Math.floor(t / 500);
        let y = base - 16;
        for (let i = 0; i < 7; i++) {
          const v = Math.sin((i + step) * 7.31 + x) * 0.5 + 0.5;
          const up = v < 0.62;
          y = Math.max(base - 23, Math.min(base - 12, y + (up ? -1 : 1)));
          const len = 2 + Math.floor(v * 4);
          rect(c, x + 2 + i * 3, up ? y - len : y, 2, len, up ? "#86efac" : "#ef4444");
        }
        glow(c, x + 13, base - 16, 18, "#4ade80", 0.07);
      });
    },
  },
  piano: {
    w: 28,
    draw(room, x, base) {
      piano(room, x, base);
    },
  },
  throne: {
    w: 14,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x + 1, base - 22, 12, 14, GOLD);
      for (const sx of [1, 6, 11]) rect(ctx, x + sx, base - 25, 2, 3, GOLD);
      px(ctx, x + 7, base - 24, "#ef4444");
      rect(ctx, x + 3, base - 20, 8, 11, "#7f1d1d");
      rect(ctx, x + 3, base - 20, 8, 1, "#991b1b");
      box(ctx, x, base - 10, 14, 4, GOLD);
      rect(ctx, x + 2, base - 9, 10, 2, "#991b1b");
      rect(ctx, x + 1, base - 6, 2, 6, shade(GOLD, -0.3));
      rect(ctx, x + 11, base - 6, 2, 6, shade(GOLD, -0.3));
      room.fx.push((c, t) => {
        if (Math.floor(t / 700) % 5 === 0) px(c, x + 2 + (Math.floor(t / 700) % 10), base - 22, "#ffffff");
      });
    },
  },
  chandelier: {
    w: 0,
    hang: true,
    draw(room, x) {
      chandelier(room, x);
    },
  },
  ...MEME_PIECES,
};

/** Lays bought furniture out left to right across the open middle of the room. */
export function placeFurniture(room: Room, ids: string[], base = BACK + 3) {
  const standing = ids.filter((id) => PIECES[id] && !PIECES[id].hang);
  const total = standing.reduce((s, id) => s + PIECES[id].w, 0) + Math.max(0, standing.length - 1) * 8;
  let x = Math.round(128 - total / 2);
  for (const id of standing) {
    PIECES[id].draw(room, x, base);
    x += PIECES[id].w + 8;
  }
  if (ids.includes("chandelier")) PIECES.chandelier.draw(room, 128, base);
}

const ICON_LOOK: Look = { skin: "#d9a273", hair: "#17171b", style: 0, shirt: "#64748b", pants: "#1f2937", shoes: "#f8fafc", shades: false };

/** Catalog icon: the furniture piece, the pet, or a citizen wearing the outfit. */
export function itemIcon(id: string, kind: "furniture" | "pet" | "outfit"): HTMLCanvasElement | null {
  if (kind === "pet") return petSprite(id, 0);
  if (kind === "outfit") return citizenSprite(ICON_LOOK, id, 0);
  const piece = PIECES[id];
  if (!piece) return null;
  const c = document.createElement("canvas");
  c.width = 34;
  c.height = 30;
  const ctx = c.getContext("2d")!;
  const room = makeRoom(ctx, { tier: 3, accent: "#4ade80", mood: "flat", symbol: "PTWR", logo: null, usd: null, isHouse: false, seed: id });
  if (piece.hang) {
    ctx.translate(0, 4);
    piece.draw(room, 17, 0);
  } else piece.draw(room, Math.round((34 - piece.w) / 2), 29);
  for (const f of room.fx) f(ctx, 1000);
  return c;
}
