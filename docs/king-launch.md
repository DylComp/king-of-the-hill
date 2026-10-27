# KING launch checklist

## Launch settings

Launch one standard SOL-paired KING token on pump.fun. Do not enable cashback or Mayhem mode. Keep control of the creator wallet until creator-fee sharing is configured. A premint public address can be supplied early; no private mint key is needed by the monitor.

Use Pump creator-fee sharing with exactly one shareholder:

- Treasury: `kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C`
- Share: **100% (10000 basis points)**

The sharing configuration must be locked (admin revoked) and the curve creator must point to that configuration. A direct creator wallet receiving fees without a sharing configuration does not satisfy the current worker. Verify the destination before applying the irreversible final shares. Do not set static 40/40/20 recipients on Pump: the worker computes changing winners and holders.

## Activation

1. Supply the public KING mint, optionally before minting. Set `KING_MINT` in Vercel Production, leaving `KING_TOKEN_WORKER_ENABLED=false` until checks pass.
2. Verify the public mint exists, is the intended standard SOL-paired Pump token, and its locked sharing configuration directs 100% to the treasury above.
3. Verify environment-held signers match the treasury and collection gas wallet `KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7`. Check current gas balances. Treasury must cover the 0.05 SOL reserve, all outstanding allocations and transaction overhead.
4. Verify RPC, durable journal storage, cron authentication, alerts and simulation of collection/buy-and-burn for this mint. Keep legacy `KING_WORKER_ENABLED=false` and all squad launch routes disabled.
5. Set only `KING_TOKEN_WORKER_ENABLED=true` and redeploy. Confirm the one-minute token cron and five-minute tracker are advancing.
6. Verify the first collected fee receipt, eligible holder/squad payouts and actual KING burn against finalized chain receipts. Until then, live settlement is unproven.

The split applies to collected creator fees, not total trade volume. Per 1 SOL of collected fees: 0.4 SOL squad, 0.4 SOL eligible supporters and 0.2 SOL KING buy-and-burn. Network costs require operating funds outside these allocations.

Holders sign a backing choice and hold KING; squad members register their wallets. Switching has a one-hour cooldown. Selling or transferring KING out during the relevant hour removes supporter eligibility. Empty reward categories carry forward in their original buckets.
