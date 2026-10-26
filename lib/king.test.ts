import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_MEMBERS, MIN_PAYOUT_LAMPORTS, coinName, coinTicker, pickKing, potLamports, sameShares, snapshotMinute, splitPot, squadShares, type Member } from "./king/model.ts";

const T = "pTWrBR7VzpAzztwYaLnot5sxP4a9tBJjyi1CLF4Xz1Z";
const w = (i: number) => "Abc" + "1".repeat(38) + String.fromCharCode(65 + i);
const m = (i: number, role = "MEMBER"): Member => ({ wallet: w(i), username: `u${i}`, role, joinedAt: 1000 + i, inCompetition: true });

test("squad shares: treasury half, members equal, owner first, capped", () => {
  const s = squadShares([m(2), m(1), m(0, "OWNER")], T);
  assert.equal(s[0].address, T);
  assert.equal(s.reduce((n, x) => n + x.shareBps, 0), 10_000);
  assert.deepEqual(s.slice(1).map((x) => x.address), [w(0), w(1), w(2)]);
  assert.equal(s[1].shareBps, 1666);
  assert.equal(s[0].shareBps, 10_000 - 1666 * 3);
  const big = squadShares(Array.from({ length: 20 }, (_, i) => m(i)), T);
  assert.equal(big.length, MAX_MEMBERS + 1);
  assert.equal(big.reduce((n, x) => n + x.shareBps, 0), 10_000);
  assert.throws(() => squadShares([], T));
  // The treasury and duplicate wallets are never paid twice.
  assert.equal(squadShares([m(1), m(1), { ...m(3), wallet: T }], T).length, 2);
  assert.ok(sameShares(s, [...s].reverse()));
});

test("coin names and tickers fit pump's limits", () => {
  assert.equal(coinName("Underground"), "Underground squad");
  assert.ok(new TextEncoder().encode(coinName("a".repeat(40))).length <= 32);
  assert.equal(coinTicker("CATEVENGERS"), "CATEVENGER");
  assert.equal(coinTicker("rug_and-rape"), "RUGANDRAPE");
  assert.equal(coinTicker("__"), "SQUAD");
});

test("king is the biggest banked gain among squads with coins", () => {
  const board = { hour: 0, start: { a: 100, b: 0, c: 50, d: 0 }, end: { a: 90, b: 40, c: 100, d: 500, e: 900 } };
  assert.deepEqual(pickKing(board, new Set(["a", "b", "c"])), { groupId: "c", gainUsd: 50 });
  assert.deepEqual(pickKing(board, new Set(["a", "b", "c", "d"]), new Set(["d"])), { groupId: "c", gainUsd: 50 });
  assert.equal(pickKing(board, new Set(["a"])), null);
  // New squads (no start reading) can't win their first hour.
  assert.equal(pickKing(board, new Set(["e"])), null);
});

test("pot is the treasury half of fees earned in the hour", () => {
  assert.equal(potLamports({ x: "100", y: "0" }, { x: "300", y: "1000", z: "500" }), 600n);
  assert.equal(potLamports({ x: "300" }, { x: "300" }), 0n);
});

test("holders split pro rata, dust rolls over", () => {
  const pot = 1_000_000_000n;
  const { payouts, paid, rollover } = splitPot(pot, [
    { wallet: "a", amount: 6000n },
    { wallet: "b", amount: 3999n },
    { wallet: "c", amount: 1n },
    { wallet: "d", amount: 0n },
  ]);
  assert.deepEqual(payouts.map((p) => p.wallet), ["a", "b"]);
  assert.equal(payouts[0].lamports, "600000000");
  assert.ok(BigInt(payouts[1].lamports) >= MIN_PAYOUT_LAMPORTS);
  assert.equal(paid + rollover, pot);
  assert.equal(splitPot(pot, []).rollover, pot);
});

test("snapshot minute is fixed per hour and inside :05 to :55", async () => {
  const a = await snapshotMinute(3_600_000 * 5, "s");
  assert.equal(a, await snapshotMinute(3_600_000 * 5, "s"));
  for (let h = 0; h < 50; h++) {
    const x = await snapshotMinute(3_600_000 * h, "secret");
    assert.ok(x >= 5 && x <= 55);
  }
});
