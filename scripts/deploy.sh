#!/usr/bin/env bash
# Deploy to Fly.io: create the app if needed, push every non-empty key from .env.local as a secret, deploy one machine.
# Usage: scripts/deploy.sh [app-name]
set -euo pipefail
cd "$(dirname "$0")/.."

APP="${1:-mom-dont-click}"
URL="https://${APP}.fly.dev"

fly auth whoami >/dev/null || { echo "Run 'fly auth login' first."; exit 1; }
fly apps list 2>/dev/null | awk '{print $1}' | grep -qx "$APP" || fly apps create "$APP"

# the presenter console must never be open on the internet: make a key if there is none
touch .env.local
if ! grep -qE '^CONSOLE_KEY=.+' .env.local; then
  KEY="$(openssl rand -hex 12)"
  if grep -qE '^CONSOLE_KEY=' .env.local; then
    sed -i.bak "s/^CONSOLE_KEY=.*/CONSOLE_KEY=${KEY}/" .env.local && rm -f .env.local.bak
  else
    printf '\nCONSOLE_KEY=%s\n' "$KEY" >> .env.local
  fi
  echo "Generated a CONSOLE_KEY and saved it to .env.local"
fi

# every KEY=value line with a value, except PUBLIC_URL (set to the app's address) and dev-only flags
SECRETS=("PUBLIC_URL=${URL}")
if [ -f .env.local ]; then
  while IFS= read -r line; do
    key="${line%%=*}"
    val="${line#*=}"
    case "$key" in PUBLIC_URL|MDC_SIMULATE_ALERTS|PGLITE_DIR|CHROMIUM_PATH) continue ;; esac
    # dashboards often show KEY="value": strip the quotes and any stray carriage return, as dotenv does
    val="${val%$'\r'}"
    case "$val" in
      \"*\") val="${val:1:${#val}-2}" ;;
      \'*\') val="${val:1:${#val}-2}" ;;
    esac
    [ -n "$val" ] && SECRETS+=("${key}=${val}")
  done < <(grep -E '^[A-Z_]+=.+' .env.local || true)
fi
printf 'Setting %d secrets on %s (values hidden)\n' "${#SECRETS[@]}" "$APP"
fly secrets set --app "$APP" --stage "${SECRETS[@]}" >/dev/null

fly deploy --app "$APP" --ha=false --build-arg "PUBLIC_URL=${URL}"
echo "Live at ${URL}"
echo "Presenter console: ${URL}/console?key=$(grep -E '^CONSOLE_KEY=' .env.local | cut -d= -f2-)"
