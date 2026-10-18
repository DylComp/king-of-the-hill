// Tier 3-5 rooms: desks, clubs, suites and penthouses. Each one keeps the middle
// of the floor (roughly x 60-200) clear so citizens can walk through.
import { GOLD, GREEN, GREEN_HI, bands, box, glow, mix, noise, outline, px, rect, rgba, shade, tiny } from "../pixel";
import {
  BACK,
  ROOM_W,
  type Room,
  type Theme,
  WALL,
  baseboard,
  cityWindow,
  crown,
  curtains,
  floorCarpet,
  floorMarble,
  floorPlanks,
  floorTiles,
  neonSign,
  pendant,
  rug,
  stash,
  ticker,
  tokenArt,
  vignette,
  wainscot,
  wallFlat,
  wallPanels,
} from "./kit";
import {
  arcade,
  armchair,
  barCounter,
  bed,
  bookshelf,
  chandelier,
  clock,
  couch,
  discoBall,
  danceFloor,
  fireplace,
  floorLamp,
  goldBars,
  hotTub,
  monitor,
  nightstand,
  piano,
  plant,
  pokerTable,
  bottleShelves,
  slotMachine,
  speaker,
  spotlights,
  taps,
  telescope,
  turntable,
  vaultDoor,
} from "./props";

/** The coin's 24h move when the renderer provides it; tickers show "--" otherwise. */
const change = (room: Room) => (room as Room & { change24?: number | null }).change24 ?? null;
const up = (room: Room) => room.mood !== "red";

// ---------- local fixtures ----------

/** Repeating gold damask motif on a papered wall. */
function damask(room: Room, base: string, motif: string) {
  const { ctx } = room;
  rect(ctx, 0, 0, ROOM_W, WALL, base);
  for (let y = 4; y < WALL - 20; y += 12)
    for (let x = (y / 12) % 2 ? 8 : 2; x < ROOM_W; x += 12) {
      px(ctx, x + 2, y, motif);
      rect(ctx, x + 1, y + 1, 3, 1, motif);
      rect(ctx, x, y + 2, 5, 1, motif);
      rect(ctx, x + 1, y + 3, 3, 1, motif);
      px(ctx, x + 2, y + 4, motif);
    }
}

/** A long office desk with chairs and a row of monitors. */
function deskRow(room: Room, x: number, screens: number) {
  const { ctx } = room;
  const w = screens * 20 + 6;
  box(ctx, x, BACK - 10, w, 3, "#334155");
  rect(ctx, x + 2, BACK - 7, 2, 7, "#1e293b");
  rect(ctx, x + w - 4, BACK - 7, 2, 7, "#1e293b");
  rect(ctx, x + 6, BACK - 7, w - 12, 4, "#1e293b"); // modesty panel
  for (let i = 0; i < screens; i++) monitor(room, x + 4 + i * 20, BACK - 30, 18, 12, (i % 3 === 1) !== up(room));
  rect(ctx, x + w - 10, BACK - 13, 3, 3, "#f8fafc"); // coffee
  rect(ctx, x + w - 7, BACK - 12, 1, 1, "#f8fafc");
  rect(ctx, x + 8, BACK - 11, 8, 1, "#94a3b8"); // keyboard
}

function officeChair(room: Room, x: number) {
  const { ctx } = room;
  box(ctx, x, BACK - 16, 8, 9, "#111827");
  box(ctx, x - 1, BACK - 8, 10, 3, "#1f2937");
  rect(ctx, x + 3, BACK - 5, 2, 3, "#4b5563");
  rect(ctx, x - 1, BACK - 2, 10, 1, "#4b5563");
  px(ctx, x - 1, BACK - 1, "#111");
  px(ctx, x + 8, BACK - 1, "#111");
}

/** World clocks over a trading floor; the hands tick at different offsets. */
function worldClocks(room: Room, x: number, y: number, labels: string[]) {
  labels.forEach((l, i) => {
    clock(room, x + i * 16, y);
    tiny(room.ctx, l, x + i * 16 - 1, y + 9, "#64748b");
  });
}

