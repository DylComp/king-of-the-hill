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

- `app/api/tower` reads the wallet's SPL and Token-2022 accounts, drops NFTs, dust under $0.50 and unlisted spam, prices them with DexScreener, and dates each floor by the oldest signature on its token account (when the wallet first picked the token up). Read only: nothing is ever signed.
- `lib/game.ts` holds all rules (tiers, rates, item catalog, buying). `lib/render.ts` and `lib/sprites.ts` draw the tower on a canvas; all art is original and procedural.
- Cash and items live in the browser (localStorage, per wallet) in v1. Offline earnings are capped at 24h.

## Known limits (v1)

- Hold time is "first acquired", so selling everything and rebuying on the same token account keeps the old date. Fixing this needs per-transaction balance parsing (Helius enhanced transactions).
- Cash is client-side and can be edited by a determined player. Move it server side before cash means anything.
