#!/usr/bin/env bash
#
# Fast subset of platform compliance — same rules as the CI compliance
# workflow, minus the bundle-size check (which requires a build).
#
# Target: <1s on a clean repo. Runs from pre-commit so violations land
# locally instead of burning GitHub Actions minutes.
#
# Eventually replaced by `npx -y @proappstore/cli@x.y.z check --fast`.
# Kept here verbatim so the rules don't drift between local + CI while
# the CLI's --fast mode is being designed.

set -e
fail() { echo "  ✗ $1" >&2; exit 1; }

# MIT license
grep -qi "MIT" LICENSE || fail "LICENSE: must mention MIT"

# No production env files committed
[ ! -f .env.production ] || fail ".env.production: must not be committed"
[ ! -f web/.env.production ] || fail "web/.env.production: must not be committed"

# No tracking libraries
FORBIDDEN="google-analytics|gtag|amplitude|mixpanel|segment|hotjar|plausible|posthog"
! grep -rE "$FORBIDDEN" web/src/ 2>/dev/null \
  || fail "tracking library detected in web/src/ — PAS apps are no-tracking"
! grep -E "$FORBIDDEN" web/package.json 2>/dev/null \
  || fail "tracking library detected in web/package.json"

# Brand fonts
CSS_FILE=$(find web/src -name "index.css" | head -1)
[ -n "$CSS_FILE" ] || fail "web/src/index.css: not found"
grep -qi "manrope"  "$CSS_FILE" || fail "$CSS_FILE: missing Manrope font"
grep -qi "fraunces" "$CSS_FILE" || fail "$CSS_FILE: missing Fraunces font"

# CSS variables — the brand palette tokens
grep -q -- "--paper"  "$CSS_FILE" || fail "$CSS_FILE: missing --paper CSS var"
grep -q -- "--ink"    "$CSS_FILE" || fail "$CSS_FILE: missing --ink CSS var"
grep -q -- "--accent" "$CSS_FILE" || fail "$CSS_FILE: missing --accent CSS var"

# HTML meta tags
grep -q 'lang='    web/index.html || fail "web/index.html: missing lang attribute"
grep -q 'viewport' web/index.html || fail "web/index.html: missing viewport meta"
grep -q '<title>'  web/index.html || fail "web/index.html: missing <title>"

# PWA manifest — accept either a static public/manifest.json (older
# convention) or a VitePWA-generated one declared in vite.config.ts.
if [ -f web/public/manifest.json ]; then
  grep -q '"name"'      web/public/manifest.json || fail "manifest.json: missing name"
  grep -q '"display"'   web/public/manifest.json || fail "manifest.json: missing display"
  grep -q '"start_url"' web/public/manifest.json || fail "manifest.json: missing start_url"
elif grep -q "manifest" web/vite.config.ts 2>/dev/null; then
  : # VitePWA plugin handles it
else
  fail "no PWA manifest (web/public/manifest.json or VitePWA config in vite.config.ts)"
fi

# PWA meta tags
grep -qi "apple-mobile-web-app-capable\|mobile-web-app-capable" web/index.html \
  || fail "web/index.html: missing mobile-web-app-capable meta"

# Link back to the storefront — so the app surfaces "by ProAppStore"
grep -r "proappstore.online" web/src/ | grep -q . \
  || fail "web/src/: no link/reference to proappstore.online"

# Dark mode support
grep -rE "prefers-color-scheme|data-theme|color-scheme" web/src/ | grep -q . \
  || fail "web/src/: no dark-mode hook (prefers-color-scheme / data-theme)"

# pnpm workspace
grep -q "pnpm" package.json     || fail "package.json: pnpm not configured"
[ -f pnpm-workspace.yaml ]      || fail "pnpm-workspace.yaml: not found"

echo "  ✓ pas check (fast) passed"
