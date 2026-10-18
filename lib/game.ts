// Pure game rules: hold-time tiers, citizens, cash and the item catalog.
// Shared by the server route, the canvas renderer and the tests.

export const HOUSE_MINT = "AE3RYXQ1ACGvLj63mmwkCtGdPNhWR6XsmgFAZfZgpump";

const DAY = 86_400_000;

export type TierId = 0 | 1 | 2 | 3 | 4 | 5;

export const TIERS: { id: TierId; key: string; name: string; minDays: number; blurb: string }[] = [
  { id: 0, key: "bare", name: "bare walls", minDays: 0, blurb: "concrete, one bulb, a mattress if you are lucky" },
  { id: 1, key: "studio", name: "studio", minDays: 1, blurb: "paint on the walls and a window that opens" },
  { id: 2, key: "apartment", name: "apartment", minDays: 3, blurb: "wallpaper, a rug, a view of the street" },
  { id: 3, key: "loft", name: "loft", minDays: 7, blurb: "brick, tall glass, plants that survive" },
  { id: 4, key: "suite", name: "suite", minDays: 14, blurb: "dark wood, green neon, carpet you sink into" },
  { id: 5, key: "penthouse", name: "penthouse", minDays: 30, blurb: "glass all round, gold trim, the whole city below" },
];

export function tierFor(heldSince: number | null, now = Date.now()): TierId {
  if (heldSince == null) return 0;
  const days = (now - heldSince) / DAY;
  let t: TierId = 0;
  for (const tier of TIERS) if (days >= tier.minDays) t = tier.id;
  return t;
}

export function daysHeld(heldSince: number | null, now = Date.now()): number {
  return heldSince == null ? 0 : Math.max(0, (now - heldSince) / DAY);
}

/** Milliseconds until the next tier, or null at the penthouse. */
export function msToNextTier(heldSince: number | null, now = Date.now()): number | null {
  const t = tierFor(heldSince, now);
  if (t === 5) return null;
  const start = heldSince ?? now;
  return start + TIERS[t + 1].minDays * DAY - now;
}

export const citizensFor = (tier: TierId) => tier + 1;

const TIER_RATE = [1, 1.5, 2, 3, 4, 6];
export const BASE_RATE = 2; // cash per citizen per hour on bare walls; a penthouse throne takes days, not minutes
export const HOUSE_BOOST = 3; // the house coin floor earns triple
/** Rent starts on launch day; holds older than this earn from here. */
export const GAME_EPOCH = Date.UTC(2026, 9, 18);

export function floorRate(tier: TierId, isHouse: boolean): number {
  return citizensFor(tier) * BASE_RATE * TIER_RATE[tier] * (isHouse ? HOUSE_BOOST : 1);
}

/**
 * Cash a floor has earned, worked out purely from its hold time: each hour is
 * paid at the rate of the tier the floor was in at that hour. Nothing to store,
 * nothing to fake.
 */
export function floorEarned(heldSince: number | null, isHouse: boolean, now = Date.now(), epoch = GAME_EPOCH): number {
  if (heldSince == null) return 0;
  let total = 0;
  for (const t of TIERS) {
    const segStart = Math.max(heldSince + t.minDays * DAY, epoch);
    const next = TIERS[t.id + 1];
    const segEnd = Math.min(next ? heldSince + next.minDays * DAY : Infinity, now);
    if (segEnd > segStart) total += (floorRate(t.id, isHouse) * (segEnd - segStart)) / 3_600_000;
  }
  return total;
}

export type Floor = {
  mint: string;
  symbol: string;
  name: string;
  image: string | null;
  amount: number;
  usd: number | null;
  heldSince: number | null;
  isHouse: boolean;
};

export function towerRate(floors: Floor[], now = Date.now()): number {
  return floors.reduce((sum, f) => sum + floorRate(tierFor(f.heldSince, now), f.isHouse), 0);
}

export function towerEarned(floors: Floor[], now = Date.now(), epoch = GAME_EPOCH): number {
  return floors.reduce((sum, f) => sum + floorEarned(f.heldSince, f.isHouse, now, epoch), 0);
}

/** Wallet cash: everything the tower has earned, minus everything bought. */
export function cashOf(floors: Floor[], owned: string[], bonus = 0, now = Date.now(), epoch = GAME_EPOCH): number {
  const spent = owned.reduce((n, id) => n + (itemById(id)?.price ?? 0), 0);
  return Math.max(0, towerEarned(floors, now, epoch) + bonus - spent);
}

export type ItemKind = "furniture" | "pet" | "outfit";
export type Item = { id: string; kind: ItemKind; name: string; price: number; minTier: TierId };

