// Studio to loft tiers: street food, chores, first real apartments, and the
// places a bag starts to show off. Same order as themes-core: walls and floor,
// props back to front, token touches, then light.
import { GOLD, GREEN, GREEN_HI, box, glow, noise, outline, rect, rgba, shade, tiny } from "../pixel";
import {
  BACK,
  ROOM_W,
  type Theme,
  WALL,
  ambient,
  baseboard,
  cityWindow,
  crown,
  curtains,
  floorCarpet,
  floorPlanks,
  floorTiles,
  neonSign,
  pendant,
  rug,
  stash,
  ticker,
  tiles,
  tokenArt,
  vignette,
  wainscot,
  wallBrick,
  wallFlat,
  wallStripes,
} from "./kit";
import {
  bed,
  clock,
  counter,
  deskLamp,
  floorLamp,
  lantern,
  monitor,
  noodlePot,
  nightstand,
  plant,
  poster,
  recordCrate,
  register,
  speaker,
  stool,
  table,
  turntable,
  wallShelf,
  washer,
} from "./props";

/** Studio tier: a steamy street noodle counter under paper lanterns. */
const noodleStall: Theme = {
  id: "noodle-stall",
  name: "Noodle Stall",
  draw(room) {
    const { ctx, r, tier } = room;
    wallFlat(room, "#3a1f1a", 0.1);
    // wooden slats on the upper wall
    for (let x = 0; x < ROOM_W; x += 8) {
      rect(ctx, x, 0, 7, 36, shade("#5a3220", (r() - 0.5) * 0.12));
      rect(ctx, x + 7, 0, 1, 36, "#2a150e");
    }
    // white tiled lower wall behind the counter
    tiles(room, 0, 36, ROOM_W, WALL - 36, "#e7e5e4", "#d6d3d1", 4);
    rect(ctx, 0, 35, ROOM_W, 2, "#7f1d1d");
    // fabric awning
    for (let x = 0; x < ROOM_W; x += 12) {
      rect(ctx, x, 4, 12, 7, (x / 12) % 2 ? "#b91c1c" : "#f5f5f4");
      rect(ctx, x + 2, 11, 8, 2, (x / 12) % 2 ? "#991b1b" : "#d6d3d1");
    }
    rect(ctx, 0, 3, ROOM_W, 1, "#450a0a");
    // menu boards with prices in the coin
    for (const [mx, items] of [[8, ["RAMEN", "GYOZA", "TEA"]], [196, ["UDON", "BUNS", "MOCHI"]]] as const) {
      box(ctx, mx, 15, 50, 21, "#1c1917");
      outline(ctx, mx + 1, 16, 48, 19, "#57534e");
      items.forEach((it, i) => {
        tiny(ctx, it, mx + 3, 18 + i * 6, "#f5f5f4");
        tiny(ctx, `${(i + 1) * 3}`, mx + 42, 18 + i * 6, room.accent);
      });
    }
    neonSign(room, `$${room.symbol} NOODLE`, 128, 16, room.accent);
    floorTiles(room, "#44403c", "#3a3633", 8);
    // back counter with pots and bowls stacked against the wall
    box(ctx, 4, BACK - 16, 56, 16, "#78350f");
    rect(ctx, 4, BACK - 16, 56, 2, "#a16207");
    noodlePot(room, 10, BACK - 16);
    noodlePot(room, 28, BACK - 16);
    for (let i = 0; i < 4; i++) {
      rect(ctx, 46, BACK - 18 - i * 2, 9, 2, i % 2 ? "#f5f5f4" : "#e7e5e4");
      rect(ctx, 47, BACK - 18 - i * 2, 7, 1, "#b91c1c");
    }
    box(ctx, 200, BACK - 16, 52, 16, "#78350f");
    rect(ctx, 200, BACK - 16, 52, 2, "#a16207");
    noodlePot(room, 206, BACK - 16);
    // chopstick jar, soy bottles
    rect(ctx, 224, BACK - 21, 4, 5, "#e7e5e4");
    for (let i = 0; i < 3; i++) rect(ctx, 224 + i, BACK - 26, 1, 5, "#d6b46b");
    for (let i = 0; i < 3; i++) box(ctx, 232 + i * 5, BACK - 22, 3, 6, i === 1 ? "#7f1d1d" : "#1c1917");
    register(room, 240, BACK - 16);
    // lucky cat on the shelf, waving
    room.fx.push((c, t) => {
      const wave = Math.floor(t / 300) % 2;
      rect(c, 70, BACK - 30, 7, 7, "#fafaf9");
      rect(c, 71, BACK - 32, 2, 2, "#fafaf9");
      rect(c, 75, BACK - 32, 2, 2, "#fafaf9");
      rect(c, 72, BACK - 28, 1, 1, "#1c1917");
      rect(c, 75, BACK - 28, 1, 1, "#1c1917");
      rect(c, 71, BACK - 25, 5, 1, "#dc2626");
      rect(c, 77, BACK - 33 + wave, 2, 4, "#fafaf9");
      rect(c, 72, BACK - 24, 3, 1, GOLD);
    });
    wallShelf(room, 64, BACK - 23, 20, "boxes");
    tokenArt(room, 176, 40, 12, "black");
    stash(room, 92, BACK - 24 + 0);
    // stools in front of the counters
    stool(room, 20, BACK + 6, "#b91c1c");
    stool(room, 38, BACK + 6, "#b91c1c");
    stool(room, 214, BACK + 6, "#b91c1c");
    stool(room, 232, BACK + 6, "#b91c1c");
    lantern(room, 84, 18, "#dc2626");
    lantern(room, 168, 22, "#ea580c");
    if (tier >= 2) lantern(room, 126, 30, room.accent);
    ambient(room, "#ea580c", 0.04);
    vignette(room);
  },
};

