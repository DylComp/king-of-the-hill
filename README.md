# pump tower

Your Solana bags become a pixel skyscraper. Every token a wallet holds is a floor, and the longer it has been held the fancier the floor gets: bare walls on day zero, studio at 1 day, apartment at 3, loft at 7, suite at 14, penthouse at 30. Citizens on each floor earn in-game cash that buys furniture, pets and outfits; the best items only unlock on long-held floors. The house coin (`AE3RYXQ1ACGvLj63mmwkCtGdPNhWR6XsmgFAZfZgpump`) floor earns triple.

## Run

```
npm install
npm run dev     # http://localhost:3000
npm test        # game rules
npm run build
```

## Deploy (Vercel)

Import `DylComp/pump-tower` into Vercel (framework Next.js, root directory left as is). Env vars:

| name | needed | what |
| --- | --- | --- |
| `HELIUS_API_KEY` | strongly recommended | Helius RPC for wallet reads. Without it the app uses PublicNode's free keyless RPC, which works but is slower. |
| `SOLANA_RPC_URL` | optional | any other RPC URL, used when no Helius key is set |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | for saves and the skyline | added automatically by the Upstash for Redis integration (Vercel Storage). `UPSTASH_REDIS_REST_URL`/`_TOKEN` also work. Without them the game falls back to per-browser saves. |

`GET /api/health` reports whether the database and Helius key are wired up.

## How it works

- `app/api/tower` reads the wallet's SPL and Token-2022 accounts, drops NFTs, dust under $0.50 and unlisted spam, and prices them with DexScreener. Each floor's clock is the latest transaction where its token account went from empty to holding, so selling everything restarts it. Read only: nothing is ever signed.
- Cash is derived, not stored: every floor pays rent for each hour since launch (2026-10-18) at the tier it was in that hour, minus what the wallet has bought. The database only holds purchases and placements.
- Sign in is a free `signMessage` (no transaction). `/api/auth/nonce` issues a one-time nonce, `/api/auth/verify` checks the ed25519 signature against the wallet and sets a 30 day HMAC session cookie (the HMAC key is generated once and kept in Redis).
- `/api/buy` and `/api/remove` are server authoritative: they reload the tower (5 minute Redis cache), recompute cash and tier locks, and write under a per-wallet lock so two tabs can't double spend. `/api/save?w=` lets anyone see how a tower is decorated; only its signed-in owner can change it.
- `/api/leaderboard` ranks every tower that has been loaded by rent per hour, re-scored at read time since tiers keep climbing.
- `lib/game.ts` holds all rules (tiers, rent, item catalog, buying). `lib/render.ts` and `lib/sprites.ts` draw the tower and item icons; all art is original and procedural.
- `?w=<address>` links straight to any tower; the page has share to X, copy link and save PNG.

## Known limits

- The skyline only knows towers someone has opened on the site, and a tower's entry refreshes when it is next loaded.
- Very busy token accounts (more than 30 recent transactions) fall back to their oldest visible signature, which can only make a hold look shorter.
