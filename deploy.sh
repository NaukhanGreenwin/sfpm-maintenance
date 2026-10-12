#!/usr/bin/env bash
# Build the static export and publish it to the gh-pages branch.
# public/CNAME ships in BOTH modes so the Pages custom domain stays configured.
# Until DNS for maintenance.stressfreepm.ca exists, GitHub keeps serving the github.io
# preview (project path). The moment the DNS CNAME goes live, run `./deploy.sh domain`.
#   ./deploy.sh          -> project-path build for naukhangreenwin.github.io/sfpm-maintenance/
#   ./deploy.sh domain   -> root build + CNAME for maintenance.stressfreepm.ca
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-preview}"
REMOTE="$(git remote get-url origin)"
if [ "$MODE" = "domain" ]; then
  BASE_PATH="" npx next build
else
  npx next build
fi
touch out/.nojekyll
# Commit on top of the existing gh-pages branch (no force push) so GitHub's own CNAME commits are kept.
TMP="$(mktemp -d)"
git clone -q --branch gh-pages --single-branch "$REMOTE" "$TMP" 2>/dev/null || { git -C "$TMP" init -q -b gh-pages; }
find "$TMP" -mindepth 1 -maxdepth 1 ! -name .git ! -name CNAME -exec rm -rf {} +
cp -R out/. "$TMP/"
cd "$TMP"
git add -A
git -c user.name="Hermes" -c user.email="hermes@itrapidsupport.com" commit -q -m "Deploy ($MODE) $(date -u +%Y-%m-%dT%H:%MZ)" || echo "nothing to commit"
git push -q origin gh-pages
echo "Deployed $MODE build to gh-pages"
