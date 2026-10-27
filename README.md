# King of the Hill

![King of the Hill](public/brand/king-x-banner.png)

**One KING token. Back your king.**

[Live site](https://www.kingofthehills.fun) · [Worker documentation](docs/king-worker.md) · [Launch checklist](docs/king-launch.md)

Track 100 squads competing on hourly banked trading results. KING creator fees fund the original reward system:

| Allocation | Destination |
| --- | --- |
| 40% | Winning squad: registered members equally, otherwise squad creator |
| 40% | Eligible KING holders backing the winning squad, proportional to snapshot holdings |
| 20% | Buy and burn the official KING token |

KING is currently **prelaunch**. Financial processing is disabled until its public mint and on-chain creator-fee route are verified. There are no active squad tokens and no squad-token launches.

## Architecture

Next.js on Vercel, durable Redis journals, finalized Solana receipt verification. A five-minute scanner tracks squads; a one-minute worker collects KING fees, snapshots eligible supporters and settles hourly allocations. Signing keys remain in environment variables. Unallocated rewards retain their original categories; no deposit is counted as fee revenue.

## Development

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

See the worker documentation for custody, eligibility, reserves, retries and acceptance criteria. Never commit environment files or private keys.

## Brand assets

- [Profile logo](public/brand/king-avatar.png)
- [X banner](public/brand/king-x-banner.png)

The implementation evolved from Pump Tower; retained historical metadata does not represent active squad coins or PTWR rewards.
