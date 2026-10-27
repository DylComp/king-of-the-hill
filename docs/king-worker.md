# Single KOTH: original 40/40/20 competition

Production: https://www.kingofthehills.fun. Vercel project: pump-tower.

The only project token is KOTH. All 100 squads are tracked without issuing tokens. The nine retired squad coins, their immutable metadata and their historical financial journals are never sources of revenue or payout eligibility for this system. Every squad-token launch path and the old signer remain disabled.

## Original allocations

For each collected KOTH fee pot: 40% winning squad; 40% eligible KOTH holders backing that squad; 20% buy and burn the official KOTH mint. Winning means the largest positive hourly banked trading result among eligible squads. The squad creator receives its allocation unless squad members register their wallets, in which case registered members share it equally. Supporters share by their snapshot KOTH balance. Registration and backing require a nonce-bound, domain-bound signed message from the authenticated wallet.

A switch has a one-hour eligibility cooldown. A randomized snapshot is captured in a finalized chain context during each complete active hour. Before payment, the worker audits finalized transaction history over that whole hour for each potential supporter. Any outgoing KOTH balance reduction (sale or transfer) removes eligibility; missing history blocks payment. No historical balances are fabricated when a snapshot was missed. First partial-hour receipts carry into the first full round. Unallocated rewards and rounding remain reserved in their original categories. Sub-0.001 SOL burn dust accumulates in the burn category. The display reports actual collection-hour fee receipts rather than claiming precise trade-time accrual.

## Workers and custody

- `/api/cron/king`: authenticated five-minute read-only squad scanner. Finalized receipts, no cursor advancement for missing receipts, no overlapping invocations.
- `/api/cron/king-token`: authenticated one-minute single-KOTH worker. Missing `KING_MINT` returns `awaiting_mint` before loading keys or opening a financial ledger. `KING_TOKEN_WORKER_ENABLED` must also equal `true` before any financial processing.
- Secrets remain environment-only. `KING_LAUNCHER_SECRET_KEY` belongs to KiNgDiSzoX9Z69LoRZh73QkBhJNLqxDbJKgQ2bHmon7 (fee-collection gas only). `KING_TREASURY_SECRET_KEY` belongs to kiNGXkmkJSMPQoFEdUZs68nANK16C1AjyQD2jVPY46C (payouts and KOTH burn). Never print keys, RPC credentials or signed transaction bytes.
- Dedicated namespace `king:single:v1`; no reuse of legacy allocations. A mint change after starting a ledger is rejected.
- The on-chain creator-fee receiver must be the official KOTH mint's locked sharing configuration with 100% to the treasury. The worker verifies this before spending. Dynamic 40/40/20 recipients are computed off chain; do not hard-code hourly winners into the on-chain fee split.
- SDK-built collection transactions only. Revenue is credited from the exact finalized receipt's treasury balance delta, once. Deposits/old treasury funds do not become fee revenue.
- Payments and atomic KOTH buy-and-burn attempts are persisted before broadcast, protected by a lease and compare-and-swap journal. Retries rebroadcast identical bytes. Expired unresolved or failed attempts stop for audit, never create replacement payments blindly.
- Reserve: 0.05 SOL plus every outstanding allocation and bounded fees. Burn routes support Pump curve and PumpSwap AMM, with 1% slippage and at most 10 SOL input per atomic transaction. These are execution bounds, not an extra fee allocation. Burn receipts verify exact transaction, mint, amount and unchanged pre-existing KOTH holdings.
- Collection ends after the cup's one-hour catch-up. The final round waits until then; settlement continues until all due attempts are finalized. Remaining dust stays in its original category. Public status reports stopped only when complete.

## Prelaunch and acceptance

The user confirmed KOTH has not launched. Deploy with `KING_TOKEN_WORKER_ENABLED=false`; keep the old `KING_WORKER_ENABLED=false`. The site must explicitly say prelaunch and must never display estimated rewards as paid.

To activate when the user supplies the public mint: verify the mint on chain, verify or configure its treasury-only fee route, check signer wallets and balances, inspect ownership/permissions and both pool routes supported by the buy-and-burn code, configure `KING_MINT`, then enable only the new worker. Verify one fee receipt, one qualified payout and an atomic KOTH burn on finalized receipts before declaring live settlement proven. Never enable squad launches.

## Validation

Run `npm run typecheck`, `npm test`, and production build. Test allocation conservation, switch cooldown, replay/signature binding, immutable journals and receipt reconciliation. Production smoke checks must verify prelaunch no-spend response, API splits, empty squad launch queue, retired submission routes, all squads, page copy and mobile layout. Live financial acceptance requires the unlaunched mint and cannot be claimed complete now.
