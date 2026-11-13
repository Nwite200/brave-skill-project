#!/usr/bin/env bash
# Brave Skill — PostgreSQL restore
# Usage: ./scripts/restore-db.sh backups/braveskill-YYYYMMDD-HHMMSS.sql.gz
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

echo "!! This will overwrite data in the database referenced by DATABASE_URL."
printf "Type RESTORE to continue: "
read -r confirm
[ "$confirm" = "RESTORE" ] || { echo "Aborted."; exit 1; }

gunzip -c "$FILE" | psql "${DATABASE_URL}" -v ON_ERROR_STOP=1
echo "✓ Restore complete. Run 'npx prisma migrate deploy' to apply any newer migrations."
