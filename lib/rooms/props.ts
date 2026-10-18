// Furniture and fixtures for themed rooms. Each prop draws its static pixels into
// the room background and may register small animations. x is the prop's left
// edge, base is the y its feet stand on (BACK for props against the wall).
import { type Ctx, GOLD, GREEN, GREEN_HI, box, glow, outline, px, rect, rgba, shade, tiny } from "../pixel";
import { BACK, type Room, WALL } from "./kit";

const WOOD = "#7a4a2a";
const DARKWOOD = "#4a2c18";
const METAL = "#8b93a1";

// ---------- seating and tables ----------

export function couch(room: Room, x: number, w: number, c: string, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 14, w, 7, shade(c, -0.08)); // back
  box(ctx, x + 2, base - 8, w - 4, 4, c); // cushions
  for (let i = x + 2 + Math.floor((w - 4) / 3); i < x + w - 3; i += Math.floor((w - 4) / 3)) rect(ctx, i, base - 8, 1, 4, shade(c, -0.3));
  box(ctx, x - 2, base - 10, 4, 7, shade(c, -0.15)); // arms
  box(ctx, x + w - 2, base - 10, 4, 7, shade(c, -0.15));
  rect(ctx, x, base - 4, w, 2, shade(c, -0.4));
  rect(ctx, x, base - 2, 2, 2, DARKWOOD);
  rect(ctx, x + w - 2, base - 2, 2, 2, DARKWOOD);
  rect(ctx, x + 4, base - 12, 6, 4, shade(room.accent, 0.1)); // throw pillow in coin colours
  rect(ctx, x + 4, base - 12, 6, 1, shade(room.accent, 0.4));
}

export function armchair(room: Room, x: number, c: string, base = BACK, flip = false) {
  const { ctx } = room;
  const bx = flip ? x + 8 : x;
  box(ctx, bx, base - 15, 6, 13, shade(c, -0.1));
  box(ctx, x, base - 8, 14, 5, c);
  box(ctx, flip ? x : x + 11, base - 10, 3, 7, shade(c, -0.18));
  rect(ctx, x + 1, base - 3, 2, 3, DARKWOOD);
  rect(ctx, x + 11, base - 3, 2, 3, DARKWOOD);
}

export function stool(room: Room, x: number, base = BACK + 4, seat = "#b91c1c") {
  const { ctx } = room;
  rect(ctx, x + 2, base - 9, 1, 9, METAL);
  rect(ctx, x + 1, base - 1, 3, 1, shade(METAL, -0.3));
  rect(ctx, x + 1, base - 5, 3, 1, shade(METAL, -0.2));
  box(ctx, x, base - 11, 5, 2, seat);
}

export function table(room: Room, x: number, w: number, c = WOOD, base = BACK, h = 9) {
  const { ctx } = room;
  box(ctx, x, base - h, w, 2, c);
  rect(ctx, x + 1, base - h + 2, 1, h - 2, shade(c, -0.3));
  rect(ctx, x + w - 2, base - h + 2, 1, h - 2, shade(c, -0.3));
}

export function coffeeTable(room: Room, x: number, w: number, base = WALL + 12) {
  const { ctx } = room;
  box(ctx, x, base - 5, w, 2, "#2b2b31");
  rect(ctx, x + 1, base - 3, 1, 3, "#18181b");
  rect(ctx, x + w - 2, base - 3, 1, 3, "#18181b");
  rect(ctx, x + 3, base - 7, 3, 2, "#e5e7eb"); // mug
  rect(ctx, x + w - 8, base - 6, 5, 1, room.accent); // magazine in coin colours
}

export function bed(room: Room, x: number, w: number, sheets: string, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 18, 4, 18, DARKWOOD); // headboard
  box(ctx, x + 4, base - 9, w - 4, 5, "#f1f5f9"); // mattress
  box(ctx, x + 12, base - 10, w - 12, 5, sheets); // blanket
  for (let i = x + 14; i < x + w - 2; i += 4) rect(ctx, i, base - 9, 1, 3, shade(sheets, -0.2));
  box(ctx, x + 5, base - 12, 7, 3, "#ffffff"); // pillow
  rect(ctx, x + 4, base - 4, w - 4, 2, DARKWOOD);
  rect(ctx, x + w - 2, base - 7, 2, 7, DARKWOOD);
}

export function nightstand(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 8, 8, 8, WOOD);
  rect(ctx, x + 1, base - 5, 6, 1, shade(WOOD, -0.35));
  rect(ctx, x + 3, base - 4, 2, 1, GOLD);
  deskLamp(room, x + 1, base - 8);
}

