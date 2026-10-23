#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run setup:local
node --input-type=module <<'NODE'
import 'dotenv/config';
const database = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/academic') {
  throw new Error('This cloud helper prepares the local academic database only. For an external database, follow the manual README steps.');
}
NODE
docker compose up -d --wait db
# A cloud snapshot retains workspace files, not necessarily Docker volumes.
# Restore only into a completely empty public schema; never replace existing data.
table_count=$(docker compose exec -T db psql -U academic -d academic -Atc "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'")
if [ "$table_count" = "0" ] && [ -s .data/backups/academic.dump ]; then
  docker compose exec -T db pg_restore -U academic -d academic --no-owner --exit-on-error < .data/backups/academic.dump
  docker compose exec -T db psql -U academic -d academic -c 'DELETE FROM "Session";'
fi
npm run db:generate
npm run db:migrate
mkdir -p .data/backups
chmod 700 .data/backups
backup_tmp=$(mktemp .data/backups/academic.XXXXXX.dump)
trap 'rm -f "$backup_tmp"' EXIT
docker compose exec -T db pg_dump -U academic -d academic -Fc > "$backup_tmp"
chmod 600 "$backup_tmp"
docker compose exec -T db pg_restore --list < "$backup_tmp" > /dev/null
mv "$backup_tmp" .data/backups/academic.dump
echo 'Dependencies and database prepared. Existing local configuration and academic records were preserved.'
