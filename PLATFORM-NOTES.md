# Platform issues surfaced while building carsads

This file logs the rough edges I hit going through the official
"scaffold + provision + publish" path for a new pro app. None are
blocking — carsads ships and works — but each is worth a platform
follow-up.

## 1. Three different conventions for the data-worker URL

The SDK type doc, the in-flight reference app (`meetup`), and the
current CLI provision flow do not agree.

| Source | URL pattern |
|---|---|
| `@proappstore/sdk` type doc (`ProInitOptions.dataApiBase`) | `https://data-{appId}.proappstore.online` |
| `proappstore-online/meetup` live in prod | `https://data-meetup.proappstore.online` |
| `pas publish` provisioned for carsads (2026-05-20) | `https://pas-data-carsads.serge-the-dev.workers.dev` |

`pas-data-{appId}.workers.dev` is what gets created, but the SDK's
documented default would have apps reach `data-{appId}.proappstore.online`,
which doesn't exist in this provisioning path. Carsads currently has to
explicitly pass `dataApiBase` to `initPro()` to match what the CLI
created.

**Suggested fix**: pick one. If the platform is moving to the
workers.dev hostname (cheaper, no zone DNS edits needed), update the
SDK type docs + default. If the platform wants
`data-{appId}.proappstore.online` for branding, have `pas publish`
attach a custom domain on the worker and update the deploy template to
include the `[[routes]]` block.

## 2. Pre-publish vanity URL is stuck on missing DNS for several hours

Before `pas publish` is run, a manual flow (creating the Pages project
+ attaching custom domain via the CF API) leaves the domain attached
but `pending / CNAME record not set`. The error message is correct but
the path to fix is dashboard-only unless the operator has a token
scoped to `Zone:DNS:Edit`. The `CLOUDFLARE_API_TOKEN` minted by the
"Edit Cloudflare Workers" template — the documented one — does **not**
include zone DNS edit, so `wrangler` cannot create the record and
neither can a direct API call.

`pas publish` does create the DNS record correctly. But the docs (and
the user CLAUDE.md) read as if any flow that gets the Pages project up
will get the domain working, which isn't true.

**Suggested fix**: surface this in `pas check` — when it sees a Pages
project with a `pending` custom domain that hasn't been claimed by `pas
publish`, recommend running publish (which has the auth to add the
record).

## 3. Local DNS negative caching after `pas publish` adds the CNAME

mDNSResponder caches NXDOMAIN for the previously-missing
`carsads.proappstore.online`. After `pas publish` creates the record,
the public resolvers (1.1.1.1, 8.8.8.8) return the right IPs within
seconds, but locally the URL still appears dead for ~5 minutes.

**Suggested fix**: have the CLI mention this at the end of a publish
that just transitioned a domain from `pending` to `active`, e.g. "Note:
your local DNS may cache the previous NXDOMAIN — open the URL in an
incognito tab or run `sudo dscacheutil -flushcache`."

## 4. `pas publish` provisions resources but doesn't remove drift

Carsads ended up with **two** D1 databases and **two** data workers
because the first version was scaffolded manually (before I knew about
`pas publish`):

| Resource | Mine (manual) | Platform's (from `pas publish`) |
|---|---|---|
| D1 | `carsads` | `pas-data-carsads` |
| Worker | `data-carsads.proappstore.online` | `pas-data-carsads.serge-the-dev.workers.dev` |
| DNS | `data-carsads` CNAME → still in zone after worker deleted | n/a |

`pas publish` is idempotent on what it knows about. It doesn't notice
or warn about parallel resources that share the app id. Cleaning up
took: `wrangler delete --name data-carsads`, `wrangler d1 delete
carsads -y`, and one orphan DNS record I couldn't delete (no DNS
scope).

**Suggested fix**: a `pas reconcile` (or surfaced via `pas check`) that
looks for D1s matching the app id but not the canonical name, custom
domain DNS records pointing at deleted workers, and Pages projects in
"direct upload" mode that have a Git-sourced sibling. Either prompts
the operator to delete the strays or logs them as drift.

## 5. `pas check` (the prebuild hook) fails on a missing transitive dep

```
npm error code ETARGET
npm error notarget No matching version found for @proappstore/compliance@0.1.1.
```

Adding `"prebuild": "npx -y @proappstore/cli@latest check"` to `web/package.json`
breaks `pnpm build` because the CLI version on npm depends on a
compliance package version that isn't published yet. Build still
succeeds when invoked directly (`pnpm exec tsc -b && pnpm exec vite
build`).

**Suggested fix**: pin `@proappstore/compliance` to a version that
exists, or vendor the compliance checks into the CLI so the dep tree
doesn't require it.

## 6. SDK default `dataApiBase` is misleading

Related to #1, but worth its own line: an app that follows the
documented signature and *omits* `dataApiBase` will silently try to
reach `https://data-{appId}.proappstore.online`, which 522s (no worker
behind that hostname for newly-provisioned apps). The user only sees a
generic "Database error" — they don't get a hint that the SDK default
hostname doesn't match what the CLI provisioned.

**Suggested fix**: either change the SDK default to match the CLI
output (`pas-data-{appId}.workers.dev`), or have the SDK probe and
warn on first failed call. Even a `console.error("hint: did you pass
dataApiBase to initPro?")` would beat the silent 522.

## 7. `members_can_create_repositories: false` is invisible to the user

Per the workspace CLAUDE.md (2026-05-20): the 5 store orgs block member
repo creation to force everything through admin. That's a good
invariant. But when I tried `gh repo create proappstore-online/foo`
earlier in the session, the error message didn't mention `pas publish`
as the way to do it — it just said "permission denied". Anyone
encountering this for the first time will burn time before discovering
the official path.

**Suggested fix**: nothing platform-side can fix the gh error message,
but a one-liner in the user CLAUDE.md (e.g. "if `gh repo create` fails
in a store org, you want `pas publish` / `fas publish` instead") would
short-circuit the confusion.

---

For status: nothing here blocks shipping carsads. The vanity URL works,
the canonical D1/worker pair is wired up, the registry entry is in
place, and the app is live at https://carsads.proappstore.online. These
notes are for the platform team's next sweep.
