// Bare walls, the house floor and the corner store. These set the pattern the
// other theme files follow: walls and floor first, then props back to front,
// then the token touches (art, neon, ticker, stash), then lighting.
import { GOLD, GREEN, GREEN_HI, box, glow, noise, outline, rect, shade, tiny } from "../pixel";
import {
  BACK,
  ROOM_W,
  type Theme,
  WALL,
  ambient,
  baseboard,
  bulb,
  cityWindow,
  crown,
  floorConcrete,
  floorPlanks,
  floorTiles,
  neonSign,
  pendant,
  stash,
  ticker,
  tokenArt,
  vignette,
  wallBrick,
  wallFlat,
} from "./kit";
import {
  bookshelf,
  counter,
  couch,
  fridge,
  monitor,
  neonPill,
  plant,
  poster,
  register,
  serverRack,
  stool,
  tvWall,
  wallShelf,
} from "./props";

/** Day zero: concrete, a bare bulb, a mattress. The whole point is that it looks rough. */
export const bare: Theme = {
  id: "bare",
  name: "Bare Walls",
  draw(room) {
    const { ctx, r } = room;
    wallFlat(room, "#3b3d44", 0.12);
    // water stains and cracks
    for (let i = 0; i < 3; i++) {
      const sx = 20 + Math.floor(r() * 200);
      rect(ctx, sx, 4, 10 + Math.floor(r() * 12), 6, "rgba(20,20,24,0.25)");
      let cx = sx + 4;
      for (let cy = 10; cy < 30 + r() * 20; cy++) {
        rect(ctx, cx, cy, 1, 1, "#26272c");
        cx += r() < 0.5 ? -1 : 1;
      }
    }
    rect(ctx, 0, 6, ROOM_W, 2, "#55575e"); // exposed pipe
    rect(ctx, 0, 6, ROOM_W, 1, "#6b6e76");
    for (let x = 30; x < ROOM_W; x += 60) rect(ctx, x, 5, 3, 4, "#45474e");
    // boarded window
    rect(ctx, 150, 20, 34, 26, "#121317");
    box(ctx, 146, 24, 42, 4, "#7c5a3a");
    box(ctx, 146, 36, 42, 4, "#6b4c30");
    // graffiti tag in the coin's colour
    tiny(ctx, `$${room.symbol}`.slice(0, 8), 40, 40, shade(room.accent, -0.25));
    tiny(ctx, "HODL", 196, 58, "rgba(148,163,184,0.5)");
    floorConcrete(room, "#2c2d32");
    // mattress on the floor, milk crate nightstand
    box(ctx, 14, BACK - 5, 40, 5, "#cbd5e1");
    box(ctx, 15, BACK - 7, 10, 3, "#e2e8f0");
    for (let i = 18; i < 52; i += 6) rect(ctx, i, BACK - 4, 1, 3, "#94a3b8");
    box(ctx, 58, BACK - 8, 9, 8, "#2563eb");
    outline(ctx, 59, BACK - 7, 7, 6, "#1d4ed8");
    rect(ctx, 61, BACK - 11, 3, 3, "#f8fafc"); // phone glowing on the crate
    room.fx.push((c, t) => {
      if (Math.floor(t / 1200) % 3 !== 2) glow(c, 62, BACK - 10, 8, "#60a5fa", 0.18);
    });
    tokenArt(room, 100, 24, 14, "tape");
    stash(room, 214);
    bulb(room, 120);
    ambient(room, "#0b0c10", 0.18);
    vignette(room);
  },
};

/** Studio tier: a 24h corner store with a glowing fridge. */
export const cornerStore: Theme = {
  id: "corner-store",
  name: "Corner Store",
  draw(room) {
    const { ctx } = room;
    wallFlat(room, "#e7dcc8", 0.04);
    // tiled lower half
    for (let y = 44; y < WALL; y += 6)
      for (let x = 0; x < ROOM_W; x += 6) {
        rect(ctx, x, y, 6, 6, ((x + y) / 6) % 2 ? "#c8553d" : "#d9725a");
        rect(ctx, x, y, 6, 1, "#e48a72");
      }
    rect(ctx, 0, 42, ROOM_W, 2, "#8b3a2a");
    crown(room, "#b9a98d");
    // shop shelves stocked with snacks
    for (const sx of [6, 108]) {
      box(ctx, sx, 10, 44, 32, "#a8a29e");
      for (let row = 0; row < 3; row++) {
        const sy = 16 + row * 9;
        rect(ctx, sx + 2, sy + 5, 40, 2, "#78716c");
        for (let i = 0; i < 9; i++) {
          const c = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", room.accent, "#e879f9"][(i + row + sx) % 6];
          box(ctx, sx + 3 + i * 4, sy, 3, 5, c);
        }
      }
    }
    fridge(room, 60, BACK, true);
    fridge(room, 78, BACK, true);
    // "open 24h" sign
    room.fx.push((c, t) => {
      const on = Math.floor(t / 700) % 6 !== 0;
      rect(c, 160, 10, 26, 9, "#111");
      tiny(c, "OPEN", 165, 12, on ? "#f43f5e" : "#4c0519");
      if (on) glow(c, 173, 14, 18, "#f43f5e", 0.12);
    });
    cityWindow(room, 196, 10, 50, 28, "#d6d3d1");
    floorTiles(room, "#d6d3d1", "#bfbab3", 8);
    counter(room, 160, 60, "#e7e5e4", "#1f6f5c");
    register(room, 168, BACK - 10);
    rect(ctx, 182, BACK - 14, 6, 4, "#facc15"); // gum display
    rect(ctx, 190, BACK - 13, 10, 3, room.accent); // lotto tickets in coin colours
    tokenArt(room, 128, 46, 12, "black");
    poster(room, 30, 46, 14, 18, "chart");
    stash(room, 228, BACK + 6);
    pendant(room, 40, "#f8fafc", 6, "#94a3b8");
    pendant(room, 190, "#f8fafc", 6, "#94a3b8");
    vignette(room);
  },
};

