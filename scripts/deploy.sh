#!/usr/bin/env bash
# Deploy to Fly.io: create the app if needed, push every non-empty key from .env.local as a secret, deploy one machine.
# Usage: scripts/deploy.sh [app-name]
set -euo pipefail
cd "$(dirname "$0")/.."

APP="${1:-mom-dont-click}"
URL="https://${APP}.fly.dev"

fly auth whoami >/dev/null || { echo "Run 'fly auth login' first."; exit 1; }
fly apps list 2>/dev/null | awk '{print $1}' | grep -qx "$APP" || fly apps create "$APP"

# every KEY=value line with a value, except PUBLIC_URL (set to the app's address) and dev-only flags
SECRETS=("PUBLIC_URL=${URL}")
if [ -f .env.local ]; then
  while IFS= read -r line; do
    key="${line%%=*}"
    val="${line#*=}"
    case "$key" in PUBLIC_URL|MDC_SIMULATE_ALERTS|PGLITE_DIR|CHROMIUM_PATH) continue ;; esac
    [ -n "$val" ] && SECRETS+=("${key}=${val}")
  done < <(grep -E '^[A-Z_]+=.+' .env.local || true)
fi
printf 'Setting %d secrets on %s (values hidden)\n' "${#SECRETS[@]}" "$APP"
fly secrets set --app "$APP" --stage "${SECRETS[@]}" >/dev/null

fly deploy --app "$APP" --ha=false --build-arg "PUBLIC_URL=${URL}"
echo "Live at ${URL}"
