import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { base58Decode } from "./base58.ts";
import { residentOf, skylineRow, type Floor } from "./game.ts";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58(bytes: Uint8Array) {
  let n = BigInt("0x" + (Buffer.from(bytes).toString("hex") || "0"));
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

test("base58 round trips a solana address", () => {
  const addr = "AE3RYXQ1ACGvLj63mmwkCtGdPNhWR6XsmgFAZfZgpump";
  const bytes = base58Decode(addr);
  assert.equal(bytes.length, 32);
  assert.equal(b58(bytes), addr);
});

test("a phantom-style ed25519 signature verifies against the base58 wallet", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url");
  const wallet = b58(raw);
  const msg = Buffer.from("Pump Tower sign in\nNonce: abc");
  const sig = sign(null, msg, privateKey);
  const { createPublicKey, verify } = await import("node:crypto");
  const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(base58Decode(wallet)).toString("base64url") }, format: "jwk" });
  assert.equal(verify(null, msg, key, sig), true);
  assert.equal(verify(null, Buffer.from("tampered"), key, sig), false);
});

test("skyline rows rescore from hold times", () => {
  const now = Date.UTC(2026, 10, 30);
  const day = 86_400_000;
  const f = (mint: string, days: number, isHouse = false): Floor => ({ mint, symbol: mint, name: mint, image: null, amount: 1, usd: 1, heldSince: now - days * day, isHouse });
  const r = residentOf("W", [f("NEW", 0.5), f("HOUSE", 31, true)]);
  assert.equal(r.top, "HOUSE");
  const row = skylineRow(r, now);
  assert.equal(row.floors, 2);
  assert.equal(row.house, true);
  assert.equal(Math.floor(row.longest), 31);
  // penthouse house floor: 6 citizens * 2 * 6 * 3 = 216, bare: 1 * 2 * 1 = 2
  assert.equal(row.rate, 218);
  assert.equal(row.citizens, 7);
});
