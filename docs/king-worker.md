# Single KOTH: 40/40/20 SOL rewards

Production: https://www.kothcoins.fun. Vercel project: pump-tower.

One official KOTH mint; separate squad coins and all their launch paths remain retired. Only collected creator fees from the configured official mint fund rewards.

## 30-minute allocations

- 40% to the winning squad: largest positive Pump PnL gain during the specific 30-minute round. Registered verified members share equally; otherwise its verified creator receives the allocation.
- 40% to eligible KOTH supporters backing that squad, proportional to snapshotted holdings. Switching has a one-hour cooldown. Outgoing KOTH during the round disqualifies this supporter allocation; incomplete transaction history blocks settlement.
- 20% in SOL to all eligible KOTH holders with strictly more than $1 at the randomized finalized 30-minute snapshot, proportional to token holdings. No backing, registration or claim is required. Overlapping squad/supporter/holder rewards are allowed. The supporter holding-through-the-round restriction does not apply to this category.

Multiple token accounts are aggregated by owner. Treasury, operating gas wallet, system address and off-curve program vaults are excluded. A complete mint-filtered getProgramAccounts scan must reconcile to mint supply; supply must remain unchanged around the scan. Incomplete RPC responses fail closed. The threshold uses the finalized SOL-paired Pump curve or canonical PumpSwap reserve price and a fresh Coinbase SOL/USD price corroborated by Kraken (both under 60 seconds old and agreeing within 1%). This is a spot valuation, not a guarantee of sale proceeds. Exactly $1 is excluded. No fixed top-holder list is used.

Rounding dust and categories without recipients carry in their original buckets. Missing snapshots are not fabricated. First partial-round fees carry forward. Fee receipts are assigned to finalized collection round, with final catch-up assigned to the last round.

## Execution and custody

The authenticated one-minute `/api/cron/king-token` worker captures snapshots, collects fees and resumes journaled payouts. Transactions batch up to eight transfers; large rounds settle across multiple invocations, not necessarily instantly at hour close. Supporter history audits currently process one wallet per invocation. Load testing is required before activation to establish supported holder counts and backlog behavior.

`KING_MINT`, `KING_TOKEN_WORKER_ENABLED=true` and the code acceptance gate `RANKINGS_VERIFIED` are required. Missing mint returns awaiting_mint before loading signers. The acceptance gate remains false. Historical cash-flow crowns cannot authorize payouts. `verifiedRoundWinner` requires a complete direct-source boundary and verified roster record; no production verifier currently writes these records. This is an explicit remaining activation blocker.

Creator-fee sharing must be locked with 100% to `kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C`. Dynamic recipients are computed by the worker, not configured as fixed on-chain shareholders. Fee-collection gas wallet: `KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7`. Keys remain environment-only in KING_TREASURY_SECRET_KEY and KING_LAUNCHER_SECRET_KEY.

Exact finalized collection receipts credit revenue once. Deposits and legacy funds do not count. Signed attempts are persisted before broadcast under a lease and compare-and-swap journal; retries reuse identical bytes. Each payout is keyed by round, reward category and wallet, allowing intentional overlap without duplicate category payments. Failed or expired unresolved transactions stop for audit. Treasury retains a 0.05 SOL reserve plus all outstanding allocations and bounded network overhead. Existing burn ledgers are rejected for audit, never silently converted or reset. There is no KOTH buy or burn execution.

## Verification before activation

Verify direct Pump standings, exact 30-minute boundary scores, roster identity and winner selection; public-mirror agreement does not establish these. Verify the real mint, locked fee route, complete holder snapshot and pricing, transfer simulation, scheduler, durable storage and alerts. After explicit activation, verify finalized fee and transfer receipts before claiming live settlement works. Never restart squad launches.

Competition ends November 9, 2026 at 14:00 UTC; final fee catch-up ends 15:00 UTC. Settlement may finish later. Remind the owner to disable workers and unused paid resources only after settlement, preserving journals.

Rounds start at :00 and :30 UTC and last 30 minutes. The squad-switch cooldown remains one hour. Final catch-up still ends at 15:00 UTC. Existing journals with a different or unspecified duration require audit; they are not silently reinterpreted.
