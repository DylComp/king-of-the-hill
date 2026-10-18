import test from "node:test";
import assert from "node:assert/strict";
import { tierFor, msToNextTier, buyAndPlace, emptySave, earned, itemById, floorRate, MAX_FURNITURE } from "./game.ts";

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

test("offline earnings are capped at 24h", () => {
  assert.equal(earned(100, 0, 3_600_000), 100);
  assert.equal(earned(100, 0, 100 * 3_600_000), 2400);
  assert.equal(earned(100, 10, 0), 0);
});

test("long-hold items stay locked on young floors", () => {
  const save = { ...emptySave(now), cash: 1e9 };
  const r = buyAndPlace(save, itemById("throne")!, "mintA", 4);
  assert.equal(r.ok, false);
  const ok = buyAndPlace(save, itemById("throne")!, "mintA", 5);
  assert.ok(ok.ok);
});

test("buying spends cash once, re-placing owned items is free", () => {
  let save = { ...emptySave(now), cash: 100 };
  const r1 = buyAndPlace(save, itemById("crate")!, "a", 0);
  assert.ok(r1.ok);
  save = r1.save;
  assert.equal(save.cash, 80);
  const r2 = buyAndPlace(save, itemById("crate")!, "b", 0);
  assert.ok(r2.ok);
  assert.equal(r2.save.cash, 80);
  assert.equal(buyAndPlace({ ...save, cash: 0 }, itemById("cat")!, "a", 1).ok, false);
});

test("floors hold a limited amount of furniture", () => {
  let save = { ...emptySave(now), cash: 1e9 };
  for (const id of ["crate", "lamp", "beanbag", "plant"]) {
    const r = buyAndPlace(save, itemById(id)!, "a", 5);
    assert.ok(r.ok);
    save = r.save;
  }
  assert.equal(save.placed.a.furniture.length, MAX_FURNITURE);
  assert.equal(buyAndPlace(save, itemById("couch")!, "a", 5).ok, false);
});