/** A claw machine with a crane that roams over a pile of prizes. */
function clawMachine(room: Room, x: number) {
  const { ctx, r } = room;
  box(ctx, x, BACK - 34, 20, 34, "#be185d");
  rect(ctx, x + 2, BACK - 30, 16, 16, "#0c1220");
  rect(ctx, x + 1, BACK - 34, 18, 3, "#f9a8d4");
  for (let i = 0; i < 7; i++) {
    const c = ["#facc15", "#38bdf8", "#4ade80", room.accent, "#f472b6"][Math.floor(r() * 5)];
    rect(ctx, x + 3 + (i % 4) * 4, BACK - 18 - Math.floor(i / 4) * 3, 3, 3, c);
  }
  rect(ctx, x + 3, BACK - 12, 14, 6, "#9d174d");
  rect(ctx, x + 5, BACK - 10, 3, 2, "#1f2937");
  rect(ctx, x + 12, BACK - 11, 2, 3, "#ef4444");
  room.fx.push((c, t) => {
    const k = (Math.sin(t / 1400) + 1) / 2;
    const cx = x + 4 + Math.round(k * 11);
    const drop = Math.max(0, Math.round(Math.sin(t / 700) * 6));
    rect(c, cx + 1, BACK - 30, 1, 3 + drop, "#cbd5e1");
    rect(c, cx, BACK - 27 + drop, 3, 1, "#e2e8f0");
    px(c, cx, BACK - 26 + drop, "#e2e8f0");
    px(c, cx + 2, BACK - 26 + drop, "#e2e8f0");
    rect(c, x + 2, BACK - 30, 16, 1, "rgba(255,255,255,0.25)");
    glow(c, x + 10, BACK - 22, 16, "#f472b6", 0.08);
  });
}

/** Ticket prize shelf behind a counter. */
function prizeWall(room: Room, x: number, w: number) {
  const { ctx, r } = room;
  for (let row = 0; row < 3; row++) {
    const sy = 22 + row * 12;
    box(ctx, x, sy + 8, w, 2, "#4c1d95");
    for (let px0 = x + 2; px0 < x + w - 5; px0 += 7) {
      const c = ["#facc15", "#38bdf8", "#4ade80", room.accent, "#f472b6", "#fb923c"][Math.floor(r() * 6)];
      rect(ctx, px0, sy + 2, 5, 6, c); // plush body
      rect(ctx, px0 + 1, sy, 1, 2, c); // ears
      rect(ctx, px0 + 3, sy, 1, 2, c);
      px(ctx, px0 + 1, sy + 3, "#111");
      px(ctx, px0 + 3, sy + 3, "#111");
    }
  }
}

/** Hanging string lights that twinkle in turn. */
function stringLights(room: Room, x0: number, x1: number, y: number, sag = 4) {
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 6) {
    const k = ((x - x0) % 36) / 36;
    pts.push([x, y + Math.round(Math.sin(k * Math.PI) * sag)]);
  }
  for (const [x, yy] of pts) px(room.ctx, x, yy - 1, "#3f3f46");
  room.fx.push((c, t) => {
    pts.forEach(([x, yy], i) => {
      const on = (Math.floor(t / 400) + i) % 4 !== 0;
      const col = ["#fde68a", "#fca5a5", "#a7f3d0", "#bfdbfe"][i % 4];
      rect(c, x, yy, 1, 2, on ? col : shade(col, -0.6));
      if (on && i % 2 === 0) glow(c, x, yy + 1, 5, col, 0.25);
    });
  });
}

