#!/usr/bin/env bash
# Export Brave Skill's Cloudflare D1 database.
# Usage: ./scripts/backup-db.sh [output-directory]
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/braveskill-${STAMP}.sql"
mkdir -p "$BACKUP_DIR"

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"

echo "→ Exporting Cloudflare D1 database to ${FILE}"
npx wrangler d1 export brave-skill-db --remote --output="$FILE"
shasum -a 256 "$FILE" >> "${BACKUP_DIR}/checksums.txt"
find "$BACKUP_DIR" -name 'braveskill-*.sql' -type f -mtime +30 -delete
echo "✓ D1 export complete: $FILE"