/** Studio tier: a 24h laundromat, a row of spinning drums. */
const laundromat: Theme = {
  id: "laundromat",
  name: "Laundromat",
  draw(room) {
    const { ctx, r, tier } = room;
    wallFlat(room, "#a7d3d0", 0.05);
    tiles(room, 0, 46, ROOM_W, WALL - 46, "#e2f0ef", "#cfe5e3", 4);
    rect(ctx, 0, 44, ROOM_W, 2, "#2f7f7a");
    crown(room, "#7fb7b3");
    // big front window to the street
    cityWindow(room, 162, 8, 70, 28, "#e5e7eb");
    tiny(ctx, "OPEN 24H", 182, 12, rgba("#fde68a", 0.85));
    // notice board with lost socks and a coin flyer
    box(ctx, 8, 10, 40, 26, "#b45309");
    rect(ctx, 10, 12, 36, 22, "#d6a36b");
    noise(ctx, r, 10, 12, 36, 22, ["#c08a52"], 0.15);
    for (let i = 0; i < 5; i++) {
      const nx = 12 + (i % 3) * 11;
      const ny = 14 + Math.floor(i / 3) * 10;
      rect(ctx, nx, ny, 9, 8, ["#fef9c3", "#fce7f3", "#f8fafc", "#dbeafe", "#f8fafc"][i]);
      rect(ctx, nx + 4, ny, 1, 1, "#dc2626");
      for (let l = 0; l < 3; l++) rect(ctx, nx + 1, ny + 2 + l * 2, 6 - (l % 2) * 2, 1, "#9ca3af");
    }
    tokenArt(room, 36, 23, 9, "tape");
    // washers along the back wall, the full stretch
    for (let i = 0; i < 6; i++) washer(room, 56 + i * 18, BACK);
    // dryers stacked on the top row
    for (let i = 0; i < 6; i++) {
      const dx = 56 + i * 18;
      box(ctx, dx, BACK - 38, 16, 18, "#d4d4d8");
      rect(ctx, dx + 3, BACK - 33, 10, 10, "#3f3f46");
      rect(ctx, dx + 4, BACK - 32, 8, 8, i % 3 === 1 ? "#f59e0b" : "#18181b");
      rect(ctx, dx + 11, BACK - 36, 2, 1, i % 2 ? "#ef4444" : GREEN_HI);
    }
    // folding table and a laundry basket on the right
    table(room, 170, 34, "#e5e7eb", BACK, 12);
    for (let i = 0; i < 3; i++) box(ctx, 174 + i * 9, BACK - 15, 8, 3, ["#60a5fa", "#f472b6", room.accent][i]);
    box(ctx, 214, BACK - 9, 14, 9, "#f8fafc");
    for (let i = 216; i < 227; i += 3) rect(ctx, i, BACK - 8, 1, 7, "#cbd5e1");
    rect(ctx, 215, BACK - 11, 12, 2, "#a78bfa");
    // change machine with the coin on it
    box(ctx, 238, BACK - 28, 14, 28, "#475569");
    rect(ctx, 240, BACK - 25, 10, 6, "#0f172a");
    tiny(ctx, room.symbol.slice(0, 2), 241, BACK - 24, room.accent);
    rect(ctx, 243, BACK - 15, 4, 1, "#0f172a");
    rect(ctx, 241, BACK - 8, 8, 3, "#1e293b");
    ticker(room, 166, 40, 64, null);
    floorTiles(room, "#f1f5f9", "#cbd5e1", 8);
    // plastic chairs on the left
    for (let i = 0; i < 2; i++) {
      const cx = 10 + i * 18;
      box(ctx, cx, BACK - 14, 12, 7, "#f97316");
      rect(ctx, cx, BACK - 7, 12, 3, "#ea580c");
      rect(ctx, cx + 1, BACK - 4, 1, 4, "#52525b");
      rect(ctx, cx + 10, BACK - 4, 1, 4, "#52525b");
    }
    stash(room, 42);
    if (tier >= 2) plant(room, 196, "s", BACK - 12);
    // flickering fluorescent tubes
    for (const fx0 of [80, 160]) {
      rect(ctx, fx0 - 14, 4, 28, 2, "#94a3b8");
      room.fx.push((c, t) => {
        const off = fx0 === 160 && Math.sin(t / 97) > 0.93;
        rect(c, fx0 - 13, 6, 26, 1, off ? "#64748b" : "#f8fafc");
        if (!off) glow(c, fx0, 8, 40, "#e0f2fe", 0.08);
      });
    }
    vignette(room);
  },
};