/** Floor-to-ceiling glass with a deep skyline and moon; counts as a window for weather. */
function skylineGlass(room: Room, x: number, w: number, frame: string) {
  const { ctx, r } = room;
  const y = 3;
  const h = WALL - 6;
  bands(ctx, x, y, w, h, "#05060f", "#1b2447", 6);
  for (let i = 0; i < w / 2; i++) px(ctx, x + Math.floor(r() * w), y + Math.floor(r() * h * 0.45), r() < 0.25 ? "#ffffff" : "#64748b");
  rect(ctx, x + w - 22, y + 6, 7, 7, "#fef9c3"); // moon
  rect(ctx, x + w - 20, y + 6, 5, 2, "#fffbeb");
  rect(ctx, x + w - 22, y + 11, 2, 2, "#fde68a");
  // distant then near skyline layers
  for (const [col, hMin, hSpan, lit] of [
    ["#121a33", 0.25, 0.25, 0.15],
    ["#0a0f1f", 0.35, 0.45, 0.35],
  ] as const) {
    let bx = x;
    while (bx < x + w) {
      const bw = 4 + Math.floor(r() * 9);
      const bh = Math.floor(h * (hMin + r() * hSpan));
      rect(ctx, bx, y + h - bh, Math.min(bw, x + w - bx), bh, col);
      if (r() < 0.2) rect(ctx, bx + Math.floor(bw / 2), y + h - bh - 4, 1, 4, col); // antenna
      for (let wy = y + h - bh + 2; wy < y + h - 1; wy += 3)
        for (let wx = bx + 1; wx < Math.min(bx + bw - 1, x + w - 1); wx += 2) if (r() < lit) px(ctx, wx, wy, r() < 0.12 ? GREEN : "#f5d77a");
      bx += bw + (r() < 0.3 ? 1 : 0);
    }
  }
  // one tower in the coin's colours, because it's our city
  const tx = x + Math.floor(w * 0.35);
  rect(ctx, tx, y + 18, 8, h - 18, "#0d1426");
  for (let wy = y + 21; wy < y + h - 2; wy += 3) rect(ctx, tx + 2, wy, 4, 1, rgba(room.accent, 0.7));
  room.fx.push((c, t) => {
    if (Math.floor(t / 600) % 2) rect(c, tx + 3, y + 15, 2, 2, "#ef4444"); // beacon
  });
  for (let mx = x; mx <= x + w; mx += Math.floor(w / 4)) rect(ctx, mx, y, 2, h, frame);
  rect(ctx, x, y, w + 2, 2, frame);
  rect(ctx, x, y + h - 1, w + 2, 2, shade(frame, -0.3));
  rect(ctx, x + 4, y + 3, 1, h - 8, "rgba(255,255,255,0.07)");
  rect(ctx, x + 6, y + 3, 1, h - 20, "rgba(255,255,255,0.05)");
  room.windows.push({ x, y, w, h });
}

/** Sideboard with a champagne bucket. */
function sideboard(room: Room, x: number, w: number) {
  const { ctx } = room;
  box(ctx, x, BACK - 12, w, 12, "#3b2314");
  for (let i = 0; i < w - 4; i += 10) outline(ctx, x + 2 + i, BACK - 9, 8, 7, "#2a170b");
  rect(ctx, x + 2, BACK - 1, w - 4, 1, GOLD);
  box(ctx, x + w - 12, BACK - 18, 7, 6, "#cbd5e1");
  rect(ctx, x + w - 10, BACK - 23, 2, 6, "#14532d");
  rect(ctx, x + w - 10, BACK - 24, 2, 1, GOLD);
}

// ---------- themes ----------

/** Tier 3: a trading floor desk with the coin on every screen. */
export const tradingDesk: Theme = {
  id: "trading-desk",
  name: "Trading Desk",
  draw(room) {
    const { ctx, r } = room;
    wallPanels(room, "#1e293b", 24);
    noise(ctx, r, 0, 0, ROOM_W, WALL, ["#273449"], 0.03);
    crown(room, "#0f172a");
    baseboard(room, "#0f172a");
    floorCarpet(room, "#2b3445");
    // full-width LED board along the top
    ticker(room, 4, 6, ROOM_W - 8, change(room));
    worldClocks(room, 66, 20, ["NY", "LDN", "TKY", "SOL"]);
    // whiteboard with a hand-drawn chart and the bag's thesis
    box(ctx, 132, 18, 46, 28, "#e2e8f0");
    rect(ctx, 134, 20, 42, 24, "#f8fafc");
    let cy = 38;
    for (let cx = 136; cx < 172; cx += 2) {
      cy += r() < (up(room) ? 0.35 : 0.65) ? 1 : -1;
      cy = Math.max(24, Math.min(41, cy));
      rect(ctx, cx, cy, 2, 1, up(room) ? "#16a34a" : "#dc2626");
    }
    tiny(ctx, room.symbol.slice(0, 5), 136, 22, "#1d4ed8");
    tiny(ctx, up(room) ? "SEND" : "HOLD", 156, 22, "#dc2626");
    rect(ctx, 136, 46, 12, 1, "#94a3b8"); // marker tray
    rect(ctx, 138, 45, 3, 1, "#2563eb");
    rect(ctx, 142, 45, 3, 1, "#dc2626");
    // desk with four screens on the left, framed coin on the right
    deskRow(room, 4, 3);
    officeChair(room, 28);
    tokenArt(room, 196, 18, 14, "neon");
    neonSign(room, `$${room.symbol}`.slice(0, 9), 203, 40);
    cityWindow(room, 222, 18, 26, 30, "#334155");
    bookshelf(room, 222, 28, 22);
    plant(room, 188, "m");
    stash(room, 54, BACK);
    pendant(room, 40, "#e0f2fe", 4, "#334155");
    pendant(room, 150, "#e0f2fe", 4, "#334155");
    room.fx.push((c, t) => glow(c, 40, 60, 50, up(room) ? GREEN : "#ef4444", 0.04 + 0.02 * Math.sin(t / 500)));
    vignette(room);
  },
};

