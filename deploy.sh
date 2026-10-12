#!/usr/bin/env bash
# Build the static export and publish it to the gh-pages branch.
#   ./deploy.sh          -> project-path build for naukhangreenwin.github.io/sfpm-maintenance/
#   ./deploy.sh domain   -> root build + CNAME for maintenance.stressfreepm.ca
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-preview}"
REMOTE="$(git remote get-url origin)"
if [ "$MODE" = "domain" ]; then
  BASE_PATH="" npx next build
  echo "maintenance.stressfreepm.ca" > out/CNAME
else
  npx next build
fi
touch out/.nojekyll
TMP="$(mktemp -d)"
cp -R out/. "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="Hermes" -c user.email="hermes@itrapidsupport.com" commit -q -m "Deploy ($MODE) $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "$REMOTE" gh-pages
echo "Deployed $MODE build to gh-pages"