export function deskLamp(room: Room, x: number, base: number, c = "#e2e8f0") {
  const { ctx } = room;
  rect(ctx, x + 2, base - 5, 1, 5, "#6b7280");
  rect(ctx, x, base - 1, 5, 1, "#374151");
  box(ctx, x, base - 8, 6, 3, c);
  room.fx.push((g, t) => glow(g, x + 3, base - 4, 12, "#fde68a", 0.12 + 0.01 * Math.sin(t / 500)));
}

export function floorLamp(room: Room, x: number, c = "#fef3c7", base = BACK) {
  const { ctx } = room;
  rect(ctx, x + 3, base - 26, 1, 26, "#3f3f46");
  rect(ctx, x + 1, base - 1, 5, 1, "#27272a");
  box(ctx, x, base - 32, 8, 6, shade(c, -0.15));
  room.fx.push((g, t) => glow(g, x + 4, base - 26, 22, "#fde68a", 0.11 + 0.01 * Math.sin(t / 600 + x)));
}

// ---------- storage and walls ----------

export function bookshelf(room: Room, x: number, w: number, h: number, base = BACK) {
  const { ctx, r } = room;
  box(ctx, x, base - h, w, h, DARKWOOD);
  for (let sy = base - h + 3; sy < base - 3; sy += 8) {
    rect(ctx, x + 2, sy, w - 4, 6, "#1c120a");
    let bx = x + 2;
    while (bx < x + w - 3) {
      const bw = 1 + Math.floor(r() * 3);
      const bh = 3 + Math.floor(r() * 3);
      const col = ["#b91c1c", "#1d4ed8", "#15803d", "#ca8a04", "#7c3aed", "#e5e7eb", room.accent][Math.floor(r() * 7)];
      rect(ctx, bx, sy + 6 - bh, bw, bh, col);
      rect(ctx, bx, sy + 6 - bh, bw, 1, shade(col, 0.3));
      bx += bw + (r() < 0.2 ? 2 : 0);
    }
    rect(ctx, x + 1, sy + 6, w - 2, 1, shade(DARKWOOD, 0.25));
  }
}

export function wallShelf(room: Room, x: number, y: number, w: number, items: "plants" | "bottles" | "trophies" | "boxes" = "plants") {
  const { ctx, r } = room;
  box(ctx, x, y, w, 2, WOOD);
  rect(ctx, x + 2, y + 2, 1, 2, shade(WOOD, -0.4));
  rect(ctx, x + w - 3, y + 2, 1, 2, shade(WOOD, -0.4));
  for (let ix = x + 2; ix < x + w - 3; ix += 5 + Math.floor(r() * 3)) {
    if (items === "plants") {
      rect(ctx, ix, y - 3, 3, 3, "#b45309");
      rect(ctx, ix - 1, y - 6, 2, 3, "#22c55e");
      rect(ctx, ix + 2, y - 7, 2, 4, "#16a34a");
    } else if (items === "bottles") {
      const c = ["#166534", "#7c2d12", "#a16207", "#e5e7eb", "#1e3a8a"][Math.floor(r() * 5)];
      rect(ctx, ix, y - 6, 3, 6, c);
      rect(ctx, ix + 1, y - 8, 1, 2, shade(c, -0.3));
      rect(ctx, ix, y - 4, 3, 1, "#f5f5f4");
    } else if (items === "trophies") {
      rect(ctx, ix, y - 2, 3, 2, "#3f3f46");
      rect(ctx, ix, y - 6, 3, 4, GOLD);
      px(ctx, ix - 1, y - 6, GOLD);
      px(ctx, ix + 3, y - 6, GOLD);
    } else {
      box(ctx, ix, y - 5, 4, 5, ["#ca8a04", "#dc2626", "#2563eb"][Math.floor(r() * 3)]);
    }
  }
}