/** Apartment tier: soft pastels, a big bed, plants and the coin in a gallery frame. */
const pastelLoft: Theme = {
  id: "pastel-loft",
  name: "Pastel Loft",
  draw(room) {
    const { ctx, tier } = room;
    wallStripes(room, "#fbcfe8", "#f9d5ec", 5);
    wainscot(room, "#e9d5ff", 24);
    crown(room, "#f5f3ff");
    // tall arched window with curtains
    cityWindow(room, 140, 10, 40, 34, "#fdf2f8");
    curtains(room, 140, 10, 34, 40, "#c4b5fd");
    // gallery wall
    tokenArt(room, 90, 14, 18, "gold");
    poster(room, 66, 18, 14, 18, "abstract");
    poster(room, 116, 20, 12, 14, "moon");
    // heart neon in the coin's colour
    room.fx.push((c, t) => {
      const on = Math.floor(t / 900) % 5 !== 0;
      const col = on ? shade(room.accent, 0.3) : shade(room.accent, -0.5);
      const heart = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
      heart.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === "1") rect(c, 200 + x, 16 + y, 1, 1, col);
      });
      if (on) glow(c, 203, 19, 16, room.accent, 0.14);
    });
    neonSign(room, room.symbol, 226, 14, room.accent);
    floorPlanks(room, "#e7c9a9");
    rug(room, 66, 128, "#f0abfc", "stripe");
    // bed on the left with nightstand and lamp
    bed(room, 4, 52, "#f9a8d4");
    nightstand(room, 58);
    deskLamp(room, 60, BACK - 8, "#fef3c7");
    // vanity and floor plants on the right
    box(ctx, 206, BACK - 14, 26, 14, "#fdf4ff");
    rect(ctx, 208, BACK - 10, 22, 1, "#e9d5ff");
    rect(ctx, 218, BACK - 8, 2, 2, GOLD);
    box(ctx, 210, BACK - 34, 18, 18, "#e9d5ff");
    rect(ctx, 212, BACK - 32, 14, 14, "#dbeafe");
    rect(ctx, 213, BACK - 31, 2, 10, "rgba(255,255,255,0.7)");
    for (let i = 0; i < 3; i++) rect(ctx, 208 + i * 4, BACK - 17, 2, 3, ["#f472b6", "#a78bfa", room.accent][i]);
    plant(room, 236, "l");
    plant(room, 194, "s");
    wallShelf(room, 8, 26, 40, "plants");
    stash(room, 182);
    if (tier >= 3) floorLamp(room, 246, "#fce7f3");
    pendant(room, 128, "#fff7ed", 6, "#f5d0fe");
    ambient(room, "#f472b6", 0.03);
    vignette(room);
  },
};

