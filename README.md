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

## How it works

- `app/api/tower` reads the wallet's SPL and Token-2022 accounts, drops NFTs, dust under $0.50 and unlisted spam, and prices them with DexScreener. Each floor's clock is the latest transaction where its token account went from empty to holding, so selling everything restarts it. Read only: nothing is ever signed.
- Cash is derived, not stored: every floor pays rent for each hour since launch (2026-10-18) at the tier it was in that hour, minus what the wallet has bought. Only purchases and placements live in the browser, so editing storage cannot mint cash.
- `lib/game.ts` holds all rules (tiers, rent, item catalog, buying). `lib/render.ts` and `lib/sprites.ts` draw the tower and item icons; all art is original and procedural.
- `?w=<address>` links straight to any tower; the page has share to X, copy link and save PNG.

## Known limits

- Purchases are per browser. Syncing them across devices needs a small database (for example Vercel KV), which also unlocks a leaderboard.
- Very busy token accounts (more than 30 recent transactions) fall back to their oldest visible signature, which can only make a hold look shorter.