export function poster(room: Room, x: number, y: number, w: number, h: number, kind: "chart" | "moon" | "abstract" | "pump" = "abstract") {
  const { ctx, r } = room;
  rect(ctx, x, y, w, h, "#f5f5f4");
  rect(ctx, x + 1, y + 1, w - 2, h - 2, kind === "moon" ? "#0b1026" : kind === "pump" ? "#07130c" : "#1f2937");
  if (kind === "chart") {
    let cy = y + h - 4;
    for (let cx = x + 2; cx < x + w - 3; cx += 3) {
      const up = r() < 0.62;
      const len = 1 + Math.floor(r() * 4);
      rect(ctx, cx, up ? cy - len : cy, 2, len, up ? GREEN : "#ef4444");
      cy += up ? -len + 1 : len - 1;
      cy = Math.max(y + 3, Math.min(y + h - 3, cy));
    }
  } else if (kind === "moon") {
    rect(ctx, x + w - 8, y + 3, 5, 5, "#fef9c3");
    rect(ctx, x + 3, y + h - 8, 2, 5, "#e5e7eb"); // rocket
    rect(ctx, x + 3, y + h - 3, 2, 2, "#f97316");
  } else if (kind === "pump") {
    // the pump pill: original two-tone capsule
    rect(ctx, x + 3, y + h / 2 - 2, w / 2 - 3, 5, "#ffffff");
    rect(ctx, x + w / 2, y + h / 2 - 2, w / 2 - 3, 5, GREEN_HI);
    tiny(ctx, "PUMP", x + 2, y + 2, GREEN);
  } else {
    for (let i = 0; i < 4; i++) rect(ctx, x + 2 + Math.floor(r() * (w - 6)), y + 2 + Math.floor(r() * (h - 6)), 3, 3, [room.accent, "#f43f5e", "#facc15", "#38bdf8"][i]);
  }
}

export function clock(room: Room, x: number, y: number) {
  const { ctx } = room;
  rect(ctx, x, y, 7, 7, "#e5e7eb");
  outline(ctx, x, y, 7, 7, "#27272a");
  room.fx.push((c, t) => {
    const s = Math.floor(t / 1000) % 4;
    const hands = [
      [3, 1],
      [5, 3],
      [3, 5],
      [1, 3],
    ][s];
    rect(c, x + 3, y + 3, 1, 1, "#111");
    rect(c, x + hands[0], y + hands[1], 1, 1, "#dc2626");
  });
}

export function plant(room: Room, x: number, size: "s" | "m" | "l" = "m", base = BACK) {
  const { ctx } = room;
  const pot = "#9a5b2e";
  const h = size === "s" ? 8 : size === "m" ? 16 : 26;
  const pw = size === "s" ? 5 : size === "m" ? 7 : 9;
  box(ctx, x, base - 5, pw, 5, pot);
  rect(ctx, x - 1, base - 6, pw + 2, 1, shade(pot, 0.2));
  const cx = x + Math.floor(pw / 2);
  const leaves: [number, number, string][] = [];
  for (let i = 0; i < h; i += 2) {
    const spread = Math.floor((Math.sin(i * 1.7) + 1) * (size === "l" ? 4 : 3));
    leaves.push([cx - spread, base - 6 - i, i % 4 ? "#16a34a" : "#22c55e"]);
    leaves.push([cx + spread - 1, base - 7 - i, i % 4 ? "#15803d" : "#4ade80"]);
  }
  rect(ctx, cx, base - 6 - h + 2, 1, h - 2, "#166534");
  room.fx.push((c, t) => {
    const sway = Math.round(Math.sin(t / 900 + x) * 0.6);
    for (const [lx, ly, col] of leaves) rect(c, lx + (ly < base - 6 - h / 2 ? sway : 0), ly, 3, 2, col);
  });
}

// ---------- kitchens, shops and bars ----------

export function fridge(room: Room, x: number, base = BACK, glass = false) {
  const { ctx, r } = room;
  box(ctx, x, base - 30, 16, 30, glass ? "#cbd5e1" : "#e2e8f0");
  if (glass) {
    rect(ctx, x + 2, base - 28, 12, 25, "#0e1b2a");
    for (let sy = base - 27; sy < base - 4; sy += 6) {
      rect(ctx, x + 2, sy + 4, 12, 1, "#94a3b8");
      for (let i = 0; i < 4; i++) rect(ctx, x + 3 + i * 3, sy, 2, 4, ["#ef4444", "#22c55e", "#facc15", "#38bdf8", room.accent][Math.floor(r() * 5)]);
    }
    room.fx.push((c, t) => rect(c, x + 2, base - 28, 12, 25, `rgba(186,230,253,${0.06 + 0.03 * Math.sin(t / 400)})`));
  } else {
    rect(ctx, x + 1, base - 19, 14, 1, "#94a3b8");
    rect(ctx, x + 12, base - 27, 1, 5, "#64748b");
    rect(ctx, x + 12, base - 16, 1, 7, "#64748b");
    rect(ctx, x + 3, base - 26, 3, 3, room.accent); // magnet
  }
}