export const ITEMS: Item[] = [
  { id: "crate", kind: "furniture", name: "milk crate", price: 20, minTier: 0 },
  { id: "lamp", kind: "furniture", name: "lava lamp", price: 70, minTier: 1 },
  { id: "beanbag", kind: "furniture", name: "beanbag", price: 120, minTier: 1 },
  { id: "plant", kind: "furniture", name: "monstera", price: 180, minTier: 2 },
  { id: "couch", kind: "furniture", name: "green couch", price: 260, minTier: 2 },
  { id: "arcade", kind: "furniture", name: "arcade cabinet", price: 700, minTier: 3 },
  { id: "tank", kind: "furniture", name: "fish tank", price: 900, minTier: 3 },
  { id: "chart", kind: "furniture", name: "candle chart tv", price: 1800, minTier: 4 },
  { id: "piano", kind: "furniture", name: "grand piano", price: 2600, minTier: 4 },
  { id: "throne", kind: "furniture", name: "gold throne", price: 7500, minTier: 5 },
  { id: "chandelier", kind: "furniture", name: "chandelier", price: 12000, minTier: 5 },

  { id: "rat", kind: "pet", name: "sewer rat", price: 40, minTier: 0 },
  { id: "cat", kind: "pet", name: "alley cat", price: 160, minTier: 1 },
  { id: "dog", kind: "pet", name: "shiba", price: 450, minTier: 2 },
  { id: "frog", kind: "pet", name: "swamp frog", price: 1100, minTier: 3 },
  { id: "ape", kind: "pet", name: "bored ape", price: 3000, minTier: 4 },
  { id: "bull", kind: "pet", name: "golden bull", price: 10000, minTier: 5 },

  { id: "hoodie", kind: "outfit", name: "grey hoodie", price: 30, minTier: 0 },
  { id: "pumptee", kind: "outfit", name: "pump green tee", price: 110, minTier: 1 },
  { id: "cap", kind: "outfit", name: "degen cap", price: 300, minTier: 2 },
  { id: "suit", kind: "outfit", name: "black suit", price: 900, minTier: 3 },
  { id: "chain", kind: "outfit", name: "gold chain", price: 2400, minTier: 4 },
  { id: "crown", kind: "outfit", name: "crown", price: 9000, minTier: 5 },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
export const MAX_FURNITURE = 4;

export type Placement = { furniture: string[]; pet: string | null; outfit: string | null };
/** What the browser keeps: only what was bought and where it went. Cash is always derived. */
export type Save = {
  owned: string[];
  placed: Record<string, Placement>;
};

export const emptySave = (): Save => ({ owned: [], placed: {} });
export const emptyPlacement = (): Placement => ({ furniture: [], pet: null, outfit: null });

export type BuyResult = { ok: true; save: Save } | { ok: false; reason: string };

/** Buy an item and place it on a floor. Items unlock per floor by that floor's tier. */
export function buyAndPlace(save: Save, item: Item, mint: string, floorTier: TierId, cash: number): BuyResult {
  if (floorTier < item.minTier) return { ok: false, reason: `needs ${TIERS[item.minTier].name} (${TIERS[item.minTier].minDays}d hold)` };
  const p = { ...(save.placed[mint] ?? emptyPlacement()) };
  const owned = save.owned.includes(item.id);
  if (item.kind === "furniture") {
    if (p.furniture.includes(item.id)) return { ok: false, reason: "already on this floor" };
    if (p.furniture.length >= MAX_FURNITURE) return { ok: false, reason: "floor is full" };
  }
  if (!owned && cash < item.price) return { ok: false, reason: "not enough cash" };
  if (item.kind === "furniture") p.furniture = [...p.furniture, item.id];
  if (item.kind === "pet") p.pet = item.id;
  if (item.kind === "outfit") p.outfit = item.id;
  return {
    ok: true,
    save: {
      ...save,
      owned: owned ? save.owned : [...save.owned, item.id],
      placed: { ...save.placed, [mint]: p },
    },
  };
}

export function removeFurniture(save: Save, mint: string, id: string): Save {
  const p = save.placed[mint];
  if (!p) return save;
  return { ...save, placed: { ...save.placed, [mint]: { ...p, furniture: p.furniture.filter((f) => f !== id) } } };
}

export const fmtCash = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}m` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : Math.floor(n).toLocaleString("en-US");

export const shortAddr = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Every real tower starts with enough for a crate and a rat; the demo gets more to play with. */
export const WALLET_BONUS = 100;
export const DEMO_BONUS = 1500;

/** Compact tower summary kept for the skyline leaderboard; rent is recomputed at read time. */
export type Resident = { w: string; top: string; f: [number | null, 0 | 1][] };

export function residentOf(owner: string, floors: Floor[]): Resident {
  const byAge = [...floors].sort((a, b) => (a.heldSince ?? Infinity) - (b.heldSince ?? Infinity));
  return { w: owner, top: byAge[0]?.symbol ?? "", f: byAge.map((f) => [f.heldSince, f.isHouse ? 1 : 0]) };
}

export type SkylineRow = { wallet: string; top: string; floors: number; citizens: number; rate: number; longest: number; house: boolean };

export function skylineRow(r: Resident, now = Date.now()): SkylineRow {
  let rate = 0;
  let citizens = 0;
  for (const [since, house] of r.f) {
    const t = tierFor(since, now);
    rate += floorRate(t, house === 1);
    citizens += citizensFor(t);
  }
  return {
    wallet: r.w,
    top: r.top,
    floors: r.f.length,
    citizens,
    rate,
    longest: r.f.length ? daysHeld(r.f[0][0], now) : 0,
    house: r.f.some(([, h]) => h === 1),
  };
}
