// The coin layer: details about the bag itself, added to every held-coin floor on top of its
// themed room. Everything stands in the open strip of floor in front of the furniture, so it
// reads as foreground and never paints over the room's own wall art.
//
//   - a sack stamped with the coin's logo in the front left corner, growing with the bag,
//     with a flag of the coin's ticker planted in it once the bag has been held a day
//   - at 7 days a plush of the coin, at 30 days a diamond hands trophy, front right
//   - on green days a rocket streaks across with the 24h move; on red days a HODL sign
import { GOLD, type Ctx, box, glow, px, rect, rgba, shade, tiny, tinyWidth } from "../pixel";
import { FEET, ROOM_W, type Room } from "./kit";

/** Floor line for the coin layer's front props: just in front of where citizens walk. */
const FRONT = FEET + 2;

/** A filled pixel circle. */
function disc(ctx: Ctx, cx: number, cy: number, r: number, c: string) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    rect(ctx, cx - half, cy + dy, half * 2 + 1, 1, c);
  }
}

/** The coin's logo squeezed into a small square, or its first letter on its colour. */
function stamp(room: Room, x: number, y: number, size: number) {
  const { ctx } = room;
  if (room.logo) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(room.logo, x, y, size, size);
    return;
  }
  rect(ctx, x, y, size, size, shade(room.accent, -0.45));
  tiny(ctx, room.symbol.slice(0, 1), x + Math.floor((size - 3) / 2), y + Math.floor((size - 5) / 2), shade(room.accent, 0.4));
}

/** A little flag of the coin's ticker on a pole, rising from `top`; it waves now and then. */
function flag(room: Room, x: number, top: number) {
  const { ctx } = room;
  const label = room.symbol.toUpperCase().slice(0, 4);
  const w = tinyWidth(label) + 4;
  rect(ctx, x, top - 13, 1, 13, "#d4d4d8");
  px(ctx, x, top - 14, GOLD);
  room.fx.push((c, t) => {
    const wave = Math.floor(t / 450 + x) % 4 === 0 ? 1 : 0;
    rect(c, x + 1, top - 13 + wave, w, 7, room.accent);
    rect(c, x + 1, top - 13 + wave, w, 1, shade(room.accent, 0.3));
    rect(c, x + 1, top - 7 + wave, w, 1, shade(room.accent, -0.35));
    tiny(c, label, x + 3, top - 12 + wave, shade(room.accent, -0.65));
  });
}

/** A burlap sack stamped with the coin, sized by the bag; coins and gold spill out of big ones. */
function sack(room: Room) {
  const { ctx } = room;
  const usd = room.usd ?? 0;
  const burlap = "#a27b4c";
  const x = 4;
  const base = FRONT;
  if (usd < 100) {
    // a small pouch with a single coin
    rect(ctx, x + 1, base - 6, 6, 6, burlap);
    rect(ctx, x + 2, base - 8, 4, 2, shade(burlap, -0.2));
    rect(ctx, x + 1, base - 1, 6, 1, shade(burlap, -0.35));
    disc(ctx, x + 10, base - 2, 1, GOLD);
    if (room.tier >= 1) flag(room, x + 4, base - 8);
    return;
  }
  const big = usd >= 1000;
  const w = big ? 14 : 10;
  const h = big ? 13 : 10;
  // body, rounded at the bottom, cinched neck and a tuft on top
  rect(ctx, x + 1, base - h, w - 2, h, burlap);
  rect(ctx, x, base - h + 3, w, h - 4, burlap);
  rect(ctx, x + 1, base - 1, w - 2, 1, shade(burlap, -0.35));
  rect(ctx, x + 1, base - h + 3, 1, h - 5, shade(burlap, 0.15));
  rect(ctx, x + Math.floor(w / 2) - 2, base - h - 1, 4, 2, "#6b4f2e");
  rect(ctx, x + Math.floor(w / 2) - 3, base - h - 3, 6, 2, shade(burlap, -0.1));
  // the coin's stamp on the front, and its ticker flying from the top once held a day
  const s = big ? 7 : 5;
  stamp(room, x + Math.floor((w - s) / 2), base - h + 4, s);
  if (room.tier >= 1) flag(room, x + Math.floor(w / 2) + 1, base - h - 3);
  if (!big) return;
  // coins spilling out in the coin's colour, rimmed in gold
  for (const [cx, cy] of [
    [x + w + 3, base - 2],
    [x + w + 7, base - 2],
    [x + w + 5, base - 4],
  ]) {
    disc(ctx, cx, cy, 2, GOLD);
    disc(ctx, cx, cy, 1, room.accent);
  }
  if (usd < 10_000) return;
  // whale bags come with gold bars and a glint
  for (const [gx, gy] of [
    [x + w + 11, base - 3],
    [x + w + 13, base - 6],
  ]) {
    rect(ctx, gx, gy, 7, 3, GOLD);
    rect(ctx, gx + 1, gy, 5, 1, "#fff1a8");
    rect(ctx, gx, gy + 2, 7, 1, "#9a7412");
  }
  room.fx.push((c, t) => {
    const k = Math.floor(t / 700) % 6;
    if (k < 2) px(c, x + w + 13 + k * 3, base - 7, "#ffffff");
  });
}