/** Apartment tier: RGB everything, a battlestation and posters. */
const gamerDen: Theme = {
  id: "gamer-den",
  name: "Gamer Den",
  draw(room) {
    const { ctx, r, tier } = room;
    wallFlat(room, "#151327", 0.08);
    // acoustic foam panels
    for (let gy = 10; gy < 46; gy += 9)
      for (let gx = 70; gx < 186; gx += 9) {
        rect(ctx, gx, gy, 8, 8, "#221e3d");
        rect(ctx, gx + 1, gy + 1, 3, 3, "#2b2650");
        rect(ctx, gx + 4, gy + 4, 3, 3, "#1a1730");
      }
    // posters
    poster(room, 10, 10, 18, 24, "abstract");
    poster(room, 34, 14, 14, 18, "chart");
    poster(room, 230, 10, 18, 24, "moon");
    floorCarpet(room, "#1e1b30");
    // battlestation desk centred on the back wall
    const dx = 76;
    box(ctx, dx, BACK - 12, 104, 3, "#18181b");
    rect(ctx, dx + 2, BACK - 9, 2, 9, "#09090b");
    rect(ctx, dx + 100, BACK - 9, 2, 9, "#09090b");
    monitor(room, dx + 14, BACK - 32, 26, 16, true);
    monitor(room, dx + 44, BACK - 34, 30, 18, (room.mood ?? "flat") !== "red");
    monitor(room, dx + 78, BACK - 32, 18, 16, true);
    // keyboard with RGB sweep
    rect(ctx, dx + 40, BACK - 14, 26, 2, "#27272a");
    room.fx.push((c, t) => {
      for (let i = 0; i < 26; i += 2) {
        const hue = (i * 14 + t / 8) % 360;
        c.fillStyle = `hsl(${hue},90%,60%)`;
        c.fillRect(dx + 40 + i, BACK - 14, 1, 1);
      }
    });
    rect(ctx, dx + 70, BACK - 13, 3, 1, "#a1a1aa"); // mouse
    // PC tower with glass side
    box(ctx, dx + 104 - 10, BACK - 30, 12, 18, "#18181b");
    room.fx.push((c, t) => {
      const hue = (t / 12) % 360;
      c.fillStyle = `hsla(${hue},90%,60%,0.9)`;
      c.fillRect(dx + 96, BACK - 28, 8, 1);
      c.fillRect(dx + 96, BACK - 16, 8, 1);
      for (let i = 0; i < 2; i++) {
        const f = Math.floor(t / 80 + i) % 2;
        rect(c, dx + 97 + f, BACK - 25 + i * 5, 2, 2, "#e4e4e7");
        rect(c, dx + 99 - f, BACK - 25 + i * 5, 2, 2, "#71717a");
      }
    });
    // LED strip along the top of the foam wall
    room.fx.push((c, t) => {
      for (let x = 70; x < 186; x += 2) {
        const hue = (x * 3 + t / 6) % 360;
        c.fillStyle = `hsl(${hue},90%,62%)`;
        c.fillRect(x, 7, 2, 1);
      }
      glow(c, 128, 8, 70, room.accent, 0.06);
    });
    // gaming chair in front of the desk (behind citizens is fine, against the desk)
    box(ctx, dx + 50, BACK - 22, 12, 14, "#111827");
    rect(ctx, dx + 52, BACK - 20, 8, 10, room.accent);
    rect(ctx, dx + 55, BACK - 8, 2, 6, "#3f3f46");
    rect(ctx, dx + 50, BACK - 2, 12, 1, "#27272a");
    // shelf of figures and the coin in neon
    wallShelf(room, 8, 40, 40, "trophies");
    tokenArt(room, 22, 50, 12, "neon");
    // beanbag and console on the left floor
    box(ctx, 8, BACK - 8, 22, 9, "#7c3aed");
    rect(ctx, 10, BACK - 9, 18, 2, "#8b5cf6");
    box(ctx, 34, BACK - 5, 12, 5, "#e4e4e7");
    rect(ctx, 36, BACK - 4, 2, 1, "#22d3ee");
    // energy drink pyramid and the stash on the right
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 3 - row; i++) box(ctx, 196 + i * 4 + row * 2, BACK - 6 - row * 6, 3, 6, r() < 0.5 ? "#22c55e" : "#0ea5e9");
    speaker(room, 214, 16);
    stash(room, 232);
    ticker(room, 196, 42, 52, null);
    if (tier >= 3) neonSign(room, "GG", 52, 4, "#22d3ee");
    ambient(room, "#7c3aed", 0.05);
    vignette(room);
  },
};

