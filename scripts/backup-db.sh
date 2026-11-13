#!/usr/bin/env bash
# Brave Skill — PostgreSQL backup
# Usage: ./scripts/backup-db.sh [output-directory]
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/braveskill-${STAMP}.sql.gz"
mkdir -p "$BACKUP_DIR"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Add PostgreSQL bin to PATH." >&2
  exit 1
fi

echo "→ Backing up to ${FILE}"
pg_dump --no-owner --no-privileges --format=plain "${DATABASE_URL}" | gzip -9 > "$FILE"

# Checksum for integrity verification
shasum -a 256 "$FILE" >> "${BACKUP_DIR}/checksums.txt"

# Keep 30 days of backups
find "$BACKUP_DIR" -name 'braveskill-*.sql.gz' -type f -mtime +30 -delete
find "$BACKUP_DIR" -name 'checksums.txt' -size +1M -delete 2>/dev/null || true

echo "✓ Backup complete ($(du -h "$FILE" | cut -f1))"
echo "  Restore: gunzip -c ${FILE} | psql \"\$DATABASE_URL\""
