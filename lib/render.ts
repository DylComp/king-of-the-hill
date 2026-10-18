// Canvas renderer for the tower. Everything is drawn at logical pixel size
// and scaled up by CSS with image-rendering: pixelated.
import { type Floor, type Placement, type TierId, tierFor, citizensFor, floorRate } from "./game";
import { ACCESSORY, CITIZEN, FURNITURE, HAIRS, OUTFIT_BODY, PETS, SKINS, baked } from "./sprites";

export const W = 240;
export const FLOOR_H = 56;
export const ROOF_H = 64;
export const LOBBY_H = 64;
const BX = 20; // building left edge
const BW = 200; // building width
const IX = BX + 12; // interior left
const IW = BW - 24; // interior width
const WALL_H = 44; // wall height inside a floor

export const GREEN = "#86efac";
export const GREEN_HI = "#4ade80";
const PIXEL_FONT = "'Press Start 2P', monospace";

export const towerHeight = (n: number) => ROOF_H + Math.max(n, 1) * FLOOR_H + LOBBY_H;
export const floorTop = (i: number) => ROOF_H + i * FLOOR_H;

function rng(seed: string) {
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

type Walker = { x: number; dir: number; pause: number; skin: string; hair: string; step: number };
type Pop = { x: number; y: number; t: number; text: string };

export type Scene = {
  walkers: Map<string, Walker[]>;
  pets: Map<string, Walker>;
  pops: Pop[];
  nextPop: Map<string, number>;
  images: Map<string, HTMLImageElement | "loading" | "failed">;
};

export const newScene = (): Scene => ({ walkers: new Map(), pets: new Map(), pops: [], nextPop: new Map(), images: new Map() });

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function skyline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string, t: number) {
  const r = rng(seed);
  // night sky
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#05060a");
  g.addColorStop(1, "#0d1a14");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < w / 6; i++) {
    const sx = x + Math.floor(r() * w);
    const sy = y + Math.floor(r() * h * 0.5);
    const tw = Math.sin(t / 700 + i) > 0.6;
    rect(ctx, sx, sy, 1, 1, tw ? "#ffffff" : "#6b7280");
  }
  let bx = x;
  while (bx < x + w) {
    const bw = 4 + Math.floor(r() * 9);
    const bh = Math.floor(h * (0.25 + r() * 0.5));
    rect(ctx, bx, y + h - bh, bw, bh, "#0b1410");
    for (let wy = y + h - bh + 2; wy < y + h - 1; wy += 3)
      for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) if (r() < 0.3) rect(ctx, wx, wy, 1, 1, r() < 0.2 ? GREEN : "#e5c76b");
    bx += bw + 1;
  }
}

function windowFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string, t: number, frame: string) {
  skyline(ctx, x, y, w, h, seed, t);
  ctx.strokeStyle = frame;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function paintRoom(ctx: CanvasRenderingContext2D, tier: TierId, y: number, seed: string, t: number) {
  const r = rng(seed + tier);
  const floorY = y + WALL_H;
  switch (tier) {
    case 0: {
      rect(ctx, IX, y, IW, WALL_H, "#3d3f46");
      for (let i = 0; i < 90; i++) rect(ctx, IX + Math.floor(r() * IW), y + Math.floor(r() * WALL_H), 1, 1, r() < 0.5 ? "#34363c" : "#474950");
      // crack
      let cx = IX + 40 + Math.floor(r() * 80);
      for (let cy = y + 4; cy < y + 22; cy++) {
        rect(ctx, cx, cy, 1, 1, "#26272c");
        cx += r() < 0.5 ? -1 : 1;
      }
      rect(ctx, IX, y + 2, IW, 2, "#55575e"); // pipe
      // boarded window
      rect(ctx, IX + 120, y + 10, 22, 16, "#1a1b1f");
      rect(ctx, IX + 118, y + 14, 26, 3, "#7c5a3a");
      rect(ctx, IX + 118, y + 20, 26, 3, "#6b4c30");
      // bulb
      rect(ctx, IX + 88, y + 4, 1, 10, "#1f2023");
      const on = Math.sin(t / 90 + r() * 9) > -0.95;
      rect(ctx, IX + 87, y + 14, 3, 3, on ? "#fef3c7" : "#57534e");
      if (on) {
        ctx.fillStyle = "rgba(254,243,199,0.06)";
        ctx.beginPath();
        ctx.arc(IX + 88, y + 16, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      rect(ctx, IX, floorY, IW, 8, "#2c2d32");
      for (let i = 0; i < 30; i++) rect(ctx, IX + Math.floor(r() * IW), floorY + Math.floor(r() * 8), 1, 1, "#24252a");
      break;
    }
    case 1: {
      rect(ctx, IX, y, IW, WALL_H, "#334155");
      rect(ctx, IX, y + WALL_H - 3, IW, 3, "#1e293b");
      windowFrame(ctx, IX + 110, y + 8, 30, 20, seed, t, "#94a3b8");
      rect(ctx, IX + 124, y + 8, 1, 20, "#94a3b8");
      // mattress
      rect(ctx, IX + 8, floorY - 4, 30, 4, "#e2e8f0");
      rect(ctx, IX + 8, floorY - 5, 8, 2, "#f8fafc");
      rect(ctx, IX, floorY, IW, 8, "#5b3a22");
      for (let px = IX; px < IX + IW; px += 12) rect(ctx, px, floorY, 1, 8, "#4a2e1a");
      break;
    }
    case 2: {
      for (let px = IX; px < IX + IW; px += 6) {
        rect(ctx, px, y, 3, WALL_H, "#24453a");
        rect(ctx, px + 3, y, 3, WALL_H, "#1d3a30");
      }
      rect(ctx, IX, y + WALL_H - 3, IW, 3, "#e5e7eb");
      for (const wx of [IX + 30, IX + 112]) {
        windowFrame(ctx, wx, y + 7, 28, 22, seed + wx, t, "#e5e7eb");
        rect(ctx, wx - 3, y + 5, 6, 26, "#7f1d1d");
        rect(ctx, wx + 25, y + 5, 6, 26, "#7f1d1d");
        rect(ctx, wx - 4, y + 4, 36, 2, "#d6d3d1");
      }
      rect(ctx, IX, floorY, IW, 8, "#6b4423");
      rect(ctx, IX + 50, floorY + 2, 70, 5, "#9f1239");
      rect(ctx, IX + 52, floorY + 3, 66, 3, "#be123c");
      break;
    }
    case 3: {
      rect(ctx, IX, y, IW, WALL_H, "#5a2e24");
      for (let row = 0; row < WALL_H / 4; row++) {
        const off = row % 2 ? 4 : 0;
        rect(ctx, IX, y + row * 4 + 3, IW, 1, "#3d1f18");
        for (let px = IX + off; px < IX + IW; px += 8) rect(ctx, px, y + row * 4, 1, 3, "#3d1f18");
      }
      for (const wx of [IX + 22, IX + 66, IX + 110]) {
        windowFrame(ctx, wx, y + 3, 30, 36, seed + wx, t, "#111827");
        rect(ctx, wx + 15, y + 3, 1, 36, "#111827");
        rect(ctx, wx, y + 20, 30, 1, "#111827");
      }
      for (const lx of [IX + 50, IX + 98]) {
        rect(ctx, lx, y, 1, 6, "#111");
        rect(ctx, lx - 2, y + 6, 5, 2, "#111");
        rect(ctx, lx - 1, y + 8, 3, 1, "#fde68a");
      }
      rect(ctx, IX, floorY, IW, 8, "#52525b");
      rect(ctx, IX, floorY, IW, 1, "#71717a");
      break;
    }
    case 4: {
      for (let px = IX; px < IX + IW; px += 8) {
        rect(ctx, px, y, 7, WALL_H, "#2e1d12");
        rect(ctx, px + 7, y, 1, WALL_H, "#1e130b");
      }
      const glow = 0.55 + 0.25 * Math.sin(t / 500);
      ctx.fillStyle = `rgba(134,239,172,${glow * 0.18})`;
      ctx.fillRect(IX, y, IW, 7);
      rect(ctx, IX, y + 2, IW, 1, GREEN);
      windowFrame(ctx, IX + 70, y + 9, 40, 24, seed, t, "#a16207");
      for (const sx of [IX + 30, IX + 140]) {
        rect(ctx, sx, y + 16, 3, 4, "#a16207");
        ctx.fillStyle = "rgba(253,230,138,0.12)";
        ctx.fillRect(sx - 4, y + 12, 11, 12);
      }
      rect(ctx, IX, floorY, IW, 8, "#14532d");
      for (let i = 0; i < 40; i++) rect(ctx, IX + Math.floor(r() * IW), floorY + Math.floor(r() * 8), 1, 1, "#166534");
      break;
    }
    case 5: {
      skyline(ctx, IX, y, IW, WALL_H, seed + "pent", t);
      // moon
      rect(ctx, IX + 20, y + 6, 5, 5, "#fef9c3");
      rect(ctx, IX + 22, y + 6, 3, 3, "#05060a");
      for (let px = IX; px <= IX + IW; px += 44) rect(ctx, Math.min(px, IX + IW - 2), y, 2, WALL_H, "#d4a62a");
      rect(ctx, IX, y, IW, 2, "#d4a62a");
      rect(ctx, IX, y + WALL_H - 2, IW, 2, "#d4a62a");
      for (let px = IX; px < IX + IW; px += 8) {
        const a = (px - IX) / 8;
        rect(ctx, px, floorY, 8, 4, a % 2 ? "#e5e5ea" : "#b8b8c2");
        rect(ctx, px, floorY + 4, 8, 4, a % 2 ? "#b8b8c2" : "#e5e5ea");
      }
      break;
    }
  }
}

function painting(ctx: CanvasRenderingContext2D, scene: Scene, f: Floor, tier: TierId, y: number) {
  const px = IX + IW - 24;
  const py = y + 10;
  const frame = tier >= 5 ? "#d4a62a" : tier >= 3 ? "#111827" : tier >= 1 ? "#78716c" : "#d6d3d1";
  rect(ctx, px - 1, py - 1, 16, 16, frame);
  rect(ctx, px, py, 14, 14, "#0b0b0e");
  const img = f.image ? scene.images.get(f.image) : undefined;
  if (f.image && !img) {
    scene.images.set(f.image, "loading");
    const el = new Image();
    // CORS-clean images keep the canvas exportable for "save png".
    el.crossOrigin = "anonymous";
    el.referrerPolicy = "no-referrer";
    el.onload = () => scene.images.set(f.image!, el);
    el.onerror = () => scene.images.set(f.image!, "failed");
    el.src = f.image;
  }
  if (img instanceof HTMLImageElement) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, px, py, 14, 14);
  } else {
    ctx.fillStyle = GREEN;
    ctx.font = `8px ${PIXEL_FONT}`;
    ctx.fillText(f.symbol.slice(0, 1).toUpperCase(), px + 3, py + 11);
  }
  if (tier === 0) {
    rect(ctx, px + 5, py - 2, 4, 2, "#e7e5e4"); // taped up
  }
}

const SLOTS = [8, 46, 78, 112];

function furniture(ctx: CanvasRenderingContext2D, p: Placement | undefined, y: number) {
  if (!p) return;
  p.furniture.forEach((id, i) => {
    const f = FURNITURE[id];
    if (!f) return;
    const img = baked(`f:${id}`, f.sp, f.pal);
    const fx = IX + SLOTS[i % SLOTS.length];
    if (f.hang) ctx.drawImage(img, IX + 74, y);
    else ctx.drawImage(img, fx, y + WALL_H + 2 - f.sp.h);
  });
}

function citizen(ctx: CanvasRenderingContext2D, w: Walker, outfit: string | null, x: number, y: number, frame: number) {
  const body = OUTFIT_BODY[outfit ?? "none"] ?? OUTFIT_BODY.none;
  const key = `c:${w.skin}:${w.hair}:${outfit}:${frame}`;
  const pal = { h: w.hair, s: w.skin, e: "#111111", b: body.b, l: body.l, k: "#0b0b0e" };
  const base = baked(key, CITIZEN[frame], pal);
  ctx.save();
  if (w.dir < 0) {
    ctx.translate(x + 7, y);
    ctx.scale(-1, 1);
    ctx.drawImage(base, 0, 0);
  } else ctx.drawImage(base, x, y);
  const acc = outfit && ACCESSORY[outfit];
  if (acc) {
    const accPal = { g: "#6b7079", c: "#22c55e", w: "#f8fafc", t: GREEN_HI, y: "#facc15" };
    const a = baked(`a:${outfit}`, acc, accPal);
    if (w.dir < 0) ctx.drawImage(a, 0, 0);
    else ctx.drawImage(a, x, y);
  }
  ctx.restore();
}

function stepWalker(w: Walker, dt: number, r: () => number, speed: number) {
  if (w.pause > 0) {
    w.pause -= dt;
    return;
  }
  w.x += w.dir * speed * dt;
  w.step += dt;
  if (w.x < 4 || w.x > IW - 34) {
    w.dir *= -1;
    w.x = Math.min(Math.max(w.x, 4), IW - 34);
  }
  if (r() < dt * 0.3) w.pause = 0.6 + r() * 2.2;
  if (r() < dt * 0.12) w.dir *= -1;
}

export type DrawOpts = {
  floors: Floor[];
  placed: Record<string, Placement>;
  selected: string | null;
  now: number;
  t: number;
  dt: number;
  scene: Scene;
};

export function drawTower(ctx: CanvasRenderingContext2D, o: DrawOpts) {
  const { floors, scene, t } = o;
  const H = towerHeight(floors.length);
  ctx.imageSmoothingEnabled = false;
  skyline(ctx, 0, 0, W, H, "city", t);
  // far background towers either side
  const far = rng("far");
  for (let x = 0; x < W; x += 6) {
    if (x > BX - 4 && x < BX + BW + 4) continue;
    const bh = 60 + Math.floor(far() * 200);
    rect(ctx, x, H - 16 - bh, 5, bh, "#080d0b");
  }

  // roof
  const roofY = ROOF_H - 14;
  rect(ctx, BX + 4, roofY, BW - 8, 14, "#16171c");
  rect(ctx, BX + 4, roofY, BW - 8, 1, "#2a2c33");
  // antenna
  rect(ctx, BX + 30, 10, 1, roofY - 10, "#4b5563");
  rect(ctx, BX + 29, 9, 3, 2, Math.floor(t / 600) % 2 ? "#ef4444" : "#450a0a");
  // water tower
  rect(ctx, BX + 168, roofY - 18, 18, 12, "#3f3f46");
  rect(ctx, BX + 166, roofY - 20, 22, 3, "#52525b");
  rect(ctx, BX + 170, roofY - 6, 1, 6, "#3f3f46");
  rect(ctx, BX + 183, roofY - 6, 1, 6, "#3f3f46");
  // neon sign, glitches now and then
  const glitch = Math.sin(t / 3100) > 0.985;
  ctx.font = `10px ${PIXEL_FONT}`;
  ctx.textAlign = "center";
  ctx.shadowColor = GREEN_HI;
  ctx.shadowBlur = 6;
  ctx.fillStyle = glitch ? "#14532d" : GREEN;
  ctx.fillText("PUMP TOWER", W / 2 + (glitch ? 1 : 0), roofY - 4);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // facade pillars
  const bodyTop = ROOF_H;
  const bodyH = Math.max(floors.length, 1) * FLOOR_H;
  rect(ctx, BX, bodyTop, BW, bodyH + LOBBY_H - 16, "#1b1c22");

  if (!floors.length) {
    const y = floorTop(0);
    rect(ctx, IX, y, IW, FLOOR_H - 4, "#0e0f13");
    ctx.font = `8px ${PIXEL_FONT}`;
    ctx.fillStyle = "#6b7280";
    ctx.fillText("FOR LEASE", IX + 52, y + 26);
    ctx.fillText("no bags no floors", IX + 20, y + 40);
  }

  floors.forEach((f, i) => {
    const y = floorTop(i);
    const tier = tierFor(f.heldSince, o.now);
    const p = o.placed[f.mint];
    paintRoom(ctx, tier, y, f.mint, t);
    painting(ctx, scene, f, tier, y);
    furniture(ctx, p, y);

    // citizens
    const n = citizensFor(tier);
    let ws = scene.walkers.get(f.mint);
    const r = rng(f.mint + t);
    if (!ws || ws.length !== n) {
      const sr = rng(f.mint);
      ws = Array.from({ length: n }, (_, k) => ({
        x: 10 + sr() * (IW - 50),
        dir: sr() < 0.5 ? -1 : 1,
        pause: sr() * 2,
        skin: SKINS[Math.floor(sr() * SKINS.length)],
        hair: HAIRS[(Math.floor(sr() * HAIRS.length) + k) % HAIRS.length],
        step: sr(),
      }));
      scene.walkers.set(f.mint, ws);
    }
    for (const w of ws) {
      stepWalker(w, o.dt, r, 9);
      const frame = w.pause > 0 ? 0 : Math.floor(w.step * 6) % 2;
      citizen(ctx, w, p?.outfit ?? null, IX + Math.round(w.x), y + WALL_H - 10, frame);
    }

    // pet
    if (p?.pet && PETS[p.pet]) {
      let pw = scene.pets.get(f.mint);
      if (!pw) {
        pw = { x: 60, dir: 1, pause: 0, skin: "", hair: "", step: 0 };
        scene.pets.set(f.mint, pw);
      }
      stepWalker(pw, o.dt, r, 14);
      const pet = PETS[p.pet];
      const frame = pw.pause > 0 ? 0 : Math.floor(pw.step * 8) % 2;
      const img = baked(`p:${p.pet}:${frame}`, pet.sp[frame], pet.pal);
      const px = IX + Math.round(pw.x);
      const py = y + WALL_H + 2 - pet.sp[frame].h;
      ctx.save();
      if (pw.dir < 0) {
        ctx.translate(px + img.width, py);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
      } else ctx.drawImage(img, px, py);
      ctx.restore();
    }

    // cash pops: one every few seconds per floor, faster on fancier floors
    const rate = floorRate(tier, f.isHouse);
    const due = scene.nextPop.get(f.mint) ?? t + Math.random() * 4000;
    if (t >= due) {
      const w = ws[Math.floor(Math.random() * ws.length)];
      scene.pops.push({ x: IX + w.x, y: y + WALL_H - 14, t, text: `+$${Math.max(1, Math.round(rate / 60))}` });
      scene.nextPop.set(f.mint, t + 2500 + Math.random() * 5000);
    } else scene.nextPop.set(f.mint, due);

    // floor slab + label
    rect(ctx, BX, y + FLOOR_H - 4, BW, 4, "#2a2c33");
    rect(ctx, BX, y + FLOOR_H - 4, BW, 1, "#3a3d46");
    ctx.font = `8px ${PIXEL_FONT}`;
    const label = `${String(floors.length - i).padStart(2, "0")} $${f.symbol.toUpperCase().slice(0, 9)}`;
    const lw = ctx.measureText(label).width;
    rect(ctx, IX + 1, y + 1, lw + 4, 10, "rgba(5,6,8,0.75)");
    ctx.fillStyle = f.isHouse ? GREEN : "#e5e7eb";
    ctx.fillText(label, IX + 3, y + 10);

    // house coin floor gets a neon frame
    if (f.isHouse) {
      const a = 0.6 + 0.4 * Math.sin(t / 300);
      ctx.strokeStyle = `rgba(74,222,128,${a})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(IX + 0.5, y + 0.5, IW - 1, FLOOR_H - 5);
    }
    if (o.selected === f.mint) {
      ctx.strokeStyle = Math.floor(t / 400) % 2 ? "#ffffff" : GREEN;
      ctx.lineWidth = 2;
      ctx.strokeRect(BX + 1, y, BW - 2, FLOOR_H - 3);
    }
  });

  // pillars drawn over interiors
  rect(ctx, BX, bodyTop, 12, bodyH, "#23252c");
  rect(ctx, BX + BW - 12, bodyTop, 12, bodyH, "#23252c");
  rect(ctx, BX + 11, bodyTop, 1, bodyH, "#121318");
  rect(ctx, BX + BW - 12, bodyTop, 1, bodyH, "#121318");
  for (let yy = bodyTop + 6; yy < bodyTop + bodyH; yy += 12) {
    rect(ctx, BX + 4, yy, 4, 1, "#2f323a");
    rect(ctx, BX + BW - 8, yy, 4, 1, "#2f323a");
  }

  // lobby
  const ly = ROOF_H + bodyH;
  rect(ctx, BX, ly, BW, LOBBY_H - 16, "#14151a");
  rect(ctx, BX, ly, BW, 3, "#2a2c33");
  rect(ctx, W / 2 - 22, ly + 14, 44, 34, "#0b1f15");
  rect(ctx, W / 2 - 22, ly + 14, 44, 1, GREEN);
  rect(ctx, W / 2, ly + 14, 1, 34, "#14532d");
  ctx.fillStyle = "rgba(134,239,172,0.10)";
  ctx.fillRect(W / 2 - 30, ly + 8, 60, 40);
  ctx.font = `8px ${PIXEL_FONT}`;
  ctx.fillStyle = GREEN;
  ctx.textAlign = "center";
  ctx.fillText("LOBBY", W / 2, ly + 11);
  ctx.textAlign = "left";
  for (const lx of [BX + 20, BX + BW - 44]) {
    windowFrame(ctx, lx, ly + 16, 24, 20, "lobby" + lx, t, "#2f323a");
  }
  // street
  rect(ctx, 0, H - 16, W, 16, "#0a0a0c");
  rect(ctx, 0, H - 16, W, 1, "#26272c");
  for (let x = 4; x < W; x += 16) rect(ctx, x, H - 8, 8, 1, "#3f3f46");
  for (const lx of [8, W - 10]) {
    rect(ctx, lx, H - 40, 1, 24, "#3f3f46");
    rect(ctx, lx - 1, H - 42, 3, 2, "#fde68a");
    ctx.fillStyle = "rgba(253,230,138,0.08)";
    ctx.fillRect(lx - 6, H - 40, 13, 24);
  }

  // cash pops
  ctx.font = `8px ${PIXEL_FONT}`;
  scene.pops = scene.pops.filter((p) => t - p.t < 1400);
  for (const p of scene.pops) {
    const k = (t - p.t) / 1400;
    ctx.fillStyle = `rgba(134,239,172,${1 - k})`;
    ctx.fillText(p.text, p.x, p.y - k * 12);
  }
}

/** Which floor a logical y lands on, or null. */
export function floorAt(y: number, n: number): number | null {
  const i = Math.floor((y - ROOF_H) / FLOOR_H);
  return i >= 0 && i < n ? i : null;
}

/** Small preview of one tier, used in the how-it-works ladder. */
export function drawTierPreview(ctx: CanvasRenderingContext2D, tier: TierId, t: number) {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(-IX, 0);
  paintRoom(ctx, tier, 0, "preview" + tier, t);
  ctx.restore();
}
export const PREVIEW_W = IW;
export const PREVIEW_H = WALL_H + 8;