/** Apartment tier: a greenhouse flat, jungle of plants, grow lights and a chart pinned like a seed packet. */
const greenRoom: Theme = {
  id: "green-room",
  name: "Green Room",
  draw(room) {
    const { ctx, r, tier } = room;
    // glass greenhouse wall: panes over a night sky
    rect(ctx, 0, 0, ROOM_W, WALL, "#0d1f17");
    for (let i = 0; i < 60; i++) rect(ctx, Math.floor(r() * ROOM_W), Math.floor(r() * 40), 1, 1, r() < 0.3 ? "#f8fafc" : "#4b6b5c");
    for (let x = 0; x < ROOM_W; x += 32) {
      rect(ctx, x, 0, 2, WALL, "#d1d5db");
      rect(ctx, x + 2, 0, 1, WALL, "#6b7280");
    }
    for (const y of [0, 26, 52]) {
      rect(ctx, 0, y, ROOM_W, 2, "#d1d5db");
      rect(ctx, 0, y + 2, ROOM_W, 1, "#6b7280");
    }
    // condensation streaks
    for (let i = 0; i < 26; i++) {
      const sx = Math.floor(r() * ROOM_W);
      const sy = Math.floor(r() * 50);
      rect(ctx, sx, sy, 1, 3 + Math.floor(r() * 5), "rgba(200,230,215,0.12)");
    }
    room.windows.push({ x: 3, y: 3, w: 29, h: 23 }, { x: 99, y: 3, w: 29, h: 23 }, { x: 195, y: 3, w: 29, h: 23 });
    // brick planter wall at the bottom
    for (let y = 56; y < WALL; y += 5)
      for (let x = (y / 5) % 2 ? -5 : 0; x < ROOM_W; x += 10) {
        rect(ctx, x, y, 9, 4, shade("#7c3a2a", (r() - 0.5) * 0.15));
        rect(ctx, x, y, 9, 1, "#9a4d38");
      }
    rect(ctx, 0, 55, ROOM_W, 1, "#4a2016");
    floorTiles(room, "#3d4a3a", "#354134", 8);
    // hanging plants with sway
    for (const hx of [20, 76, 180, 236]) {
      rect(ctx, hx + 3, 0, 1, 10, "#a8a29e");
      box(ctx, hx, 10, 8, 5, "#c2410c");
      const vines: [number, number][] = [];
      for (let i = 0; i < 12; i++) vines.push([hx - 2 + Math.floor(r() * 12), 15 + Math.floor(r() * 14)]);
      room.fx.push((c, t) => {
        const s = Math.round(Math.sin(t / 1100 + hx) * 1);
        for (const [vx, vy] of vines) rect(c, vx + (vy > 22 ? s : 0), vy, 2, 2, vy % 3 ? "#22c55e" : "#15803d");
      });
    }
    // potting bench on the left with seedlings
    table(room, 6, 48, "#78350f", BACK, 14);
    for (let i = 0; i < 6; i++) {
      box(ctx, 9 + i * 7, BACK - 19, 5, 4, "#b45309");
      rect(ctx, 10 + i * 7, BACK - 22 - (i % 3), 1, 3 + (i % 3), "#4ade80");
      rect(ctx, 11 + i * 7, BACK - 22 - (i % 3), 1, 1, "#86efac");
    }
    // watering can
    box(ctx, 30, BACK - 5, 8, 5, "#64748b");
    rect(ctx, 38, BACK - 7, 4, 1, "#64748b");
    // big plants along the back wall
    plant(room, 56, "l");
    plant(room, 194, "l");
    plant(room, 210, "m");
    plant(room, 70, "m");
    // coin "seed packet" on a stake and the coin art on the brick
    tokenArt(room, 122, 60, 12, "wood");
    neonSign(room, `$${room.symbol} GROW`, 128, 34, GREEN_HI);
    // grow lights pulsing purple/pink
    for (const gx of [96, 160]) {
      rect(ctx, gx, 0, 1, 30, "#52525b");
      box(ctx, gx - 10, 30, 21, 3, "#27272a");
      room.fx.push((c, t) => {
        rect(c, gx - 9, 33, 19, 1, "#f0abfc");
        c.save();
        c.globalCompositeOperation = "lighter";
        const a = 0.07 + 0.02 * Math.sin(t / 600 + gx);
        const g = c.createLinearGradient(0, 34, 0, WALL);
        g.addColorStop(0, rgba("#d946ef", a * 2));
        g.addColorStop(1, rgba("#d946ef", 0));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(gx - 9, 34);
        c.lineTo(gx + 10, 34);
        c.lineTo(gx + 26, WALL);
        c.lineTo(gx - 25, WALL);
        c.fill();
        c.restore();
      });
    }
    // misting sprinkler drops
    room.fx.push((c, t) => {
      for (let i = 0; i < 8; i++) {
        const k = (t / 1600 + i / 8) % 1;
        rect(c, 30 + i * 28, 38 + k * 40, 1, 2, `rgba(186,230,253,${0.4 * (1 - k)})`);
      }
    });
    stash(room, 84);
    ticker(room, 196, 44, 52, null);
    if (tier >= 3) {
      // koi tub
      box(ctx, 234, BACK - 8, 18, 8, "#57534e");
      rect(ctx, 236, BACK - 7, 14, 3, "#0e7490");
      room.fx.push((c, t) => rect(c, 237 + Math.round(((Math.sin(t / 700) + 1) / 2) * 10), BACK - 6, 2, 1, "#f97316"));
    }
    vignette(room);
  },
};