/** Tier 4: the coin's own nightclub. */
export const pumpClub: Theme = {
  id: "pump-club",
  name: "Pump Club",
  draw(room) {
    const { ctx } = room;
    wallFlat(room, "#0a0a12", 0.06);
    // acoustic panels with accent stripes
    for (let x = 0; x < ROOM_W; x += 16) {
      rect(ctx, x + 1, 14, 14, 50, "#11111c");
      for (let y = 16; y < 62; y += 4) rect(ctx, x + 2, y, 12, 1, "#16162a");
    }
    rect(ctx, 0, 12, ROOM_W, 1, rgba(room.accent, 0.5));
    rect(ctx, 0, 65, ROOM_W, 1, rgba(room.accent, 0.5));
    floorTiles(room, "#12121c", "#191926", 8);
    danceFloor(room);
    // DJ booth on the left
    speaker(room, 4, 30);
    box(ctx, 16, BACK - 16, 36, 16, "#18181b");
    rect(ctx, 16, BACK - 12, 36, 1, room.accent);
    tiny(ctx, "DJ", 30, BACK - 9, shade(room.accent, 0.3));
    turntable(room, 23, BACK - 21);
    speaker(room, 54, 22);
    // bar on the right edge, front layer
    bottleShelves(room, 206, 46, 24, 3);
    taps(room, 214);
    barCounter(room, 202, 54);
    stash(room, 236, BACK - 4);
    // headline sign and the coin above the floor
    neonSign(room, `$${room.symbol} CLUB`.slice(0, 14), 128, 22);
    tokenArt(room, 120, 40, 16, "neon");
    discoBall(room, 128);
    spotlights(room, [70, 186], [room.accent, "#a855f7"]);
    // laser sweep
    room.fx.push((c, t) => {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.strokeStyle = rgba("#22d3ee", 0.25);
      c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = Math.sin(t / 900 + i * 2.1) * 0.8;
        c.beginPath();
        c.moveTo(38, BACK - 20);
        c.lineTo(38 + Math.cos(a - 0.6) * 220, BACK - 20 + Math.sin(a - 0.6) * 70);
        c.stroke();
      }
      c.restore();
    });
    vignette(room);
  },
};

/** Tier 4: cabinets wall to wall, with the coin as the high score. */
export const arcadeHall: Theme = {
  id: "arcade-hall",
  name: "Arcade Hall",
  draw(room) {
    const { ctx, r } = room;
    wallFlat(room, "#1a0f2e", 0.05);
    // star-confetti wallpaper
    for (let i = 0; i < 70; i++) px(ctx, Math.floor(r() * ROOM_W), 4 + Math.floor(r() * 50), ["#7c3aed", "#db2777", "#0ea5e9", "#facc15"][i % 4]);
    rect(ctx, 0, 54, ROOM_W, 2, "#db2777");
    rect(ctx, 0, 56, ROOM_W, 1, "#7c3aed");
    // galaxy carpet
    floorCarpet(room, "#1e1036");
    for (let i = 0; i < 40; i++) px(ctx, Math.floor(r() * ROOM_W), WALL + 2 + Math.floor(r() * 14), ["#22d3ee", "#f472b6", "#facc15"][i % 3]);
    // high score board
    box(ctx, 82, 6, 92, 22, "#0b0b14");
    outline(ctx, 83, 7, 90, 20, "#7c3aed");
    tiny(ctx, "HI-SCORE", 87, 10, "#facc15");
    room.fx.push((c, t) => {
      const blink = Math.floor(t / 500) % 2;
      tiny(c, `1 ${room.symbol}`.slice(0, 10), 87, 17, blink ? room.accent : shade(room.accent, -0.4));
      tiny(c, "999999", 141, 17, "#f8fafc");
    });
    tokenArt(room, 180, 8, 14, "neon");
    // cabinets along the back wall
    const cols = ["#1e1b4b", "#7f1d1d", "#14532d", "#1e3a8a", "#581c87"];
    for (let i = 0; i < 5; i++) arcade(room, 60 + i * 18, cols[i]);
    clawMachine(room, 4);
    clawMachine(room, 28);
    // prize counter on the right
    prizeWall(room, 202, 50);
    box(ctx, 200, BACK - 14, 54, 14, "#312e81");
    rect(ctx, 200, BACK - 14, 54, 2, "#a78bfa");
    tiny(ctx, "PRIZES", 214, BACK - 10, "#facc15");
    ticker(room, 152, 38, 44, change(room));
    stash(room, 160, BACK);
    neonSign(room, "PLAY", 128, 38, "#f472b6");
    room.fx.push((c, t) => glow(c, 128, 60, 110, ["#7c3aed", "#db2777", "#0ea5e9"][Math.floor(t / 1500) % 3], 0.05));
    vignette(room);
  },
};