/** A round plush of the coin with its logo for a face, for bags held a week. */
function plush(room: Room, x: number) {
  const { ctx } = room;
  const base = FRONT;
  const body = room.accent;
  disc(ctx, x + 5, base - 6, 5, shade(body, -0.25));
  disc(ctx, x + 5, base - 6, 4, body);
  stamp(room, x + 2, base - 9, 6);
  // little feet and arms
  rect(ctx, x + 2, base - 1, 2, 1, shade(body, -0.4));
  rect(ctx, x + 7, base - 1, 2, 1, shade(body, -0.4));
  px(ctx, x - 1, base - 6, shade(body, -0.2));
  px(ctx, x + 11, base - 6, shade(body, -0.2));
}

/** A gold cup topped with a diamond, for bags held a month. */
function trophy(room: Room, x: number) {
  const { ctx } = room;
  const base = FRONT;
  box(ctx, x + 1, base - 2, 8, 2, "#3f3f46");
  rect(ctx, x + 4, base - 5, 2, 3, shade(GOLD, -0.3));
  rect(ctx, x + 1, base - 11, 8, 6, GOLD);
  rect(ctx, x + 2, base - 11, 1, 5, "#fff1a8");
  px(ctx, x, base - 10, GOLD);
  px(ctx, x + 9, base - 10, GOLD);
  // the diamond
  rect(ctx, x + 3, base - 15, 4, 1, "#a5f3fc");
  rect(ctx, x + 2, base - 14, 6, 1, "#67e8f9");
  rect(ctx, x + 3, base - 13, 4, 1, "#22d3ee");
  px(ctx, x + 4, base - 12, "#0891b2");
  px(ctx, x + 5, base - 12, "#0891b2");
  room.fx.push((c, t) => {
    if (Math.floor(t / 500) % 7 === 0) {
      px(c, x + 3, base - 16, "#ffffff");
      glow(c, x + 5, base - 14, 6, "#67e8f9", 0.25);
    }
  });
}

/** A little cardboard HODL sign on a stick, for red days. */
function hodlSign(room: Room, x: number) {
  const { ctx } = room;
  const base = FRONT;
  rect(ctx, x + 8, base - 9, 1, 9, "#78350f");
  box(ctx, x, base - 17, 17, 9, "#d6b98c");
  rect(ctx, x, base - 9, 17, 1, "#a8895f");
  tiny(ctx, "HODL", x + 1, base - 15, "#7f1d1d");
}

/** On green days a rocket crosses the room now and then, trailing the coin's 24h move. */
function rocket(room: Room) {
  const pct = room.change24 ?? 0;
  const label = `+${Math.round(pct)}%`;
  const period = 9000;
  const y0 = 18 + Math.floor(room.r() * 10);
  const offset = room.r() * period;
  room.fx.push((c, t) => {
    const k = ((t + offset) % period) / 2600;
    if (k > 1) return;
    const x = Math.round(-14 + k * (ROOM_W + 28));
    const y = y0 - Math.round(k * 8);
    // trail and flame
    for (let i = 1; i < 6; i++) rect(c, x - i * 3, y + 1, 2, 1, rgba("#fbbf24", 0.6 - i * 0.1));
    rect(c, x - 2, y + 1, 2, 1, Math.floor(t / 80) % 2 ? "#f97316" : "#fde047");
    // body, nose, window
    rect(c, x, y, 6, 3, "#e5e7eb");
    rect(c, x + 6, y + 1, 1, 1, "#ef4444");
    px(c, x + 3, y + 1, "#38bdf8");
    rect(c, x + 1, y - 1, 2, 1, "#ef4444");
    rect(c, x + 1, y + 3, 2, 1, "#ef4444");
    tiny(c, label, x - tinyWidth(label) - 18, y - 1, "#86efac");
  });
}

/** Draws the coin layer for a held-bag floor. */
export function coinDecor(room: Room) {
  sack(room);
  // front right: the longer the hold, the more it shows
  if (room.tier >= 5) trophy(room, ROOM_W - 13);
  if (room.tier >= 3) plush(room, ROOM_W - (room.tier >= 5 ? 28 : 15));
  if (room.mood === "red") hodlSign(room, ROOM_W - (room.tier >= 5 ? 48 : room.tier >= 3 ? 36 : 22));
  if (room.mood === "green") rocket(room);
}