export function counter(room: Room, x: number, w: number, top: string, front: string, base = BACK + 6, h = 16) {
  const { ctx } = room;
  box(ctx, x, base - h, w, 3, top);
  rect(ctx, x, base - h + 3, w, h - 3, front);
  for (let i = x + 6; i < x + w - 2; i += 10) rect(ctx, i, base - h + 5, 1, h - 7, shade(front, -0.25));
  rect(ctx, x, base - 1, w, 1, shade(front, -0.5));
}

export function register(room: Room, x: number, y: number) {
  const { ctx } = room;
  box(ctx, x, y - 6, 10, 6, "#374151");
  rect(ctx, x + 1, y - 5, 4, 2, "#0f172a");
  room.fx.push((c, t) => tiny(c, Math.floor(t / 1500) % 2 ? "$" : " ", x + 1, y - 5, GREEN));
  box(ctx, x + 6, y - 9, 4, 3, "#1f2937");
}

export function bottleShelves(room: Room, x: number, w: number, y: number, rows = 3) {
  const { ctx, r } = room;
  rect(ctx, x, y, w, rows * 9 + 2, "#20140c");
  for (let i = 0; i < rows; i++) {
    const sy = y + 9 + i * 9;
    box(ctx, x, sy, w, 2, WOOD);
    for (let bx = x + 2; bx < x + w - 3; bx += 4) {
      if (r() < 0.12) continue;
      const c = ["#14532d", "#7c2d12", "#a16207", "#e7e5e4", "#1e3a8a", "#7f1d1d"][Math.floor(r() * 6)];
      const bh = 4 + Math.floor(r() * 3);
      rect(ctx, bx, sy - bh, 3, bh, c);
      rect(ctx, bx + 1, sy - bh - 2, 1, 2, shade(c, -0.3));
      rect(ctx, bx, sy - bh + 1, 1, bh - 2, shade(c, 0.35));
    }
  }
  // glow behind bottles
  room.fx.push((c, t) => glow(c, x + w / 2, y + rows * 5, w * 0.6, "#f59e0b", 0.06 + 0.02 * Math.sin(t / 900)));
}

export function barCounter(room: Room, x: number, w: number) {
  // The front of the bar is drawn over the citizens, so the bartender stands behind it.
  const top = "#5b3416";
  const front = "#3a2210";
  room.front.push((c) => {
    box(c, x, BACK - 4, w, 3, top);
    rect(c, x + 1, BACK - 4, w - 2, 1, "#9a6a3a");
    rect(c, x, BACK - 1, w, 12, front);
    for (let i = x + 4; i < x + w - 2; i += 12) outline(c, i, BACK + 1, 9, 8, shade(front, -0.3));
    rect(c, x, BACK + 10, w, 1, GOLD);
  });
}

export function taps(room: Room, x: number) {
  const { ctx } = room;
  rect(ctx, x, BACK - 14, 14, 2, METAL);
  for (let i = 0; i < 3; i++) {
    rect(ctx, x + 2 + i * 4, BACK - 12, 1, 4, METAL);
    rect(ctx, x + 1 + i * 4, BACK - 18, 3, 4, [room.accent, GOLD, "#ef4444"][i]);
  }
}

export function noodlePot(room: Room, x: number, base: number) {
  const { ctx } = room;
  box(ctx, x, base - 7, 12, 7, "#9ca3af");
  rect(ctx, x - 1, base - 8, 14, 1, "#d1d5db");
  rect(ctx, x + 2, base - 9, 8, 1, "#475569");
  room.fx.push((c, t) => {
    for (let i = 0; i < 3; i++) {
      const k = ((t / 1400 + i / 3) % 1);
      const sx = x + 3 + i * 3 + Math.round(Math.sin(t / 300 + i) * 1.5);
      c.fillStyle = `rgba(241,245,249,${0.45 * (1 - k)})`;
      c.fillRect(sx, base - 10 - k * 14, 2, 2);
    }
  });
}

export function lantern(room: Room, x: number, y: number, c = "#dc2626") {
  const { ctx } = room;
  rect(ctx, x + 2, 0, 1, y, "#1f2937");
  room.fx.push((g, t) => {
    const sway = Math.round(Math.sin(t / 800 + x) * 1);
    rect(g, x + sway, y, 5, 7, c);
    rect(g, x + 1 + sway, y, 3, 7, shade(c, 0.25));
    rect(g, x + sway, y - 1, 5, 1, GOLD);
    rect(g, x + sway, y + 7, 5, 1, GOLD);
    glow(g, x + 2 + sway, y + 3, 14, c, 0.14);
  });
}

