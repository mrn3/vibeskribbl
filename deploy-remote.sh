#!/usr/bin/env bash
set -euo pipefail

# Local overrides: DEPLOY_SSH_HOST, DEPLOY_REMOTE_DIR, PM2_APP_NAME
: "${DEPLOY_SSH_HOST:=shared}"
: "${DEPLOY_REMOTE_DIR:=/home/bitnami/vibeskribbl}"
: "${PM2_APP_NAME:=vibeskribbl}"

# -l: login shell so ~/.profile / ~/.bash_profile can set PATH (nvm, etc.)
ssh "${DEPLOY_SSH_HOST}" bash -l -s -- "${DEPLOY_REMOTE_DIR}" "${PM2_APP_NAME}" <<'REMOTE'
set -euo pipefail

REMOTE_DIR="$1"
PM2_NAME="$2"

# Non-interactive SSH still often misses Node; Bitnami and nvm common layouts.
for p in /opt/bitnami/nodejs/bin /opt/bitnami/node/bin; do
  if [ -d "$p" ]; then
    PATH="${p}:${PATH}"
  fi
done
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
fi

cd "$REMOTE_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm not found on PATH after login shell + Bitnami/nvm setup." >&2
  echo "PATH=${PATH}" >&2
  exit 1
fi

echo "==> $(pwd): pulling latest"
git pull --ff-only

file_sha() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

stamp_file=".deploy-npm-stamp"
need_npm=0
if [ ! -d node_modules ]; then
  need_npm=1
fi

deps_sig="$(file_sha package.json)"
if [ -f package-lock.json ]; then
  deps_sig="${deps_sig}|$(file_sha package-lock.json)"
elif [ -f npm-shrinkwrap.json ]; then
  deps_sig="${deps_sig}|$(file_sha npm-shrinkwrap.json)"
fi

prev_sig="$(cat "$stamp_file" 2>/dev/null || true)"
if [ "$need_npm" -eq 1 ] || [ "$deps_sig" != "$prev_sig" ]; then
  echo "==> npm install (missing node_modules or lock/package changed)"
  npm install --no-audit --no-fund
  printf '%s\n' "$deps_sig" > "$stamp_file"
else
  echo "==> skipping npm install (dependency files unchanged)"
fi

echo "==> pm2 restart ${PM2_NAME}"
pm2 restart "$PM2_NAME"
REMOTE
