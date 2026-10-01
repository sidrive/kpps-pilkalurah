#!/usr/bin/env bash
# Build web app lalu publish hasilnya ke branch artefak (default: claude/web-dist).
# Pemakaian: npm run publish:dist   (jalankan dari branch sumber, working tree bersih)
set -euo pipefail
cd "$(dirname "$0")/.."

DIST_BRANCH="${DIST_BRANCH:-claude/web-dist}"
REMOTE="${REMOTE:-origin}"
SRC_SHA="$(git rev-parse --short HEAD)"
SRC_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Working tree belum bersih — commit dulu supaya versi build bisa dilacak." >&2; exit 1
fi

npm ci
npm run build

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/public"
cp -R dist/. "$STAGE/public/"
cp deploy/server.mjs deploy/ecosystem.config.cjs deploy/nginx.conf deploy/docker-compose.yml "$STAGE/"
cp deploy/DEPLOY.md "$STAGE/DEPLOY.md"
printf 'source=%s@%s\nbuilt=%s\n' "$SRC_BRANCH" "$SRC_SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STAGE/public/version.txt"

# Pakai repo git sementara di STAGE, lanjutkan history branch artefak jika sudah ada.
cd "$STAGE"
git init -q
git remote add "$REMOTE" "$(git -C "$OLDPWD" remote get-url "$REMOTE")"
if git fetch -q "$REMOTE" "$DIST_BRANCH" 2>/dev/null; then
  git reset -q --soft FETCH_HEAD
else
  git checkout -q -b "$DIST_BRANCH"
fi
git add -A
if git diff --cached --quiet; then echo "Tidak ada perubahan build — tidak ada yang dipublish."; exit 0; fi
git -c user.name="${GIT_AUTHOR_NAME:-deploy-bot}" -c user.email="${GIT_AUTHOR_EMAIL:-deploy-bot@users.noreply.github.com}" \
  commit -q -m "build: ${SRC_BRANCH}@${SRC_SHA}"
git push -q "$REMOTE" "HEAD:refs/heads/$DIST_BRANCH"
echo "Dipublish ke $REMOTE/$DIST_BRANCH (sumber $SRC_BRANCH@$SRC_SHA)"
