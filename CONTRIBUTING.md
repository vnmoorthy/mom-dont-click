# Contributing

Thanks for wanting to help keep someone's mom from clicking.

## Getting set up

```bash
pnpm install
cp .env.example .env.local   # every key is optional
pnpm dev
```

Open `http://localhost:3000/console` and press `1`.

## Before you open a pull request

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Where things live

- `src/lib/verdict.ts` is the policy. A change to how evidence becomes a verdict needs a test in `tests/verdict.test.ts` and should keep the direction of failure: unsure means "treat as a scam".
- `src/lib/seeds.ts` holds the example messages and the labelled eval set. A new scam pattern is most useful as a new seed with its expected verdict.
- `src/lib/brands.ts` is the built-in list of commonly impersonated brands and their own domains.
- `docs/ARCHITECTURE.md` explains how the pieces fit.

## Ground rules

- Example scams may only link to this app's own training pages or to addresses under the reserved `.invalid` ending.
- Training pages are for fictional brands, make no network requests and store nothing.
- The agent never types into a page this app does not host.
- No screen may call a message "safe", and a suspicious address is never rendered as a link.