export function washer(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 18, 16, 18, "#e5e7eb");
  rect(ctx, x + 1, base - 17, 14, 3, "#cbd5e1");
  rect(ctx, x + 11, base - 16, 2, 1, "#22c55e");
  rect(ctx, x + 3, base - 12, 10, 10, "#475569");
  rect(ctx, x + 4, base - 11, 8, 8, "#0c4a6e");
  room.fx.push((c, t) => {
    const a = t / 150 + x;
    for (let i = 0; i < 4; i++) {
      const ang = a + (i * Math.PI) / 2;
      rect(c, x + 7 + Math.round(Math.cos(ang) * 2.5), base - 8 + Math.round(Math.sin(ang) * 2.5), 2, 2, [room.accent, "#f8fafc", "#f43f5e", "#facc15"][i]);
    }
    rect(c, x + 4, base - 11, 2, 1, "rgba(255,255,255,0.4)");
  });
}

// ---------- screens, music, games ----------

/** Monitor with a live candle chart; green or red follows the coin's day. */
export function monitor(room: Room, x: number, y: number, w = 22, h = 14, up = true) {
  const { ctx } = room;
  box(ctx, x - 1, y - 1, w + 2, h + 2, "#1f2937");
  rect(ctx, x, y, w, h, "#030712");
  rect(ctx, x + w / 2 - 1, y + h + 1, 3, 3, "#374151");
  rect(ctx, x + w / 2 - 4, y + h + 4, 9, 1, "#374151");
  room.fx.push((c, t) => {
    const step = Math.floor(t / 600);
    let cy = y + h / 2;
    for (let i = 0; i < (w - 2) / 3; i++) {
      const seed = Math.sin((i + step) * 12.9898 + x) * 43758.5453;
      const v = seed - Math.floor(seed);
      const green = up ? v < 0.65 : v < 0.35;
      const len = 1 + Math.floor(v * 4);
      cy += green ? -1 : 1;
      cy = Math.max(y + 2, Math.min(y + h - 3, cy));
      rect(c, x + 1 + i * 3, green ? cy - len : cy, 2, len, green ? GREEN : "#ef4444");
    }
    glow(c, x + w / 2, y + h / 2, w * 0.7, up ? GREEN : "#ef4444", 0.06);
  });
}

export function tvWall(room: Room, x: number, y: number) {
  const { ctx } = room;
  box(ctx, x - 1, y - 1, 32, 19, "#111");
  rect(ctx, x, y, 30, 17, "#020617");
  room.fx.push((c, t) => {
    const frame = Math.floor(t / 2200) % 3;
    if (frame === 0) {
      tiny(c, room.symbol.slice(0, 6), x + 2, y + 2, room.accent);
      tiny(c, "LIVE", x + 2, y + 10, "#ef4444");
    } else if (frame === 1) {
      for (let i = 0; i < 9; i++) rect(c, x + 2 + i * 3, y + 14 - ((i * 7 + Math.floor(t / 300)) % 10), 2, 2, GREEN);
    } else {
      rect(c, x + 8, y + 4, 14, 9, shade(room.accent, -0.3));
      if (room.logo) c.drawImage(room.logo, x + 11, y + 4, 9, 9);
    }
    rect(c, x, y, 30, 17, `rgba(148,163,184,${0.03 + 0.03 * Math.sin(t / 50)})`);
  });
}

export function speaker(room: Room, x: number, h = 20, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - h, 10, h, "#18181b");
  room.fx.push((c, t) => {
    const beat = Math.floor(t / 230) % 2;
    for (let i = 0; i < 2; i++) {
      const cy = base - h + 5 + i * (h / 2);
      const rr = (i ? 3 : 2) + beat * (i ? 1 : 0);
      rect(c, x + 5 - rr, cy - rr, rr * 2, rr * 2, "#3f3f46");
      rect(c, x + 4, cy - 1, 2, 2, "#71717a");
    }
  });
}

export function turntable(room: Room, x: number, y: number) {
  const { ctx } = room;
  box(ctx, x, y, 22, 5, "#27272a");
  room.fx.push((c, t) => {
    rect(c, x + 2, y - 1, 9, 2, "#09090b");
    rect(c, x + 5 + (Math.floor(t / 200) % 2), y - 1, 2, 1, room.accent);
    rect(c, x + 12, y - 1, 9, 2, "#09090b");
    rect(c, x + 15 + (Math.floor(t / 200 + 1) % 2), y - 1, 2, 1, GOLD);
  });
}

