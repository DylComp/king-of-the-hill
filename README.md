# pump tower

Your Solana bags become a pixel skyscraper. Every token a wallet holds is a floor, and the longer it has been held the fancier the floor gets: bare walls on day zero, studio at 1 day, apartment at 3, loft at 7, suite at 14, penthouse at 30. Citizens on each floor earn in-game cash that buys furniture, pets and outfits; the best items only unlock on long-held floors. The house coin $PTWR (mint to be confirmed at launch) floor earns triple. Signed-in residents also get a free floor whose clock starts the day they move in, a daily check-in bonus (+$25 per streak day, capped at $175), weekly seasons ranked by checked-in rent, and achievements.

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

## Treasury and buybacks

Profile launches permanently split creator fees 80% to the selected pump profile and 20% to the treasury. The scheduled worker at `/api/cron/buybacks` uses only verified, finalized distribution receipts from registered profile launches. It excludes `PTWR_OFFICIAL_MINT`, other coins, deposits, and main-coin creator fees. The treasury share is already 20%; it is not reduced to 20% again. Network costs consume a small part of the buyback budget. Collection gas is paid by the treasury.

The official PTWR coin is planned with standard creator fees. Its own creator fees are never collected by this worker.

The worker runs every five minutes on Vercel, with an authenticated `CRON_SECRET`. It is deployed disabled, awaiting the official mint. It never guesses the mint from a ticker or metadata. Secrets are production-only sensitive environment variables; dev wallet keys are never uploaded.

| Variable | Value |
| --- | --- |
| `PTWR_OFFICIAL_MINT` | Exact official mint, unset before launch |
| `PTWR_BUYBACK_ENABLED` | `false` until activation checks pass |
| `PTWR_TREASURY_SECRET_KEY` | JSON Solana keypair array, sensitive, server-only |
| `CRON_SECRET` | Random bearer secret, sensitive |

Limits: 0.01 SOL per purchase, 1 SOL per UTC day (including buy transaction overhead), 1% slippage, 0.02 SOL retained for operations, and a maximum 0.009 SOL overhead reservation. Actual confirmed debits settle the ledger. Standard and Holder Rewards SOL Pump curves and canonical Pump AMM pools are supported; unsupported token extensions/modes halt execution. Holder Rewards creators must match the official per-mint rewards PDA. Cashback and mayhem target coins are rejected. Buy and burn are in one atomic transaction.

Before activation:

1. Confirm the official mint and its supported on-chain settings. Set `PTWR_OFFICIAL_MINT` in production and update `HOUSE_MINT` in `lib/game.ts` for the UI at launch. Do not change a mint once the ledger has pinned it.
2. Fund the treasury with operational SOL separately from fee revenue. Set `PTWR_TREASURY_ADDRESS` locally to its public address and `PTWR_TREASURY_KEY_FILE` to its private keypair file. With the production RPC and official mint configured, run `node scripts/provision-buyback.mjs` to simulate provisioning, then `node scripts/provision-buyback.mjs --execute` to create its token ATA and AMM volume account.
3. Fund/import the dev wallet, sign in on the site, and use the launchpad setup to create its address lookup table. Launching stays closed until this is confirmed on chain.
4. Enable `PTWR_BUYBACK_ENABLED=true` and redeploy only after provisioning and mint compatibility checks. Check a first small finalized buy/burn receipt.

Redis stores the fenced worker lease, pinned mint, receipt credits, confirmed debits, last buyback receipt and pending signed attempts under `pt:buyback:v1`. Signed attempts are persisted before submission; retries send identical bytes. An expired attempt with no finalized receipt stays unresolved and holds new execution. Investigate with an archival RPC; never delete the pending attempt or reset the ledger to retry blindly. A missing/pruned fee receipt holds the scan cursor. Receipt IDs and credits commit atomically. To pause, set `PTWR_BUYBACK_ENABLED=false` and redeploy; already broadcast transactions can still finalize.

Atomic curve/AMM plan construction and verification are adapted from the user's FUB project. New tests cover revenue exclusions, budget boundaries, and rejection of altered buy/burn transactions. No real purchase can be tested before the official mint exists.