/** Loft tier: a retro diner where the whole menu is a green candle. */
const greenCandle: Theme = {
  id: "green-candle",
  name: "Green Candle Diner",
  draw(room) {
    const { ctx, tier } = room;
    wallFlat(room, "#f1ede4", 0.04);
    // checker band and chrome rail
    for (let x = 0; x < ROOM_W; x += 4) {
      rect(ctx, x, 38, 4, 4, (x / 4) % 2 ? "#111827" : "#f8fafc");
      rect(ctx, x, 42, 4, 4, (x / 4) % 2 ? "#f8fafc" : "#111827");
    }
    rect(ctx, 0, 37, ROOM_W, 1, "#cbd5e1");
    rect(ctx, 0, 46, ROOM_W, 1, "#94a3b8");
    // lower wall in mint
    rect(ctx, 0, 47, ROOM_W, WALL - 47, "#7fd1b0");
    for (let x = 0; x < ROOM_W; x += 10) rect(ctx, x, 47, 1, WALL - 47, "#6bbd9c");
    crown(room, "#e2dccf");
    // the big green candle sign
    box(ctx, 96, 6, 64, 26, "#0f172a");
    outline(ctx, 97, 7, 62, 24, "#334155");
    room.fx.push((c, t) => {
      const on = Math.floor(t / 1200) % 7 !== 0;
      // candle body and wick
      rect(c, 104, 10, 1, 18, on ? GREEN : "#14532d");
      rect(c, 102, 14, 5, 10, on ? GREEN_HI : "#14532d");
      tiny(c, "GREEN", 112, 11, on ? "#fef9c3" : "#57534e");
      tiny(c, "CANDLE", 112, 18, on ? "#fef9c3" : "#57534e");
      tiny(c, "DINER", 116, 25 - 1, on ? room.accent : "#57534e");
      if (on) glow(c, 128, 19, 44, GREEN_HI, 0.1);
    });
    // window booths left and right
    cityWindow(room, 10, 10, 40, 24, "#cbd5e1");
    cityWindow(room, 206, 10, 40, 24, "#cbd5e1");
    // pie case and coffee machine along the counter wall
    floorTiles(room, "#111827", "#f8fafc", 8);
    // booth on the left
    box(ctx, 4, BACK - 22, 6, 22, "#b91c1c");
    rect(ctx, 5, BACK - 21, 4, 1, "#ef4444");
    table(room, 12, 26, "#e5e7eb", BACK, 12);
    box(ctx, 40, BACK - 22, 6, 22, "#b91c1c");
    rect(ctx, 41, BACK - 21, 4, 1, "#ef4444");
    box(ctx, 16, BACK - 15, 5, 3, "#f8fafc"); // plate
    rect(ctx, 17, BACK - 16, 3, 1, "#f59e0b"); // pancake stack
    rect(ctx, 28, BACK - 17, 3, 5, "#e5e7eb"); // milkshake
    rect(ctx, 28, BACK - 18, 3, 1, "#f9a8d4");
    rect(ctx, 30, BACK - 21, 1, 3, "#ef4444");
    // booth on the right
    box(ctx, 206, BACK - 22, 6, 22, "#b91c1c");
    rect(ctx, 207, BACK - 21, 4, 1, "#ef4444");
    table(room, 214, 26, "#e5e7eb", BACK, 12);
    box(ctx, 242, BACK - 22, 6, 22, "#b91c1c");
    rect(ctx, 243, BACK - 21, 4, 1, "#ef4444");
    // coffee cup steam on the right table
    rect(ctx, 222, BACK - 15, 4, 3, "#f8fafc");
    room.fx.push((c, t) => {
      const k = (t / 1300) % 1;
      c.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`;
      c.fillRect(223 + Math.round(Math.sin(t / 250)), BACK - 17 - k * 8, 1, 2);
    });
    // back counter: pie case, coffee machine, register
    box(ctx, 62, BACK - 14, 132, 14, "#e5e7eb");
    rect(ctx, 62, BACK - 14, 132, 2, "#94a3b8");
    rect(ctx, 62, BACK - 4, 132, 1, "#cbd5e1");
    box(ctx, 66, BACK - 26, 26, 12, "#cbd5e1");
    rect(ctx, 67, BACK - 25, 24, 10, "rgba(186,230,253,0.5)");
    for (let i = 0; i < 3; i++) {
      rect(ctx, 69 + i * 7, BACK - 19, 6, 3, "#d97706");
      rect(ctx, 69 + i * 7, BACK - 20, 6, 1, i === 1 ? room.accent : "#fde68a");
    }
    box(ctx, 98, BACK - 28, 14, 14, "#52525b");
    rect(ctx, 100, BACK - 26, 10, 4, "#18181b");
    rect(ctx, 103, BACK - 19, 4, 2, "#78350f");
    tiny(ctx, "$", 103, BACK - 26, GREEN);
    register(room, 176, BACK - 14);
    // menu chalkboard with today's price action
    box(ctx, 120, BACK - 34, 46, 18, "#1f2937");
    tiny(ctx, "TODAY", 123, BACK - 32, "#f8fafc");
    ticker(room, 123, BACK - 25, 40, null);
    // stools for the counter
    for (const sx of [72, 104, 136, 168]) stool(room, sx, BACK + 6, "#dc2626");
    tokenArt(room, 186, 14, 10, "black");
    stash(room, 52, BACK + 6);
    if (tier >= 4) {
      // jukebox glow on the far wall
      room.fx.push((c, t) => glow(c, 128, 70, 90, ["#f43f5e", "#facc15", "#22c55e", "#38bdf8"][Math.floor(t / 500) % 4], 0.04));
    }
    pendant(room, 30, "#fef3c7", 6, "#dc2626");
    pendant(room, 226, "#fef3c7", 6, "#dc2626");
    vignette(room);
  },
};

/** Loft tier: crates of vinyl, listening booth, a wall of sleeves in the coin's colours. */
const recordShop: Theme = {
  id: "record-shop",
  name: "Record Shop",
  draw(room) {
    const { ctx, r, tier } = room;
    wallBrick(room, "#4a2f2a", "#24160f");
    // wall of record sleeves
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 9; i++) {
        const sx = 72 + i * 13;
        const sy = 8 + row * 13;
        const c = [room.accent, "#ef4444", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#f97316", "#f8fafc"][Math.floor(r() * 8)];
        box(ctx, sx, sy, 11, 11, c);
        // simple sleeve art: a circle, a stripe or a dot
        const k = Math.floor(r() * 3);
        if (k === 0) {
          rect(ctx, sx + 3, sy + 3, 5, 5, "#0b0b0e");
          rect(ctx, sx + 5, sy + 5, 1, 1, c);
        } else if (k === 1) rect(ctx, sx + 1, sy + 4, 9, 3, shade(c, -0.4));
        else rect(ctx, sx + 4, sy + 2, 3, 7, shade(c, 0.4));
      }
    // the featured sleeve is the coin
    tokenArt(room, 124, 21, 11, "black");
    neonSign(room, "RECORDS", 36, 8, "#f43f5e");
    neonSign(room, `$${room.symbol} FM`, 222, 8, room.accent);
    baseboard(room, "#1c1410");
    floorPlanks(room, "#5b3a1e");
    rug(room, 70, 116, "#7f1d1d", "persian");
    // listening station on the left: turntables on a counter, headphones on a hook
    box(ctx, 6, BACK - 16, 52, 16, "#2a1a10");
    rect(ctx, 6, BACK - 16, 52, 2, "#5b3416");
    turntable(room, 8, BACK - 21);
    turntable(room, 33, BACK - 21);
    rect(ctx, 22, 30, 1, 6, "#a1a1aa");
    rect(ctx, 19, 36, 7, 1, "#18181b");
    rect(ctx, 18, 37, 2, 4, "#18181b");
    rect(ctx, 25, 37, 2, 4, "#18181b");
    speaker(room, 8, 14, BACK - 16 - 6);
    // poster for a show
    poster(room, 30, 26, 16, 20, "pump");
    // record crates along the back wall
    for (let i = 0; i < 4; i++) recordCrate(room, 72 + i * 30, BACK);
    // counter with register on the right
    counter(room, 196, 56, "#5b3416", "#2a1a10", BACK, 18);
    register(room, 202, BACK - 18);
    // a spinning record on display
    room.fx.push((c, t) => {
      const cx = 236;
      const cy = BACK - 25;
      rect(c, cx - 5, cy - 5, 11, 11, "#0b0b0e");
      rect(c, cx - 6, cy - 3, 13, 7, "#0b0b0e");
      rect(c, cx - 3, cy - 6, 7, 13, "#0b0b0e");
      rect(c, cx - 1, cy - 1, 3, 3, room.accent);
      const a = t / 200;
      rect(c, cx + Math.round(Math.cos(a) * 4), cy + Math.round(Math.sin(a) * 4), 1, 1, "#52525b");
    });
    // music notes floating up from the decks
    room.fx.push((c, t) => {
      for (let i = 0; i < 3; i++) {
        const k = (t / 2200 + i / 3) % 1;
        const nx = 20 + i * 12 + Math.round(Math.sin(t / 400 + i) * 2);
        const ny = BACK - 26 - k * 22;
        c.fillStyle = rgba(i === 1 ? room.accent : "#fef3c7", 0.8 * (1 - k));
        c.fillRect(nx, ny, 1, 4);
        c.fillRect(nx - 2, ny + 3, 2, 2);
        c.fillRect(nx, ny, 2, 1);
      }
    });
    stash(room, 216, BACK - 18);
    ticker(room, 196, 36, 56, null);
    if (tier >= 4) {
      plant(room, 182, "m");
      clock(room, 58, 20);
    }
    pendant(room, 100, "#fde68a", 6, "#18181b");
    pendant(room, 160, "#fde68a", 6, "#18181b");
    ambient(room, "#7c2d12", 0.05);
    vignette(room);
  },
};

export const THEMES_A: Theme[] = [noodleStall, laundromat, pastelLoft, gamerDen, greenRoom, greenCandle, recordShop];

