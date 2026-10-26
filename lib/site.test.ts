import test from "node:test";
import assert from "node:assert/strict";
import { SITE_URL, canonicalSiteUrl } from "./site.ts";
test("public links follow King domain while preserving paths and external hosts", () => {
 assert.equal(SITE_URL,"https://www.kingofthehills.fun");
 assert.equal(canonicalSiteUrl("https://pumptowers.fun/m/mint?x=1"),SITE_URL+"/m/mint?x=1");
 assert.equal(canonicalSiteUrl("https://pump-tower.vercel.app/king/underground"),SITE_URL+"/king/underground");
 assert.equal(canonicalSiteUrl("https://images.example.com/a.png"),"https://images.example.com/a.png");
 assert.equal(canonicalSiteUrl("https://pumptowers.fun.evil.example/m/mint"),"https://pumptowers.fun.evil.example/m/mint");
});