export function recordCrate(room: Room, x: number, base = BACK + 4) {
  const { ctx, r } = room;
  box(ctx, x, base - 7, 14, 7, WOOD);
  for (let i = 0; i < 6; i++) {
    const c = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#a855f7", room.accent][Math.floor(r() * 6)];
    rect(ctx, x + 1 + i * 2, base - 11, 2, 4, c);
  }
}

export function jukebox(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 24, 14, 24, "#7c2d12");
  rect(ctx, x + 1, base - 24, 12, 4, "#b45309");
  rect(ctx, x + 3, base - 18, 8, 6, "#1c1917");
  rect(ctx, x + 2, base - 10, 10, 6, "#44403c");
  for (let i = 0; i < 4; i++) rect(ctx, x + 3 + i * 2, base - 9, 1, 4, "#a8a29e");
  room.fx.push((c, t) => {
    const hue = ["#f43f5e", "#facc15", "#22c55e", "#38bdf8"];
    for (let i = 0; i < 6; i++) rect(c, x + 1 + (i % 2) * 11, base - 22 + Math.floor(i / 2) * 6, 1, 5, hue[(i + Math.floor(t / 250)) % 4]);
    glow(c, x + 7, base - 14, 18, hue[Math.floor(t / 250) % 4], 0.09);
  });
}

export function piano(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 14, 28, 5, "#0b0b0e");
  rect(ctx, x + 2, base - 22, 24, 8, "#111114"); // open lid
  rect(ctx, x + 2, base - 22, 24, 1, "#3f3f46");
  for (let i = 0; i < 26; i += 2) rect(ctx, x + 1 + i, base - 10, 1, 2, "#f8fafc");
  rect(ctx, x + 2, base - 9, 1, 9, "#0b0b0e");
  rect(ctx, x + 25, base - 9, 1, 9, "#0b0b0e");
  rect(ctx, x + 12, base - 4, 4, 1, GOLD);
}

export function arcade(room: Room, x: number, c = "#1e1b4b", base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 28, 14, 28, c);
  rect(ctx, x + 1, base - 28, 12, 4, shade(c, 0.3));
  rect(ctx, x + 2, base - 22, 10, 9, "#020617");
  rect(ctx, x + 1, base - 12, 12, 3, shade(c, -0.3));
  px(ctx, x + 3, base - 12, "#ef4444");
  px(ctx, x + 6, base - 12, "#38bdf8");
  px(ctx, x + 8, base - 12, "#facc15");
  room.fx.push((g, t) => {
    const f = Math.floor(t / 180);
    for (let i = 0; i < 5; i++) rect(g, x + 3 + ((f + i * 3) % 9), base - 21 + ((i * 5 + f) % 7), 1, 1, [GREEN, "#f43f5e", "#facc15"][i % 3]);
    rect(g, x + 2, base - 27, 10, 2, ["#f43f5e", "#38bdf8", "#facc15"][Math.floor(t / 400) % 3]);
    glow(g, x + 7, base - 18, 14, room.accent, 0.08);
  });
}

export function slotMachine(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 26, 14, 26, "#991b1b");
  rect(ctx, x + 1, base - 26, 12, 3, GOLD);
  rect(ctx, x + 2, base - 20, 10, 7, "#f8fafc");
  rect(ctx, x + 14, base - 20, 2, 1, "#a1a1aa");
  rect(ctx, x + 15, base - 22, 1, 3, "#a1a1aa");
  room.fx.push((c, t) => {
    const sym = ["7", "$", "*", "x"];
    const spin = Math.floor(t / 120);
    const stop = Math.floor(t / 3000) % 2;
    for (let i = 0; i < 3; i++) tiny(c, stop ? "7" : sym[(spin + i) % 4], x + 2 + i * 4 - (i === 2 ? 1 : 0), base - 19, stop ? "#dc2626" : "#111827");
    if (stop && Math.floor(t / 200) % 2) rect(c, x + 1, base - 26, 12, 3, "#fff7cc");
  });
}

export function pokerTable(room: Room, x: number, w: number) {
  const { ctx, r } = room;
  const y = WALL + 3;
  rect(ctx, x, y, w, 8, "#3f2412");
  rect(ctx, x + 2, y + 1, w - 4, 5, "#0f5132");
  rect(ctx, x + 2, y + 1, w - 4, 1, "#15803d");
  for (let i = 0; i < 6; i++) {
    const cx = x + 5 + Math.floor(r() * (w - 12));
    for (let k = 0; k < 2 + Math.floor(r() * 3); k++) rect(ctx, cx, y + 4 - k, 3, 1, ["#dc2626", "#2563eb", GOLD, "#f8fafc"][i % 4]);
  }
  rect(ctx, x + 4, y + 9, 2, 5, "#2a170b");
  rect(ctx, x + w - 6, y + 9, 2, 5, "#2a170b");
}