/** Tier 4: a grand hotel suite in cream and gold. */
export const gildedSuite: Theme = {
  id: "gilded-suite",
  name: "Gilded Suite",
  draw(room) {
    const { ctx } = room;
    damask(room, "#efe3c8", "#dcc79a");
    wainscot(room, "#5a3a22", 22);
    crown(room, GOLD);
    floorMarble(room, "#e7e2d6", "#d8d2c3");
    rug(room, 64, 128, "#7f1d1d", "persian");
    // canopy bed on the left
    rect(ctx, 6, 8, 2, BACK - 8, "#5a3a22");
    rect(ctx, 56, 8, 2, BACK - 8, "#5a3a22");
    box(ctx, 4, 6, 56, 4, "#7f1d1d");
    for (let x = 6; x < 58; x += 4) rect(ctx, x, 10, 2, 3, "#991b1b");
    rect(ctx, 9, 13, 4, 50, rgba("#fde68a", 0.35)); // drapes
    rect(ctx, 51, 13, 4, 50, rgba("#fde68a", 0.35));
    bed(room, 10, 44, "#7f1d1d");
    // window with heavy curtains
    cityWindow(room, 80, 12, 38, 34, "#e8d5a8");
    curtains(room, 80, 12, 34, 38, "#7f1d1d");
    // the coin as an oil portrait
    tokenArt(room, 140, 14, 22, "gold");
    tiny(ctx, `$${room.symbol}`.slice(0, 8), 140, 40, "#7a5a1a");
    // fireplace, armchair, side table and lamp on the right
    fireplace(room, 200, BACK);
    rect(ctx, 204, 50, 26, 4, "#78716c");
    clock(room, 214, 44);
    armchair(room, 182, "#7f1d1d", BACK, true);
    nightstand(room, 240);
    stash(room, 120, BACK);
    chandelier(room, 128);
    room.fx.push((c, t) => glow(c, 128, 30, 120, "#fde68a", 0.05 + 0.01 * Math.sin(t / 900)));
    vignette(room);
  },
};

/** Tier 5: the top floor; all glass, a piano, a fire and the coin in gold. */
export const penthouse: Theme = {
  id: "penthouse",
  name: "Penthouse",
  draw(room) {
    const { ctx } = room;
    wallFlat(room, "#1c1917", 0.04);
    skylineGlass(room, 44, 168, "#2a2522");
    // dark stone columns either side of the glass
    box(ctx, 0, 0, 44, WALL, "#292524");
    box(ctx, 212, 0, 44, WALL, "#292524");
    for (let y = 6; y < WALL; y += 12) {
      rect(ctx, 2, y, 40, 1, "#1c1917");
      rect(ctx, 214, y, 40, 1, "#1c1917");
    }
    crown(room, GOLD);
    floorMarble(room, "#2b2a2e", "#232226");
    rug(room, 72, 112, "#0f172a", "persian");
    // left: fireplace with the coin over the mantel
    fireplace(room, 5, BACK);
    tokenArt(room, 13, 18, 18, "gold");
    // right: grand piano and a bar cart
    piano(room, 220, BACK);
    sideboard(room, 46, 24);
    // lounge seating sits low along the glass, the walkway stays clear
    couch(room, 84, 40, "#e7e5e4");
    floorLamp(room, 132);
    armchair(room, 146, "#e7e5e4");
    plant(room, 202, "l");
    goldBars(room, 162, BACK);
    stash(room, 230, BACK - 22);
    neonSign(room, `$${room.symbol}`.slice(0, 9), 234, 8, GOLD);
    ticker(room, 4, 4, 36, change(room));
    chandelier(room, 110);
    room.fx.push((c, t) => glow(c, 128, 40, 140, "#fde68a", 0.04 + 0.01 * Math.sin(t / 1100)));
    vignette(room);
  },
};

