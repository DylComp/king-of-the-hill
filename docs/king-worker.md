# King of the Hill: tracking only

Production: https://www.kingofthehills.fun, Vercel project pump-tower.

The user retired the coin-based competition. All 100 squads are tracked through member wallet activity, regardless of whether they ever had a token. The nine previous tokens are removed from the active board; their immutable on-chain records, hosted metadata and historical financial journals remain preserved.

Automatic and manual launches are hard-disabled. The signing worker GET/POST and direct runKingWorker entry point return disabled regardless of env. Launch prepare/send/confirm endpoints return 410; the queue is empty. KING_WORKER_ENABLED is false in Production. The signer cron is removed. Legacy payout writes return 410. No new SOL transactions are made by the tracker.

Only /api/cron/king remains scheduled every five minutes. It reads on-chain wallet transactions, stores trading results, and awards informational hourly crowns in a separate tracking namespace. It does not claim fees, distribute payouts, buy tokens or burn. Existing treasury funds remain untouched.

Tracking begins per wallet at its first scan. The API reports initialized wallet count and lastScan progress. Rankings during initialization are incomplete. Crowns start after the first full hour following activation; delayed incomplete coverage is marked provisional. RPC and hosting can still incur provider costs, but the tracker spends no SOL.

The authenticated legacy alert inbox remains readable for audit, but the monitor watches public tracker health and scan freshness instead of retired signer outcomes. Old funding alerts are obsolete and must not request top-ups.

Validation: npm run typecheck and npm test. Regression tests assert stale enabling env cannot restart the signer and all launch submission paths reject.
