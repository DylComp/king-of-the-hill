import test from "node:test";
import assert from "node:assert/strict";
import { BASE_RATE, tierFor, msToNextTier, buyAndPlace, emptySave, floorEarned, cashOf, itemById, floorRate, MAX_FURNITURE, type Floor } from "./game.ts";

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