export function vaultDoor(room: Room, x: number, y: number) {
  const { ctx } = room;
  rect(ctx, x, y, 34, 34, "#3f3f46");
  rect(ctx, x + 2, y + 2, 30, 30, "#71717a");
  rect(ctx, x + 4, y + 4, 26, 26, "#52525b");
  outline(ctx, x + 6, y + 6, 22, 22, "#a1a1aa");
  for (let i = 0; i < 6; i++) rect(ctx, x + 1, y + 4 + i * 5, 2, 2, "#d4d4d8");
  room.fx.push((c, t) => {
    const a = t / 1600;
    for (let k = 0; k < 4; k++) {
      const ang = a + (k * Math.PI) / 2;
      rect(c, x + 16 + Math.round(Math.cos(ang) * 7), y + 16 + Math.round(Math.sin(ang) * 7), 2, 2, GOLD);
    }
    rect(c, x + 15, y + 15, 4, 4, "#e4e4e7");
  });
}

export function fireplace(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 26, 34, 26, "#57534e");
  box(ctx, x - 3, base - 28, 40, 3, "#78716c");
  rect(ctx, x + 6, base - 18, 22, 18, "#1c1917");
  room.fx.push((c, t) => {
    for (let i = 0; i < 9; i++) {
      const h = 4 + Math.floor(Math.abs(Math.sin(t / 160 + i * 1.3)) * 9);
      rect(c, x + 7 + i * 2, base - 2 - h, 2, h, i % 3 ? "#f97316" : "#fde047");
    }
    rect(c, x + 8, base - 3, 18, 2, "#7c2d12");
    glow(c, x + 17, base - 8, 34, "#f97316", 0.13 + 0.03 * Math.sin(t / 130));
  });
}

export function aquarium(room: Room, x: number, y: number, w = 30, h = 16) {
  const { ctx } = room;
  box(ctx, x - 1, y - 1, w + 2, h + 2, "#1f2937");
  rect(ctx, x, y, w, h, "#0e7490");
  rect(ctx, x, y + h - 3, w, 3, "#a8a29e");
  rect(ctx, x + 4, y + h - 8, 2, 5, "#16a34a");
  rect(ctx, x + w - 7, y + h - 10, 2, 7, "#22c55e");
  room.fx.push((c, t) => {
    for (let i = 0; i < 3; i++) {
      const fx = x + 2 + ((t / (40 + i * 13) + i * 9) % (w - 6));
      const fy = y + 3 + i * 4;
      rect(c, Math.round(fx), fy, 3, 2, ["#fb923c", "#facc15", room.accent][i]);
    }
    const by = y + h - ((t / 60) % h);
    rect(c, x + 8, Math.round(by), 1, 1, "#e0f2fe");
    rect(c, x, y, w, 1, "rgba(255,255,255,0.3)");
  });
}

export function chandelier(room: Room, cx: number) {
  const { ctx } = room;
  rect(ctx, cx, 0, 1, 6, GOLD);
  rect(ctx, cx - 9, 6, 19, 2, GOLD);
  for (let i = -8; i <= 8; i += 4) {
    rect(ctx, cx + i, 8, 1, 3, GOLD);
  }
  room.fx.push((c, t) => {
    for (let i = -8; i <= 8; i += 4) {
      rect(c, cx + i, 11, 1, 2, "#fff7cc");
      if (Math.floor(t / 300 + i) % 7 === 0) px(c, cx + i + 1, 10, "#ffffff");
    }
    glow(c, cx, 10, 40, "#fde68a", 0.12);
  });
}

export function discoBall(room: Room, cx: number) {
  rect(room.ctx, cx, 0, 1, 8, "#52525b");
  room.fx.push((c, t) => {
    const f = Math.floor(t / 150);
    for (let i = 0; i < 25; i++) rect(c, cx - 2 + (i % 5), 8 + Math.floor(i / 5), 1, 1, (i + f) % 3 ? "#d4d4d8" : "#ffffff");
    for (let i = 0; i < 7; i++) {
      const ang = t / 1100 + i;
      rect(c, cx + Math.round(Math.cos(ang) * (30 + i * 12)), 18 + Math.round(Math.abs(Math.sin(ang * 1.3)) * 50), 1, 1, ["#f0abfc", "#93c5fd", "#fde68a"][i % 3]);
    }
  });
}

