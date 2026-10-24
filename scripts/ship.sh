#!/usr/bin/env bash
# Build check, commit everything, push to main, optionally wait for the Pages deploy.
# Usage: scripts/ship.sh "commit message" [--watch] [--no-build]
#        npm run ship -- "commit message" [--watch]
set -euo pipefail
cd "$(dirname "$0")/.."

msg=""; watch=0; build=1
for a in "$@"; do
  case "$a" in
    --watch) watch=1 ;;
    --no-build) build=0 ;;
    *) msg="$a" ;;
  esac
done

branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = main ] || { echo "Not on main (on $branch)"; exit 1; }

if [ "$build" = 1 ]; then
  npm run build >/tmp/ship-build.log 2>&1 || { tail -30 /tmp/ship-build.log; echo "Build failed"; exit 1; }
  echo "Build OK"
fi

if [ -n "$(git status --porcelain)" ]; then
  [ -n "$msg" ] || { echo "Uncommitted changes: pass a commit message"; exit 1; }
  git add -A
  git commit -q -m "$msg"
  echo "Committed: $(git log --oneline -1)"
fi

# Plain `git push` hangs on the Git Credential Manager on this machine.
GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c "credential.helper=!gh auth git-credential" push -q origin main
echo "Pushed $(git rev-parse --short HEAD) to main"

if [ "$watch" = 1 ]; then
  sleep 5
  id=$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')
  gh run watch "$id" --exit-status >/dev/null 2>&1 && echo "Deploy OK" || { echo "Deploy failed: gh run view $id --log-failed"; exit 1; }
fi
