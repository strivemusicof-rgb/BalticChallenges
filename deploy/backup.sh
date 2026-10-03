#!/usr/bin/env bash
# Nightly backup: compressed database dump plus an archive of uploaded photos.
# Keeps the last 14 days in /var/backups/baltic-challenges.
set -euo pipefail

DEST=/var/backups/baltic-challenges
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"
chmod 700 "$DEST"

runuser -u postgres -- pg_dump --format=custom --compress=9 baltic_challenges > "$DEST/db-$STAMP.dump"
tar -czf "$DEST/uploads-$STAMP.tgz" -C /var/lib/baltic-challenges uploads

find "$DEST" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tgz' \) -mtime +14 -delete
echo "backup $STAMP: $(du -sh "$DEST" | cut -f1) total"