export function spotlights(room: Room, xs: number[], colors: string[]) {
  room.fx.push((c, t) => {
    c.save();
    c.globalCompositeOperation = "lighter";
    xs.forEach((x, i) => {
      const sway = Math.sin(t / 1300 + i * 2) * 26;
      const col = colors[i % colors.length];
      const g = c.createLinearGradient(0, 0, 0, WALL + 12);
      g.addColorStop(0, rgba(col, 0.22));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 1, 0);
      c.lineTo(x + 1, 0);
      c.lineTo(x + sway + 12, WALL + 12);
      c.lineTo(x + sway - 12, WALL + 12);
      c.fill();
    });
    c.restore();
  });
  for (const x of xs) box(room.ctx, x - 2, 0, 5, 3, "#27272a");
}

export function danceFloor(room: Room) {
  room.fx.push((c, t) => {
    const f = Math.floor(t / 300);
    for (let x = 0; x < 256; x += 8)
      for (let y = WALL + 1; y < 96; y += 5) {
        const k = ((x / 8) * 7 + ((y - WALL) / 5) * 3 + f) % 6;
        if (k < 2) rect(c, x, y, 8, 5, k ? rgba("#a855f7", 0.35) : rgba("#22d3ee", 0.3));
      }
  });
}

export function mic(room: Room, x: number, base = BACK + 6) {
  const { ctx } = room;
  rect(ctx, x + 2, base - 16, 1, 16, "#71717a");
  rect(ctx, x, base - 1, 5, 1, "#3f3f46");
  rect(ctx, x + 1, base - 19, 3, 3, "#18181b");
}

export function telescope(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  rect(ctx, x + 3, base - 10, 1, 10, "#52525b");
  rect(ctx, x, base - 1, 7, 1, "#3f3f46");
  for (let i = 0; i < 10; i++) rect(ctx, x + 2 + i, base - 12 - Math.floor(i / 2), 3, 3, i > 7 ? GOLD : "#e5e7eb");
}

export function goldBars(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4 - row; i++) {
      const gx = x + i * 7 + row * 3;
      const gy = base - 4 - row * 4;
      rect(ctx, gx, gy, 7, 4, GOLD);
      rect(ctx, gx + 1, gy, 5, 1, "#fff1a8");
      rect(ctx, gx, gy + 3, 7, 1, "#9a7412");
    }
}

export function hotTub(room: Room, x: number, w: number) {
  const { ctx } = room;
  box(ctx, x, BACK - 6, w, 10, "#e7e5e4");
  rect(ctx, x + 2, BACK - 5, w - 4, 5, "#0891b2");
  room.fx.push((c, t) => {
    for (let i = 0; i < w / 5; i++) {
      const k = (t / 700 + i * 0.37) % 1;
      c.fillStyle = `rgba(224,242,254,${0.6 * (1 - k)})`;
      c.fillRect(x + 3 + i * 5, BACK - 5 - Math.round(k * 4), 1, 1);
    }
  });
}

export function cactus(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 5, 7, 5, "#c2410c");
  rect(ctx, x + 2, base - 17, 3, 12, "#15803d");
  rect(ctx, x, base - 13, 2, 5, "#15803d");
  rect(ctx, x + 5, base - 15, 2, 4, "#15803d");
  rect(ctx, x + 3, base - 17, 1, 12, "#22c55e");
}

export function neonPill(room: Room, cx: number, y: number) {
  // Pump.fun-style capsule rendered as original neon tubing.
  room.fx.push((c, t) => {
    const a = 0.75 + 0.25 * Math.sin(t / 500);
    rect(c, cx - 10, y, 10, 6, rgba("#ffffff", a));
    rect(c, cx, y, 10, 6, rgba(GREEN_HI, a));
    rect(c, cx - 11, y + 1, 1, 4, rgba("#ffffff", a));
    rect(c, cx + 10, y + 1, 1, 4, rgba(GREEN_HI, a));
    glow(c, cx, y + 3, 26, GREEN_HI, 0.18 * a);
  });
}

export function serverRack(room: Room, x: number, base = BACK) {
  const { ctx } = room;
  box(ctx, x, base - 30, 14, 30, "#111827");
  for (let i = 0; i < 6; i++) rect(ctx, x + 2, base - 28 + i * 5, 10, 3, "#1f2937");
  room.fx.push((c, t) => {
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) if ((Math.floor(t / 140) + i * 3 + k * 5) % 4) px(c, x + 3 + k * 3, base - 27 + i * 5, k === 0 ? GREEN : "#38bdf8");
  });
}

export { GREEN, GOLD, type Ctx };
