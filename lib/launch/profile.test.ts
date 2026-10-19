import { test } from "node:test";
import assert from "node:assert/strict";
import { findProfile, searchProfiles } from "./profile.ts";

const W = "pTWrBR7VzpAzztwYaLnot5sxP4a9tBJjyi1CLF4Xz1Z";
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

test("a pump.fun rate limit is retried once instead of reaching the player", async () => {
  const replies = [new Response("", { status: 429 }), ok({ username: "towerguy", profile_image: null })];
  globalThis.fetch = (async () => replies.shift()!) as typeof fetch;
  const p = await findProfile(W);
  assert.equal(p?.username, "towerguy");
});

test("a wallet still resolves without a name when pump.fun is down", async () => {
  globalThis.fetch = (async () => new Response("", { status: 503 })) as typeof fetch;
  const p = await findProfile(W);
  assert.deepEqual(p, { wallet: W, username: null, image: null, x: null, followers: null });
});

test("a failed name search reports the error rather than an empty result", async () => {
  globalThis.fetch = (async () => new Response("", { status: 503 })) as typeof fetch;
  await assert.rejects(searchProfiles("tower"));
});
