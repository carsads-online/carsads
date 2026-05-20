# scripts/

One-off operational SQL for the `carsads` D1 database.

## `schema.sql`

Mirrors the `0001_init` migration in `web/src/App.tsx` so the schema can
be applied directly to D1 — useful when no signed-in user has hit the
app yet (the SDK normally runs migrations on first call). Idempotent;
marks `0001_init` as applied in `_migrations` so the in-app migration
flow won't re-run it.

```bash
wrangler d1 execute pas-data-carsads --remote --file=scripts/schema.sql
```

## `seed.sql`

Inserts 15 realistic seed listings (varied makes, body types, prices,
locations across Australian capitals) with 2 photos each. All owned by
a fake seller, so Browse and Detail work but Edit / Mark sold won't
apply for these rows from a normal user account. Photos point to public
Unsplash URLs. Re-runnable — wipes prior `seed-listing-*` rows first.

```bash
wrangler d1 execute pas-data-carsads --remote --file=scripts/seed.sql
```

## Cleanup

To remove all seed data later:

```bash
wrangler d1 execute pas-data-carsads --remote --command \
  "DELETE FROM listing_photos WHERE listing_id LIKE 'seed-listing-%'; \
   DELETE FROM listings WHERE id LIKE 'seed-listing-%';"
```
