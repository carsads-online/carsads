# Contributing to carsads

## First-time setup

```bash
git clone git@github.com:carsads-online/carsads.git
cd carsads
pnpm install          # installs deps + wires up the pre-commit hook via husky
pnpm dev              # start the dev server
```

The `prepare` script in `package.json` runs `husky` after `pnpm install`,
which installs the pre-commit hook into `.git/hooks` (technically into
`.husky/_/` and switches `core.hooksPath`). If you run
`pnpm install --ignore-scripts` you'll skip this — re-run normally to
restore.

## Pre-commit hook

Every commit runs `scripts/check-fast.sh`, which verifies the static
subset of platform compliance:

- MIT license, no `.env.production`, no tracking libraries
- Brand fonts (Manrope, Fraunces) in `web/src/index.css`
- CSS variables (`--paper`, `--ink`, `--accent`)
- HTML meta tags + PWA manifest + dark-mode hooks
- Storefront link in `web/src/`, pnpm workspace, etc.

It runs in ~250ms. If it fails, fix the issue or — please don't —
`git commit --no-verify` to skip. CI runs the same checks plus
bundle-size and will block the merge regardless.

## CI

Three GitHub Actions workflows, all run on push and PR:

- **ci.yml** — typecheck + build, then a post-deploy smoke test on
  push-to-main (hits the live URL + data worker)
- **compliance.yml** — full platform compliance check, including
  bundle-size (the part pre-commit can't catch)
- **(implicit)** CF Pages picks up the Git source and builds + deploys
  automatically once the CF Pages GitHub App is installed on the
  carsads-online org. Until then, deploys are manual via
  `wrangler pages deploy web/dist --project-name=proappstore-carsads`.

## Data + schema

D1: `pas-data-carsads` (provisioned by `pas publish`).
Worker: `pas-data-carsads.serge-the-dev.workers.dev` (set in
`web/src/sdk.ts`).

Schema lives in two places that should agree:
- `web/src/sdk.ts` — runtime migrations array applied by
  `app.db.migrate()` on first signed-in load
- `scripts/schema.sql` — manual apply for bootstrap

To re-seed listings:

```bash
wrangler d1 execute pas-data-carsads --remote --file=scripts/seed.sql
```

## Conventions

- Single-file-per-view under `web/src/views/`. Sub-components stay
  next to their parent unless used by 3+ views, then promote to
  `shared.tsx`.
- Tailwind 4 + CSS variables from `index.css` (`var(--ink)`,
  `var(--accent)`, etc.) — don't hardcode brand colors.
- TypeScript `strict` mode is on; no `any`. Use `unknown` and narrow.
- Don't add a new dependency without checking gzipped bundle delta;
  the compliance check caps total at 300KB gzipped.

## Releasing

```bash
git push origin main      # CI runs, then auto-deploy via CF Pages once Git source is wired
```

There's no version field worth bumping for a hosted app. The live URL
is always the latest green main.