/** Tier 5: rooftop greenhouse with a hot tub under the stars. */
export const skyGarden: Theme = {
  id: "sky-garden",
  name: "Sky Garden",
  draw(room) {
    const { ctx, r } = room;
    // open sky through the glass roof, dusk to night
    bands(ctx, 0, 0, ROOM_W, WALL, "#0b1030", "#3b2a5a", 6);
    for (let i = 0; i < 60; i++) px(ctx, Math.floor(r() * ROOM_W), Math.floor(r() * 40), r() < 0.3 ? "#ffffff" : "#94a3b8");
    // skyline far below
    let bx = 0;
    while (bx < ROOM_W) {
      const bw = 5 + Math.floor(r() * 8);
      const bh = 10 + Math.floor(r() * 18);
      rect(ctx, bx, WALL - bh, bw, bh, "#160f2a");
      for (let wy = WALL - bh + 2; wy < WALL - 1; wy += 3) for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) if (r() < 0.3) px(ctx, wx, wy, "#f5d77a");
      bx += bw + 1;
    }
    room.windows.push({ x: 0, y: 0, w: ROOM_W, h: WALL - 4 });
    // greenhouse frame
    for (let x = 0; x <= ROOM_W; x += 32) rect(ctx, x, 0, 2, WALL, "#e2e8f0");
    rect(ctx, 0, 0, ROOM_W, 2, "#e2e8f0");
    rect(ctx, 0, 30, ROOM_W, 1, rgba("#e2e8f0", 0.6));
    for (let x = 0; x < ROOM_W; x += 32) rect(ctx, x + 6, 3, 1, 26, "rgba(255,255,255,0.06)");
    // shooting star
    room.fx.push((c, t) => {
      const k = (t % 7000) / 900;
      if (k < 1) for (let i = 0; i < 6; i++) px(c, 40 + Math.round(k * 120) - i * 2, 6 + Math.round(k * 20) - i, rgba("#ffffff", 1 - i / 6));
    });
    // wooden deck with planters
    floorPlanks(room, "#8a5a33");
    box(ctx, 0, WALL - 8, ROOM_W, 8, "#5b3a22"); // planter wall
    rect(ctx, 0, WALL - 8, ROOM_W, 1, "#7a5232");
    for (let x = 2; x < ROOM_W; x += 5) {
      const h = 3 + Math.floor(r() * 6);
      rect(ctx, x, WALL - 8 - h, 3, h, r() < 0.5 ? "#16a34a" : "#22c55e");
      if (r() < 0.25) rect(ctx, x + 1, WALL - 9 - h, 2, 2, ["#f472b6", "#facc15", "#f8fafc", room.accent][Math.floor(r() * 4)]);
    }
    stringLights(room, 4, 252, 6, 5);
    // hot tub left, telescope right, big plants framing
    plant(room, 2, "l");
    hotTub(room, 14, 46);
    room.fx.push((c, t) => {
      for (let i = 0; i < 4; i++) {
        const k = (t / 2400 + i / 4) % 1;
        c.fillStyle = rgba("#f1f5f9", 0.25 * (1 - k));
        c.fillRect(20 + i * 10 + Math.round(Math.sin(t / 500 + i) * 2), BACK - 8 - k * 18, 3, 2);
      }
    });
    telescope(room, 222, BACK);
    plant(room, 240, "l");
    plant(room, 66, "m");
    plant(room, 186, "m");
    // the coin on a stone plinth, lit from below
    box(ctx, 120, 44, 16, 26, "#a8a29e");
    rect(ctx, 118, 42, 20, 3, "#d6d3d1");
    tokenArt(room, 121, 46, 14, "gold");
    room.fx.push((c, t) => glow(c, 128, 54, 26, GOLD, 0.12 + 0.03 * Math.sin(t / 700)));
    neonSign(room, `$${room.symbol}`.slice(0, 9), 128, 30, GREEN_HI);
    stash(room, 196, BACK);
    ticker(room, 200, 36, 50, change(room));
    vignette(room);
  },
};

