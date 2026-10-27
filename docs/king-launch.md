# KOTH launch checklist

## Launch settings

Launch one standard SOL-paired KOTH token on pump.fun. Do not enable cashback or Mayhem mode. Keep control of the creator wallet until creator-fee sharing is configured. A premint public address can be supplied early; no private mint key is needed by the monitor.

Use Pump creator-fee sharing with exactly one shareholder:

- Treasury: `kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C`
- Share: **100% (10000 basis points)**

The sharing configuration must be locked (admin revoked) and the curve creator must point to that configuration. A direct creator wallet receiving fees without a sharing configuration does not satisfy the current worker. Verify the destination before applying the irreversible final shares. Do not set static 40/40/20 recipients on Pump: the worker computes changing winners and holders.

## Standings acceptance blocker

The current scanner ranks hourly wallet cash flow, not Pump official PnL or competition standings. Do not activate reward settlement until the standings source and winner-selection semantics have been reconciled with the intended official competition data. Historical tracker crowns are not official Pump results.

## Activation

1. Supply the public KOTH mint, optionally before minting. Set `KING_MINT` in Vercel Production, leaving `KING_TOKEN_WORKER_ENABLED=false` until checks pass.
2. Verify the public mint exists, is the intended standard SOL-paired Pump token, and its locked sharing configuration directs 100% to the treasury above.
3. Verify environment-held signers match the treasury and collection gas wallet `KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7`. Check current gas balances. Treasury must cover the 0.05 SOL reserve, all outstanding allocations and transaction overhead.
4. Verify RPC, durable journal storage, cron authentication, alerts and simulation of collection/buy-and-burn for this mint. Keep legacy `KING_WORKER_ENABLED=false` and all squad launch routes disabled.
5. Set only `KING_TOKEN_WORKER_ENABLED=true` and redeploy. Confirm the one-minute token cron and five-minute tracker are advancing.
6. Verify the first collected fee receipt, eligible holder/squad payouts and actual KOTH burn against finalized chain receipts. Until then, live settlement is unproven.

The split applies to collected creator fees, not total trade volume. Per 1 SOL of collected fees: 0.4 SOL squad, 0.4 SOL eligible supporters and 0.2 SOL KOTH buy-and-burn. Network costs require operating funds outside these allocations.

Holders sign a backing choice and hold KOTH; squad members register their wallets. Switching has a one-hour cooldown. Selling or transferring KOTH out during the relevant hour removes supporter eligibility. Empty reward categories carry forward in their original buckets.

## Official standings integration

Source: https://api.pump.fun/v1, documented at https://docs.pump.fun/.
Set server-only `PUMP_API_KEY` with `leaderboards.read` (plus `graph.read` and `profiles.read` for member expansion). No key in browser bundles or logs.

`/api/king/standings` proxies `/pnl-leaderboard/groups` with daily/weekly/monthly and combined/realized/unrealized filters; competition reads `/competitions/{id}`. Original ranks and numeric scores are preserved. Successful responses cache for 60 seconds; source failure explicitly labels prior data stale, and a missing key shows unavailable with no computed fallback.

The five-minute cron records official competition observations keyed by Pump build timestamp once access exists. These are evidence, not verified hourly winners. A rolling 24-hour PnL difference must not be treated as hourly profit. Boundary timestamps, membership/strike changes, refresh coverage and the hourly winner definition still require verification against actual source data.

`RANKINGS_VERIFIED=false` in worker configuration is an explicit code-level lock. An enable env flag cannot bypass it. Do not remove until source equality and hourly winner acceptance are complete. Current adapter tests use synthetic schema fixtures, not live Pump data; they do not establish source parity.

## No-key competition feed

When `PUMP_API_KEY` is absent, the competition view uses public JSON from `https://pfsc.fun/api/state` and `https://www.scsp.fun/api/state`. These are third-party mirrors, not official API access. We require the same cup ID and scoring start, exactly 100 ranked entries, unique identities, and exact agreement of every rank's total USD PnL and member count. Read/build timestamps must be under ten minutes old. PFSC provides names/IDs, rank and total USD PnL. SCS supplies the realized/unrealized breakdown only when the entire board agrees; those breakdowns are not independently corroborated. When snapshots differ or SCS is unavailable, display the valid fresh PFSC snapshot alone with corroborated=false and omit all SCS fields. A stale/invalid PFSC feed gives unavailable or explicitly stale last-good data, never cash-flow estimates.

This alternative only supplies competition standings, not daily/weekly/monthly boards. It does not establish direct Pump-page parity, identity parity across both mirrors, or verified hourly winners. Financial processing remains code-locked. Only source data is consumed: no third-party token mint, treasury, fee split or transaction settings are imported.
