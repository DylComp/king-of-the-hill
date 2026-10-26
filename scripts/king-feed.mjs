#!/usr/bin/env node
// King of the Hill feed: pump.fun refuses requests from Vercel's servers, so this runs on a
// machine off Vercel. It asks the site which public pump.fun paths to read, reads them, and
// posts the answers back. No wallet, no keys: only KING_FEED_SECRET, the site's feed password.
//
//   KING_FEED_SECRET=... node scripts/king-feed.mjs            # board only (run every 5 min)
//   KING_FEED_SECRET=... node scripts/king-feed.mjs --members  # board + member lists (hourly)
//
// SITE defaults to https://pumptowers.fun.
const SITE = (process.env.SITE || "https://pumptowers.fun").replace(/\/$/, "");
const SECRET = process.env.KING_FEED_SECRET;
if (!SECRET) {
  console.error("set KING_FEED_SECRET");
  process.exit(1);
}
const auth = { authorization: `Bearer ${SECRET}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await fetch(`${SITE}/api/king/feed`, { headers: auth });
if (!list.ok) {
  console.error(`feed list: HTTP ${list.status}`);
  process.exit(1);
}
const { api, board, members } = await list.json();
const paths = process.argv.includes("--members") ? [...board, ...members] : board;

const feed = {};
for (const path of paths) {
  const res = await fetch(api + path, { headers: { accept: "application/json" } }).catch(() => null);
  if (res?.ok) feed[path] = await res.json();
  else console.error(`${path.split("?")[0]}: ${res?.status ?? "unreachable"}`);
  if (paths.length > 1) await sleep(400); // gentle on pump.fun
}

// The site takes up to 2 MB per post; send member lists in chunks.
const keys = Object.keys(feed);
for (let i = 0; i < keys.length; i += 40) {
  const chunk = Object.fromEntries(keys.slice(i, i + 40).map((k) => [k, feed[k]]));
  const res = await fetch(`${SITE}/api/king/feed`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ feed: chunk }) });
  console.log(new Date().toISOString(), `posted ${Object.keys(chunk).length}:`, res.status, await res.text());
}