/** Tier 5, biggest bags: an aquarium wall, a vault and a private card room. */
export const whaleLounge: Theme = {
  id: "whale-lounge",
  name: "Whale Lounge",
  draw(room) {
    const { ctx, r } = room;
    wallFlat(room, "#0b1324", 0.05);
    crown(room, GOLD);
    floorMarble(room, "#151c2e", "#10172a");
    // the great tank across the back wall
    const tx = 52;
    const tw = 152;
    const ty = 6;
    const th = 50;
    box(ctx, tx - 3, ty - 3, tw + 6, th + 6, "#1e293b");
    bands(ctx, tx, ty, tw, th, "#0e7490", "#082f49", 5);
    for (let i = 0; i < 14; i++) {
      const kx = tx + 4 + Math.floor(r() * (tw - 8));
      const kh = 6 + Math.floor(r() * 12);
      for (let k = 0; k < kh; k++) px(ctx, kx + Math.round(Math.sin(k / 2) * 1), ty + th - 3 - k, k % 3 ? "#15803d" : "#22c55e");
    }
    rect(ctx, tx, ty + th - 3, tw, 3, "#d6c7a1");
    noise(ctx, r, tx, ty + th - 3, tw, 3, ["#b8a67c", "#efe2bd"], 0.3);
    // a chest of gold on the sea bed
    box(ctx, tx + 110, ty + th - 9, 10, 6, "#7c4a1e");
    rect(ctx, tx + 111, ty + th - 10, 8, 2, GOLD);
    room.fx.push((c, t) => {
      // the whale, in the coin's colours
      const k = ((t / 60) % (tw + 60)) - 30;
      const wx = tx + Math.round(k);
      const wy = ty + 16 + Math.round(Math.sin(t / 900) * 3);
      c.save();
      c.beginPath();
      c.rect(tx, ty, tw, th);
      c.clip();
      const body = mix(room.accent, "#1e3a8a", 0.45);
      rect(c, wx, wy, 26, 10, body);
      rect(c, wx + 2, wy - 1, 20, 1, body);
      rect(c, wx + 3, wy + 10, 20, 2, shade(body, 0.35));
      rect(c, wx - 6, wy + 2, 6, 3, body);
      rect(c, wx - 9, wy, 4, 2, body);
      rect(c, wx - 9, wy + 5, 4, 2, body);
      px(c, wx + 21, wy + 4, "#ffffff");
      rect(c, wx + 12, wy + 9, 5, 2, shade(body, -0.25)); // fin
      if (Math.floor(t / 1600) % 3 === 0) {
        const s = (t % 1600) / 1600;
        for (let i = 0; i < 3; i++) px(c, wx + 18 + i, wy - 3 - Math.round(s * 10) - i, "#e0f2fe");
      }
      // small fish and bubbles
      for (let i = 0; i < 6; i++) {
        const fx = tx + ((t / (25 + i * 9) + i * 31) % tw);
        rect(c, Math.round(fx), ty + 6 + i * 6, 3, 2, ["#fb923c", "#facc15", "#f472b6", "#a3e635"][i % 4]);
      }
      for (let i = 0; i < 5; i++) {
        const by = ty + th - (((t / 40) + i * 13) % th);
        px(c, tx + 20 + i * 28, Math.round(by), "#e0f2fe");
      }
      c.restore();
      rect(c, tx, ty, tw, 1, "rgba(255,255,255,0.25)");
      glow(c, tx + tw / 2, ty + th / 2, tw * 0.55, "#22d3ee", 0.06 + 0.02 * Math.sin(t / 1000));
    });
    // vault and gold on the left
    vaultDoor(room, 8, 14);
    tiny(ctx, "VAULT", 15, 50, GOLD);
    goldBars(room, 6, BACK);
    stash(room, 36, BACK);
    // slots and the card room on the right
    slotMachine(room, 210, BACK);
    slotMachine(room, 228, BACK);
    pokerTable(room, 200, 52);
    // the coin under glass, plus nameplate and live price
    tokenArt(room, 216, 10, 18, "gold");
    ticker(room, 6, 58, 38, change(room));
    neonSign(room, `$${room.symbol} WHALES`.slice(0, 16), 128, 64, GOLD);
    chandelier(room, 28);
    vignette(room);
  },
};

export const THEMES_B: Theme[] = [tradingDesk, pumpClub, arcadeHall, gildedSuite, penthouse, skyGarden, whaleLounge];
