// Memecoin furniture for the shop, drawn like the rest of the rooms: a static piece baked into
// the floor's background plus, where it moves, a small effect that runs each frame. Every
// piece stands on `base` and is `w` pixels wide; the shop lays them out in floor slots.
import { GOLD, GREEN, GREEN_HI, box, glow, outline, px, rect, rgba, shade, tiny } from "./pixel";
import type { Room } from "./rooms/kit";
import { slotMachine } from "./rooms/props";

export type Piece = { w: number; draw: (room: Room, x: number, base: number) => void; hang?: boolean };

/** A filled pixel circle. */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    rect(ctx, cx - half, cy + dy, half * 2 + 1, 1, c);
  }
}

export const MEME_PIECES: Record<string, Piece> = {
  // ---------- bare walls ----------
  airdrop: {
    w: 14,
    draw(room, x, base) {
      const { ctx } = room;
      const wood = "#a16207";
      box(ctx, x, base - 9, 14, 9, wood);
      for (const sx of [0, 6, 12]) rect(ctx, x + sx, base - 9, 2, 9, shade(wood, -0.2));
      rect(ctx, x, base - 5, 14, 1, shade(wood, -0.3));
      tiny(ctx, "?", x + 5, base - 8, "#fde68a");
      // folded parachute and straps on top
      rect(ctx, x + 2, base - 13, 10, 4, "#f43f5e");
      rect(ctx, x + 2, base - 13, 10, 1, "#fb7185");
      rect(ctx, x + 5, base - 13, 4, 4, "#f8fafc");
      px(ctx, x + 1, base - 10, "#e5e7eb");
      px(ctx, x + 12, base - 10, "#e5e7eb");
    },
  },
  piggy: {
    w: 13,
    draw(room, x, base) {
      const { ctx } = room;
      const pink = "#f9a8d4";
      rect(ctx, x + 1, base - 8, 10, 6, pink);
      rect(ctx, x + 2, base - 9, 8, 1, pink);
      rect(ctx, x + 2, base - 2, 8, 1, shade(pink, -0.15));
      rect(ctx, x + 11, base - 7, 2, 3, shade(pink, -0.12)); // snout
      px(ctx, x + 12, base - 6, "#be185d");
      px(ctx, x + 9, base - 7, "#111827"); // eye
      rect(ctx, x + 7, base - 10, 2, 1, shade(pink, -0.2)); // ear
      rect(ctx, x + 4, base - 9, 3, 1, "#831843"); // coin slot
      for (const lx of [2, 4, 8, 10]) rect(ctx, x + lx, base - 2, 1, 2, shade(pink, -0.25));
      px(ctx, x, base - 6, shade(pink, -0.2)); // tail
      // a coin drops in every few seconds
      room.fx.push((c, t) => {
        const k = (t / 2600 + x / 97) % 1;
        if (k > 0.3) return;
        const y = base - 17 + Math.round(k * 26);
        if (y < base - 9) rect(c, x + 5, y, 2, 2, GOLD);
      });
    },
  },

  // ---------- 1 day ----------
  rugpull: {
    w: 20,
    draw(room, x, base) {
      const { ctx } = room;
      const red = "#b91c1c";
      // the rug, yanked and rolled up against the wall
      box(ctx, x, base - 6, 18, 6, red);
      for (let i = 0; i < 18; i += 3) rect(ctx, x + i, base - 6, 1, 6, shade(red, 0.18));
      disc(ctx, x + 17, base - 3, 3, shade(red, -0.15));
      disc(ctx, x + 17, base - 3, 1, "#450a0a");
      // fringe and a little tag
      for (let i = 0; i < 6; i++) px(ctx, x - 1, base - 6 + i, "#fde68a");
      rect(ctx, x + 3, base - 12, 13, 7, "#f8fafc");
      rect(ctx, x + 9, base - 5, 1, 1, "#9ca3af");
      tiny(ctx, "RUG", x + 4, base - 11, "#b91c1c");
    },
  },
  pilllamp: {
    w: 9,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 2, 9, 2, "#27272a");
      rect(ctx, x + 4, base - 6, 1, 4, "#52525b");
      // a giant pump pill, green bottom, white top
      rect(ctx, x + 2, base - 13, 5, 7, GREEN_HI);
      rect(ctx, x + 2, base - 20, 5, 7, "#f4f4f5");
      rect(ctx, x + 3, base - 21, 3, 1, "#f4f4f5");
      rect(ctx, x + 3, base - 6, 3, 1, GREEN_HI);
      rect(ctx, x + 2, base - 13, 5, 1, "#14532d");
      rect(ctx, x + 3, base - 19, 1, 5, "#ffffff");
      room.fx.push((c, t) => glow(c, x + 4, base - 13, 16, GREEN_HI, 0.12 + 0.04 * Math.sin(t / 600)));
    },
  },
  candlecake: {
    w: 13,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 3, 13, 3, "#e5e7eb"); // plate
      rect(ctx, x + 1, base - 9, 11, 6, "#78350f");
      rect(ctx, x + 1, base - 9, 11, 2, "#fef3c7"); // icing
      for (const dx of [2, 5, 9]) px(ctx, x + dx, base - 7, "#fef3c7");
      // three green candles, one taller like a pump
      const h = [3, 5, 4];
      [2, 6, 10].forEach((cx, i) => rect(ctx, x + cx, base - 9 - h[i], 1, h[i], GREEN_HI));
      room.fx.push((c, t) => {
        [2, 6, 10].forEach((cx, i) => {
          const fy = base - 10 - h[i] - (Math.floor(t / 180 + i) % 2);
          px(c, x + cx, fy, "#fbbf24");
          glow(c, x + cx, fy, 4, "#fbbf24", 0.2);
        });
      });
    },
  },

  // ---------- 3 days ----------
  curve: {
    w: 20,
    draw(room, x, base) {
      const { ctx } = room;
      rect(ctx, x + 4, base - 7, 1, 7, "#52525b");
      rect(ctx, x + 15, base - 7, 1, 7, "#52525b");
      box(ctx, x, base - 24, 20, 17, "#0b0b10");
      outline(ctx, x, base - 24, 20, 17, "#1f2937");
      tiny(ctx, "BC", x + 2, base - 22, "#64748b");
      // the bonding curve fills up, then the coin graduates and it starts over
      room.fx.push((c, t) => {
        const k = (t / 7000 + x / 50) % 1;
        const n = Math.floor(k * 16);
        for (let i = 0; i <= 15; i++) {
          const y = base - 9 - Math.round(((i / 15) ** 2) * 11);
          px(c, x + 2 + i, y, i <= n ? GREEN_HI : "#1f2937");
        }
        if (n >= 15) tiny(c, "GO", x + 11, base - 22, Math.floor(t / 150) % 2 ? GOLD : GREEN);
      });
    },
  },
  frogstatue: {
    w: 12,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 5, 12, 5, "#9ca3af"); // plinth
      rect(ctx, x, base - 5, 12, 1, "#d1d5db");
      const g = "#4ade80";
      rect(ctx, x + 2, base - 12, 8, 7, g);
      rect(ctx, x + 1, base - 9, 10, 4, g);
      // big eyes, smug mouth
      for (const ex of [2, 7]) {
        rect(ctx, x + ex, base - 14, 3, 3, g);
        rect(ctx, x + ex, base - 13, 3, 2, "#f8fafc");
        px(ctx, x + ex + 1, base - 13, "#111827");
      }
      rect(ctx, x + 3, base - 8, 6, 1, "#9f1239");
      rect(ctx, x + 2, base - 7, 8, 1, shade(g, -0.25));
    },
  },
  portrait: {
    w: 14,
    draw(room, x, base) {
      const { ctx } = room;
      // easel holding a portrait with laser eyes
      rect(ctx, x + 2, base - 24, 1, 24, "#78350f");
      rect(ctx, x + 11, base - 24, 1, 24, "#78350f");
      rect(ctx, x + 6, base - 10, 2, 10, "#5a3a1d");
      box(ctx, x, base - 24, 14, 14, "#b45309");
      rect(ctx, x + 1, base - 23, 12, 12, "#1e293b");
      rect(ctx, x + 4, base - 21, 6, 8, room.accent);
      rect(ctx, x + 3, base - 14, 8, 3, shade(room.accent, -0.3));
      room.fx.push((c, t) => {
        const on = Math.floor(t / 1600) % 3 !== 0;
        for (const ex of [5, 8]) {
          px(c, x + ex, base - 19, on ? "#ef4444" : "#111827");
          if (on) {
            rect(c, x + ex, base - 19, 1, 1, "#fecaca");
            glow(c, x + ex, base - 19, 4, "#ef4444", 0.35);
          }
        }
      });
    },
  },

  // ---------- 7 days ----------
  rocket: {
    w: 14,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 3, 14, 3, "#3f3f46"); // launch pad
      rect(ctx, x + 1, base - 3, 12, 1, "#52525b");
      // body
      rect(ctx, x + 4, base - 22, 6, 17, "#e5e7eb");
      rect(ctx, x + 4, base - 22, 2, 17, "#f8fafc");
      rect(ctx, x + 5, base - 25, 4, 3, "#ef4444");
      rect(ctx, x + 6, base - 27, 2, 2, "#ef4444");
      disc(ctx, x + 7, base - 16, 1, "#38bdf8");
      // fins
      rect(ctx, x + 2, base - 9, 2, 4, "#ef4444");
      rect(ctx, x + 10, base - 9, 2, 4, "#ef4444");
      tiny(ctx, "M", x + 6, base - 12, "#9ca3af");
      // steam and an idling flame
      room.fx.push((c, t) => {
        rect(c, x + 6, base - 5 + (Math.floor(t / 120) % 2), 2, 2, Math.floor(t / 90) % 2 ? "#f97316" : "#fde047");
        for (let i = 0; i < 3; i++) {
          const k = (t / 1400 + i / 3) % 1;
          rect(c, x + 2 + i * 4 - Math.round(k * 2), base - 4 - Math.round(k * 5), 2, 2, rgba("#e5e7eb", 0.5 - k * 0.5));
        }
      });
    },
  },
  safe: {
    w: 17,
    draw(room, x, base) {
      const { ctx } = room;
      const steel = "#4b5563";
      box(ctx, x, base - 16, 17, 16, steel);
      outline(ctx, x + 1, base - 15, 15, 14, shade(steel, -0.3));
      disc(ctx, x + 6, base - 4, 3, "#9ca3af");
      disc(ctx, x + 6, base - 4, 1, "#374151");
      rect(ctx, x + 12, base - 9, 2, 5, "#d1d5db"); // handle
      rect(ctx, x + 1, base - 15, 15, 7, "#111827");
      tiny(ctx, "HODL", x + 1, base - 14, GREEN);
      // the dial ticks round, trying the combination
      room.fx.push((c, t) => {
        const a = Math.floor(t / 300) % 4;
        const d = [
          [0, -2],
          [2, 0],
          [0, 2],
          [-2, 0],
        ][a];
        px(c, x + 6 + d[0], base - 4 + d[1], GOLD);
      });
    },
  },

  // ---------- 14 days ----------
  slots: {
    w: 14,
    draw(room, x, base) {
      slotMachine(room, x, base);
    },
  },
  fountain: {
    w: 24,
    draw(room, x, base) {
      const { ctx } = room;
      const stone = "#94a3b8";
      box(ctx, x, base - 6, 24, 6, stone);
      rect(ctx, x + 2, base - 6, 20, 2, "#0ea5e9");
      rect(ctx, x, base - 7, 24, 1, shade(stone, 0.2));
      // a little whale in the middle
      const blue = "#1e40af";
      rect(ctx, x + 7, base - 12, 10, 5, blue);
      rect(ctx, x + 6, base - 10, 1, 3, blue);
      rect(ctx, x + 17, base - 11, 2, 2, blue);
      rect(ctx, x + 19, base - 13, 2, 2, blue); // tail
      px(ctx, x + 9, base - 11, "#f8fafc");
      rect(ctx, x + 7, base - 8, 10, 1, "#93c5fd");
      room.fx.push((c, t) => {
        for (let i = 0; i < 4; i++) {
          const k = (t / 900 + i / 4) % 1;
          const sx = x + 9 + (i % 2 ? 1 : -1) * Math.round(k * 4);
          const sy = base - 13 - Math.round(Math.sin(k * Math.PI) * 9);
          px(c, sx, sy, k < 0.85 ? "#7dd3fc" : "#e0f2fe");
        }
      });
    },
  },

  // ---------- 30 days ----------
  diamondcase: {
    w: 14,
    draw(room, x, base) {
      const { ctx } = room;
      box(ctx, x, base - 8, 14, 8, "#1f2937"); // pedestal
      rect(ctx, x + 2, base - 6, 10, 1, GOLD);
      // glass case
      rect(ctx, x + 1, base - 22, 12, 14, rgba("#e0f2fe", 0.18));
      outline(ctx, x + 1, base - 22, 12, 14, "#bae6fd");
      // a diamond hand
      rect(ctx, x + 5, base - 13, 4, 5, "#a5f3fc");
      for (let f = 0; f < 4; f++) rect(ctx, x + 5 + f, base - 16 + (f % 2), 1, 3, "#67e8f9");
      rect(ctx, x + 4, base - 12, 1, 3, "#67e8f9");
      rect(ctx, x + 6, base - 12, 2, 1, "#ecfeff");
      room.fx.push((c, t) => {
        const k = Math.floor(t / 400) % 8;
        if (k < 3) px(c, x + 4 + k * 2, base - 18 + k, "#ffffff");
        glow(c, x + 7, base - 13, 10, "#67e8f9", 0.12);
      });
    },
  },
  lambo: {
    w: 32,
    draw(room, x, base) {
      const { ctx } = room;
      const y = "#facc15";
      // low wedge body
      rect(ctx, x + 2, base - 7, 28, 4, y);
      rect(ctx, x + 8, base - 10, 14, 3, y);
      rect(ctx, x + 22, base - 9, 5, 2, y);
      rect(ctx, x + 3, base - 8, 5, 1, y);
      rect(ctx, x + 10, base - 9, 10, 2, "#1e293b"); // windows
      rect(ctx, x + 15, base - 9, 1, 2, y);
      rect(ctx, x + 2, base - 4, 28, 1, shade(y, -0.35));
      rect(ctx, x + 2, base - 7, 28, 1, "#fef08a");
      px(ctx, x + 29, base - 6, "#fef3c7"); // headlight
      px(ctx, x + 2, base - 6, "#ef4444"); // tail light
      for (const wx of [7, 24]) {
        disc(ctx, x + wx, base - 2, 2, "#111827");
        px(ctx, x + wx, base - 2, "#9ca3af");
      }
      tiny(ctx, "WEN", x + 4, base - 15, GOLD);
      room.fx.push((c, t) => {
        glow(c, x + 29, base - 6, 7, "#fef3c7", 0.15 + 0.05 * Math.sin(t / 300));
        if (Math.floor(t / 600) % 6 === 0) px(c, x + 12, base - 10, "#ffffff");
      });
    },
  },
};
