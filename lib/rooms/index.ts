// Picks a room for each floor and caches its static background.
import { type Floor, LOBBY_MINT, type TierId } from "../game";
import { rng } from "../pixel";
import { type FX, type Mood, ROOM_H, ROOM_W, type Theme, type Win, makeRoom } from "./kit";
import { bare, cornerStore, pumpHQ, resident } from "./themes-core";
import { THEMES_A } from "./themes-a";
import { THEMES_B } from "./themes-b";
import { placeFurniture } from "../shop";

const ALL: Theme[] = [bare, cornerStore, pumpHQ, resident, ...THEMES_A, ...THEMES_B];
export const THEMES = new Map(ALL.map((t) => [t.id, t]));

/**
 * Room pools per hold tier. Longer holds unlock fancier rooms; within a tier the
 * coin's mint picks one so the same bag always gets the same room. Big bags get
 * the flashiest room of their tier.
 */
export const POOLS: Record<TierId, string[]> = {
  0: ["bare"],
  1: ["corner-store", "noodle-stall", "laundromat"],
  2: ["pastel-loft", "gamer-den", "green-room"],
  3: ["green-candle", "record-shop", "trading-desk"],
  4: ["pump-club", "arcade-hall", "gilded-suite"],
  5: ["penthouse", "sky-garden", "whale-lounge"],
};

const WHALE_USD = 10_000;

export function themeFor(f: Floor, tier: TierId): Theme {
  if (f.isHouse) return pumpHQ;
  if (f.mint === LOBBY_MINT && tier === 0) return resident;
  const pool = POOLS[tier].filter((id) => THEMES.has(id));
  if (!pool.length) return tier === 0 ? bare : cornerStore;
  if ((f.usd ?? 0) >= WHALE_USD && tier >= 4) return THEMES.get(pool[pool.length - 1])!;
  const r = rng(f.mint);
  return THEMES.get(pool[Math.floor(r() * pool.length)])!;
}

export type Built = { canvas: HTMLCanvasElement; fx: FX[]; front: FX[]; windows: Win[]; theme: Theme };

const built = new Map<string, Built>();

export type RoomInput = {
  theme: Theme;
  seed: string;
  tier: TierId;
  accent: string;
  mood: Mood;
  symbol: string;
  logo: CanvasImageSource | null;
  usd: number | null;
  isHouse: boolean;
  change24?: number | null;
  /** Shop furniture bought for this floor, baked into the background. */
  furniture?: string[];
};

/** Static background plus its effects, rebuilt only when something visible changes. */
export function buildRoom(o: RoomInput): Built {
  const usdBand = o.usd == null ? 0 : o.usd < 100 ? 1 : o.usd < 1000 ? 2 : o.usd < WHALE_USD ? 3 : 4;
  const key = [o.theme.id, o.seed, o.tier, o.accent, o.mood, o.symbol, o.logo ? 1 : 0, usdBand, o.isHouse, o.change24?.toFixed(1), o.furniture?.join(",")].join("|");
  const hit = built.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = ROOM_W;
  canvas.height = ROOM_H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const room = makeRoom(ctx, { tier: o.tier, accent: o.accent, mood: o.mood, symbol: o.symbol, logo: o.logo, usd: o.usd, isHouse: o.isHouse, change24: o.change24, seed: o.seed });
  o.theme.draw(room);
  if (o.furniture?.length) placeFurniture(room, o.furniture);
  const b: Built = { canvas, fx: room.fx, front: room.front, windows: room.windows, theme: o.theme };
  built.set(key, b);
  if (built.size > 200) built.delete(built.keys().next().value!);
  return b;
}
