# carsads

Car classifieds — a pro app on [ProAppStore](https://proappstore.online).

**Live:** https://carsads.proappstore.online

## Features

- GitHub sign-in (shared identity with FreeAppStore)
- Browse listings with filters: make, body type, fuel, price, year, sort
- Listing detail with photo gallery + embedded map + saved favorites
- Post / edit listings (Pro subscribers) with photo upload + geocoded location
- In-app buyer–seller chat (D1-backed, polled every 4s; tab-aware pause)
- Inbox + recently viewed strip + similar-listings recommendations

## Local dev

```bash
pnpm install      # also installs husky pre-commit hooks via prepare script
pnpm dev          # vite dev server on localhost
pnpm typecheck    # tsc -b
pnpm check:fast   # fast platform compliance subset (also runs on commit)
pnpm build        # tsc + vite build (production bundle)
```

Node 22+, pnpm 10+.

## Architecture

Single-page Vite + React 19 + Tailwind 4 app, built on
`@proappstore/sdk`. State management is React `useState`; there's no
client-side router (view kind is held in `App.tsx` and dispatched
through `views/*.tsx`).

```
web/src/
├── App.tsx          root + view router + migration runner
├── sdk.ts           initPro instance + dbQuery/dbExec wrappers + migrations
├── types.ts         data types, enums (Filters, Listing, Message, etc.)
├── utils.ts         formatters, parsers, genId
├── shared.tsx       CenterMessage, EmptyState, BackButton, ListingCard, Field
└── views/
    ├── TopNav.tsx, Browse.tsx, Detail.tsx, Post.tsx,
    ├── Mine.tsx, Saved.tsx, Inbox.tsx, Chat.tsx,
    └── FilterBar.tsx, RecentStrip.tsx, Lightbox.tsx, SpecsGrid.tsx, MessageBubble.tsx
```

The PAS-managed data worker lives at
`https://pas-data-carsads.serge-the-dev.workers.dev` (set in
`web/src/sdk.ts`). The D1 database is `pas-data-carsads`. Both were
provisioned by `pas publish`.

## Deploy

Today: `wrangler pages deploy web/dist --project-name=proappstore-carsads`
(manual). Once the Cloudflare Pages GitHub App is installed on
`carsads-online`, this becomes `git push origin main` (CF Pages does
the rest).

## Compliance

`scripts/check-fast.sh` runs the static subset of platform compliance
in ~250ms and fires from pre-commit (husky). The full check (including
bundle-size) runs in CI via `.github/workflows/compliance.yml`. After
deploy, a smoke test in `.github/workflows/ci.yml` verifies the live URL
+ data worker.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev workflow, and
[PLATFORM-NOTES.md](./PLATFORM-NOTES.md) for rough edges I hit
in the publisher onboarding (logged for the platform team).

## License

MIT.
