# KOTH launch checklist

## Launch settings

Launch one standard SOL-paired KOTH token on pump.fun. Do not enable cashback or Mayhem mode. Keep control of the creator wallet until creator-fee sharing is configured. A premint public address can be supplied early; no private mint key is needed by the monitor.

Use Pump creator-fee sharing with exactly one shareholder:

- Treasury: `kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C`
- Share: **100% (10000 basis points)**

The sharing configuration must be locked (admin revoked) and the curve creator must point to that configuration. A direct creator wallet receiving fees without a sharing configuration does not satisfy the current worker. Verify the destination before applying the irreversible final shares. Do not set static 40/40/20 recipients on Pump: the worker computes changing winners and holders.

## Live readiness audit — 2026-10-27 03:47 UTC

**Not ready for financial activation.** Mint configuration alone must not enable settlement.

- Production serves 100 public-mirror standings rows, but reports rankingsVerified=false and hourlyWinnersVerified=false.
- Direct Pump leaderboard access returned HTTP 403 during this audit. Public mirror agreement is not proof of direct Pump parity.
- At the sampled refresh, 64 of 100 rank/score/member-count combinations agreed between PFSC and SCS. Refresh skew is expected; never combine mismatched snapshots for payment.
- Only 51 current source participant IDs matched the historical worker roster; only 48 also matched member count. Resolve participant-to-group identities and obtain verified owner/member wallets before allocating squad rewards. Never match payout recipients by display name alone.
- The former prepareRound cash-flow fallback has been removed. Settlement now requires a verified direct-source hourly record; the production producer of that evidence remains unimplemented.
- User confirmed the original rule: largest PnL gain during that specific hour, not highest cumulative competition rank. Source timestamps, complete boundary observations, ties, disqualifications and missing data need acceptance checks.
- Keep RANKINGS_VERIFIED=false and the token worker disabled. Verify a complete shadow round, including correct recipient identities, before activation. Financial receipt verification still requires the actual mint after launch.

These are timestamped observations, not permanent source counts. The local detailed comparison is saved in output/koth-readiness-audit.json (not committed).

## Standings acceptance blocker

The current scanner ranks hourly wallet cash flow, not Pump official PnL or competition standings. Do not activate reward settlement until the standings source and winner-selection semantics have been reconciled with the intended official competition data. Historical tracker crowns are not official Pump results.

## Activation

1. Supply the public KOTH mint, optionally before minting. Set `KING_MINT` in Vercel Production, leaving `KING_TOKEN_WORKER_ENABLED=false` until checks pass.
2. Verify the public mint exists, is the intended standard SOL-paired Pump token, and its locked sharing configuration directs 100% to the treasury above.
3. Verify environment-held signers match the treasury and collection gas wallet `KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7`. Check current gas balances. Treasury must cover the 0.05 SOL reserve, all outstanding allocations and transaction overhead.
4. Verify RPC, durable journal storage, cron authentication, alerts and simulation of collection and all three SOL payout categories for this mint. Keep legacy `KING_WORKER_ENABLED=false` and all squad launch routes disabled.
5. Set only `KING_TOKEN_WORKER_ENABLED=true` and redeploy. Confirm the one-minute token cron and five-minute tracker are advancing.
6. Verify the first collected fee receipt, eligible squad, supporter and all-holder SOL payouts against finalized chain receipts. Until then, live settlement is unproven.

The split applies to collected creator fees, not total trade volume. Per 1 SOL of collected fees: 0.4 SOL squad, 0.4 SOL eligible supporters and 0.2 SOL proportional all-holder airdrops. Network costs require operating funds outside these allocations.

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

## Confirmed hourly rule

The winner is the squad with the largest positive PnL gain over the hour. The shadow evaluator in lib/pump-data/hourly.ts compares two complete cumulative competition boards at exact source-built hour boundaries. It rejects changed coverage/member counts and never treats fetch time as source time. Ties stay unresolved; no positive gain produces no candidate. Every result remains verified=false. Source authenticity, member identity (not merely count), disqualifications and recipient mapping still require separate verification. This evaluator is now required by the financially locked winner adapter, and current public mirrors do not guarantee exact boundary snapshots.

## All-holder 20% allocation

The former burn allocation is replaced by SOL rewards to every eligible wallet holding strictly more than $1 of official KOTH at the hourly snapshot, proportional to holdings. Overlap with the other 80% is permitted. Read [worker details](king-worker.md) for exclusions, complete-account reconciliation, pricing and throughput limits. The mint-specific scan, price and transfer simulations must pass before activation. No buy or burn is performed.

## Live acceptance check — October 27, 2026, 17:33 UTC

The user's existing Chrome displayed the Pump Squads competition board successfully. Comparing 100 visible rows to the current site feed yielded 73 matching rank/member-count pairs and 70 matching displayed PnL amounts. The top-five names and ranks agreed, but several scores differed. These observations were taken across refresh cycles, not one atomic source snapshot; they demonstrate partial agreement only. They do not verify exact parity, historical hour boundaries or winners.

The 20% SOL holder allocation is deployed and covered by allocation/threshold/completeness tests. Typecheck and 96 tests pass. No token mint is configured, no fees were collected and no SOL was sent. Production payouts remain disabled.

Open blockers before financial activation:
1. A reliable direct Pump data capture with source timestamps, full coverage and verified squad-to-owner/member identities.
2. An audited complete hourly boundary pair and winner proof for largest positive hourly PnL gain. The evidence-record writer is not implemented; the consumer fails closed.
3. Working fresh SOL/USD pricing: live requests to the configured Pyth Hermes endpoint returned HTTP 401 from the development host. Production oracle connectivity is not proven. Resolve authenticated/provider access or validate a replacement before snapshots can qualify wallets.
4. With the actual mint: locked treasury fee-route verification, full-supply holder scan, canonical SOL-pair valuation, unsigned collection/transfer simulations and capacity checks for the expected holder/supporter count.
5. After controlled activation: finalized collection and all three reward-category receipts. Automated batching exists, but live throughput and settlement are unproven.

A mint address may be supplied before these are resolved; supplying it is not permission to bypass these checks or evidence of launch readiness.

## Current change: 30-minute rounds

The owner selected every ranked squad for winner comparison, including squads outside the displayed top 100. Rounds now span :00–:30 and :30–:00 UTC. One-hour backing-switch cooldown remains unchanged. Historical hourly audit observations above are retained as history. Coinbase SOL/USD, cross-checked against Kraken with 60-second freshness and 1% maximum divergence, replaces the inaccessible Pyth endpoint. `/api/king/readiness` checks production pricing and direct-source connectivity without spending or changing state. A direct Pump browser response reports 954 ranked squads but returns 100 rows; requesting limit=1000 still returned 100. Full coverage and complete source-time boundary evidence remain required.

### First-party contract finding

Inspection through the owner’s existing Chrome of Pump’s shipped competition route definition confirms `limit` defaults to and is capped at 100. It defines no offset, page or historical-time query. Testing offset=100 and page=2 both returned ranks 1–100; limit=1000 also returned 100. The full board reported 954 ranked squads at this observation. This proves the public route cannot by itself support the requested all-ranked-squads settlement. An authorized full-board source plus stored boundary observations and verified roster identities is required; neither top-100 snapshots nor moderator-only endpoints are substitutes. The financial gate remains false.
