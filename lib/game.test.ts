import test from "node:test";
import assert from "node:assert/strict";
import { BASE_RATE, ITEMS, tierFor, msToNextTier, buyAndPlace, emptySave, floorEarned, cashOf, itemById, floorRate, MAX_FURNITURE, type Floor } from "./game.ts";

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 18);

test("tiers follow hold time", () => {
  assert.equal(tierFor(null, now), 0);
  assert.equal(tierFor(now - 2 * 3_600_000, now), 0);
  assert.equal(tierFor(now - 1 * DAY, now), 1);
  assert.equal(tierFor(now - 6.9 * DAY, now), 2);
  assert.equal(tierFor(now - 7 * DAY, now), 3);
  assert.equal(tierFor(now - 29 * DAY, now), 4);
  assert.equal(tierFor(now - 30 * DAY, now), 5);
  assert.equal(tierFor(now - 400 * DAY, now), 5);
});

test("next tier countdown", () => {
  assert.equal(msToNextTier(now - 2 * DAY, now), 1 * DAY);
  assert.equal(msToNextTier(now - 31 * DAY, now), null);
});

test("house coin floor earns triple", () => {
  assert.equal(floorRate(5, true), floorRate(5, false) * 3);
  assert.ok(floorRate(5, false) > floorRate(0, false) * 10);
});

test("earnings are paid at the tier the floor was in each hour", () => {
  const epoch = now - 10 * DAY;
  // held 2 days: 1 day bare (1 citizen) + 1 day studio (2 citizens at 1.5x)
  assert.equal(floorEarned(now - 2 * DAY, false, now, epoch), 24 * BASE_RATE + 24 * BASE_RATE * 3);
  // nothing counts before launch
  assert.equal(floorEarned(now - 2 * DAY, false, now, now - 1 * DAY), 24 * BASE_RATE * 3);
  assert.equal(floorEarned(null, false, now, epoch), 0);
  assert.equal(floorEarned(now - 1 * DAY, true, now, epoch), 24 * BASE_RATE * 3);
});

test("cash is earnings minus purchases and never negative", () => {
  const floors: Floor[] = [{ mint: "a", symbol: "A", name: "A", image: null, amount: 1, usd: 1, heldSince: now - DAY, isHouse: false }];
  const epoch = now - 10 * DAY;
  assert.equal(cashOf(floors, [], 0, now, epoch), 24 * BASE_RATE);
  assert.equal(cashOf(floors, ["crate"], 0, now, epoch), 24 * BASE_RATE - 20);
  assert.equal(cashOf(floors, ["throne"], 0, now, epoch), 0);
});

test("long-hold items stay locked on young floors", () => {
  const save = emptySave();
  const r = buyAndPlace(save, itemById("throne")!, "mintA", 4, 1e9);
  assert.equal(r.ok, false);
  const ok = buyAndPlace(save, itemById("throne")!, "mintA", 5, 1e9);
  assert.ok(ok.ok);
});

test("buying needs cash once, re-placing owned items is free", () => {
  const r1 = buyAndPlace(emptySave(), itemById("crate")!, "a", 0, 20);
  assert.ok(r1.ok);
  assert.deepEqual(r1.save.owned, ["crate"]);
  const r2 = buyAndPlace(r1.save, itemById("crate")!, "b", 0, 0);
  assert.ok(r2.ok);
  assert.equal(buyAndPlace(emptySave(), itemById("cat")!, "a", 1, 10).ok, false);
});

test("floors hold a limited amount of furniture", () => {
  let save = emptySave();
  for (const id of ["crate", "lamp", "beanbag", "plant"]) {
    const r = buyAndPlace(save, itemById(id)!, "a", 5, 1e9);
    assert.ok(r.ok);
    save = r.save;
  }
  assert.equal(save.placed.a.furniture.length, MAX_FURNITURE);
  assert.equal(buyAndPlace(save, itemById("couch")!, "a", 5, 1e9).ok, false);
});

import { collect, emptyStreak, liveStreak, streakReward, seasonOf, seasonEnds, GAME_EPOCH, achievementsOf, lobbyFloor, tokenFloors } from "./game.ts";

test("daily streak grows, caps and resets after a missed day", () => {
  const D = 86_400_000;
  const t0 = Date.UTC(2026, 9, 20, 12);
  let s = emptyStreak();
  const a = collect(s, t0);
  assert.ok(a.ok);
  if (!a.ok) return;
  assert.equal(a.reward, 25);
  assert.equal(collect(a.streak, t0 + 3600_000).ok, false, "once per UTC day");
  s = a.streak;
  for (let d = 1; d < 9; d++) {
    const r = collect(s, t0 + d * D);
    assert.ok(r.ok);
    if (r.ok) s = r.streak;
  }
  assert.equal(s.n, 9);
  assert.equal(streakReward(9), 175);
  assert.equal(s.total, 25 + 50 + 75 + 100 + 125 + 150 + 175 * 3);
  const late = collect(s, t0 + 11 * D);
  assert.ok(late.ok && late.streak.n === 1 && late.streak.best === 9);
  assert.equal(liveStreak(s, t0 + 11 * D), 0);
});

test("seasons are weekly from launch", () => {
  assert.equal(seasonOf(GAME_EPOCH), 1);
  assert.equal(seasonOf(GAME_EPOCH + 6.9 * 86_400_000), 1);
  assert.equal(seasonOf(GAME_EPOCH + 7 * 86_400_000), 2);
  assert.equal(seasonEnds(1), GAME_EPOCH + 7 * 86_400_000);
});

test("resident floor counts for achievements but not as a bag", () => {
  const now = Date.UTC(2026, 10, 30);
  const floors = [lobbyFloor(now - 31 * 86_400_000)];
  assert.equal(tokenFloors(floors).length, 0);
  const got = achievementsOf(floors, emptySave(), emptyStreak(), true, now);
  assert.ok(got.has("resident") && got.has("penthouse") && !got.has("house"));
});

test("the catalog: unique ids, sane tiers and prices, cheapest unlocks first", () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const i of ITEMS) {
    assert.ok(i.price > 0 && Number.isInteger(i.price), i.id);
    assert.ok(i.minTier >= 0 && i.minTier <= 5, i.id);
    assert.ok(["furniture", "pet", "outfit"].includes(i.kind), i.id);
  }
  for (let k = 1; k < ITEMS.length; k++) assert.ok(ITEMS[k - 1].minTier <= ITEMS[k].minTier, `${ITEMS[k].id} out of tier order`);
  // every kind has something to buy on day zero and something for the penthouse
  for (const kind of ["furniture", "pet", "outfit"]) {
    const of = ITEMS.filter((i) => i.kind === kind);
    assert.ok(of.some((i) => i.minTier <= 1) && of.some((i) => i.minTier === 5), kind);
  }
});
