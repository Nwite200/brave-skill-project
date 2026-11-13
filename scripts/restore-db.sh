#!/usr/bin/env bash
# Restore a SQL export into Cloudflare D1.
# Usage: ./scripts/restore-db.sh backups/braveskill-YYYYMMDD-HHMMSS.sql
set -euo pipefail
cd "$(dirname "$0")/.."

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <backup.sql>" >&2
  exit 1
fi

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"

echo "!! This will execute SQL against the remote Cloudflare D1 database."
printf "Type RESTORE to continue: "
read -r confirm
[ "$confirm" = "RESTORE" ] || { echo "Aborted."; exit 1; }

npx wrangler d1 execute brave-skill-db --remote --file="$FILE"
echo "✓ D1 restore command completed."