/** The house floor: $PTWR HQ. Grows from a desk in a cupboard to a full command centre. */
export const pumpHQ: Theme = {
  id: "pump-hq",
  name: "Pump HQ",
  draw(room) {
    const { ctx, r, tier } = room;
    wallFlat(room, "#0c1510", 0.08);
    // circuit-trace wall
    for (let i = 0; i < 18; i++) {
      let x = Math.floor(r() * ROOM_W);
      let y = Math.floor(r() * WALL);
      for (let k = 0; k < 20; k++) {
        rect(ctx, x, y, 1, 1, "#163222");
        if (r() < 0.5) x += r() < 0.5 ? 1 : -1;
        else y += 1;
      }
    }
    noise(ctx, r, 0, 0, ROOM_W, WALL, ["#0f1d15"], 0.05);
    rect(ctx, 0, 2, ROOM_W, 1, GREEN_HI);
    room.fx.push((c, t) => {
      const k = (t / 18) % ROOM_W;
      rect(c, k, 2, 14, 1, "#ffffff");
    });
    floorTiles(room, "#0b1a12", "#0e2016", 8);
    rect(ctx, 0, WALL + 2, ROOM_W, 1, "rgba(74,222,128,0.35)");
    neonPill(room, 128, 10);
    neonSign(room, `$${room.symbol} HQ`, 128, 22, GREEN_HI);
    // desk with monitors, more of them on higher tiers
    const screens = 1 + Math.min(4, tier);
    const deskW = 30 + screens * 18;
    const dx = 128 - deskW / 2;
    box(ctx, dx, BACK - 10, deskW, 3, "#1f2937");
    rect(ctx, dx + 2, BACK - 7, 2, 7, "#111827");
    rect(ctx, dx + deskW - 4, BACK - 7, 2, 7, "#111827");
    for (let i = 0; i < screens; i++) monitor(room, dx + 6 + i * 18, BACK - 30, 16, 12, true);
    // tier unlocks: plants, server racks, a vault of rewards
    if (tier >= 1) plant(room, 8, "m");
    if (tier >= 2) serverRack(room, 22);
    if (tier >= 3) serverRack(room, 220);
    if (tier >= 4) tvWall(room, 196, 12);
    if (tier >= 5) {
      box(ctx, 30, 14, 34, 24, "#14532d");
      tiny(ctx, "REWARDS", 33, 17, GREEN);
      room.fx.push((c, t) => {
        for (let i = 0; i < 6; i++) {
          const k = (t / 1200 + i / 6) % 1;
          rect(c, 34 + i * 5, 36 - Math.round(k * 12), 3, 3, k > 0.8 ? "rgba(232,185,49,0.3)" : GOLD);
        }
      });
    }
    tokenArt(room, 230, 14, 12, "neon");
    ticker(room, 6, 42, 40, null);
    stash(room, 236);
    room.fx.push((c, t) => glow(c, 128, 40, 120, GREEN_HI, 0.05 + 0.02 * Math.sin(t / 700)));
    vignette(room);
  },
};

export const resident: Theme = {
  id: "resident",
  name: "Resident Studio",
  draw(room) {
    const { ctx } = room;
    wallBrick(room, "#6b4a3a", "#3a2a22");
    baseboard(room, "#2a1d16");
    floorPlanks(room, "#6b4423");
    cityWindow(room, 150, 12, 52, 34, "#1f2937");
    bookshelf(room, 14, 30, 34);
    couch(room, 60, 46, "#334155");
    wallShelf(room, 66, 34, 34, "plants");
    tokenArt(room, 116, 22, 16, "wood");
    poster(room, 220, 16, 16, 22, "moon");
    stool(room, 214);
    stash(room, 120);
    pendant(room, 100, "#fde68a", 8, "#1f2937");
    vignette(room);
  },
};

export { GOLD, GREEN };
