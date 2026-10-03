#!/usr/bin/env bash
# Runs on the VPS. Usage: remote-release.sh <release-id> <seed:0|1>
set -euo pipefail

RELEASE_ID="$1"
SEED="${2:-0}"
BASE=/opt/baltic-challenges
RELEASE="$BASE/releases/$RELEASE_ID"
ENV_FILE=/etc/baltic-challenges/api.env

mkdir -p "$RELEASE"
tar -xzf "$BASE/releases/$RELEASE_ID.tgz" -C "$RELEASE"
rm "$BASE/releases/$RELEASE_ID.tgz"

cd "$RELEASE"
npm ci --omit=dev --no-audit --no-fund --loglevel=error

for unit in baltic-api.service baltic-streak-reminders.service baltic-streak-reminders.timer baltic-backup.service baltic-backup.timer; do
  sudo install -m 644 "deploy/$unit" "/etc/systemd/system/$unit"
done
if ! sudo cmp -s deploy/Caddyfile /etc/caddy/Caddyfile; then
  sudo caddy validate --config deploy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
    || { sudo caddy validate --config deploy/Caddyfile --adapter caddyfile; exit 1; }
  sudo install -m 644 deploy/Caddyfile /etc/caddy/Caddyfile
  sudo systemctl reload caddy
fi
sudo chmod 755 /var/lib/baltic-challenges /var/lib/baltic-challenges/uploads

MIGRATE_ARGS=()
if [ "$SEED" = "1" ]; then MIGRATE_ARGS+=(--seed); fi
sudo -u baltic node --env-file="$ENV_FILE" dist/scripts/migrate.js "${MIGRATE_ARGS[@]}"

ln -sfn "$RELEASE" "$BASE/current.tmp"
mv -T "$BASE/current.tmp" "$BASE/current"

sudo systemctl daemon-reload
sudo systemctl enable baltic-api >/dev/null 2>&1
sudo systemctl enable --now baltic-streak-reminders.timer >/dev/null 2>&1
sudo systemctl enable --now baltic-backup.timer >/dev/null 2>&1
sudo systemctl restart baltic-api

for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4000/health >/dev/null 2>&1; then
    echo "healthy: $RELEASE_ID"
    ls -1dt "$BASE"/releases/*/ | tail -n +6 | xargs -r rm -rf
    exit 0
  fi
  sleep 0.5
done

echo "API failed to become healthy; recent logs:" >&2
sudo journalctl -u baltic-api -n 40 --no-pager >&2
exit 1
