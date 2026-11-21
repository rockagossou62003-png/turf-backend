#!/usr/bin/env bash
# TURF PRO — Sauvegarde PostgreSQL (Linux/macOS, natif VPS).
# Usage : ./scripts/backup.sh [retention_jours]   (défaut : 14)
# Cron   : 0 2 * * * cd /chemin/vers/turf-pro && ./scripts/backup.sh 30 >> backups/backup.log 2>&1
set -euo pipefail

RETENTION_DAYS="${1:-14}"
cd "$(dirname "$0")/.."
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Lit DATABASE_URL de apps/web/.env (ou .env.production sur le serveur).
ENV_FILE="apps/web/.env"
[ -f "$ENV_FILE" ] || ENV_FILE=".env.production"
[ -f "$ENV_FILE" ] || { echo "ERREUR : aucun .env trouvé."; exit 1; }

DB_URL=$(grep -E '^\s*DATABASE_URL=' "$ENV_FILE" | head -n1 | sed 's/^\s*DATABASE_URL=//' | tr -d '"' | tr -d "'")
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^/?]+)\?.*|\1|')
DB_USER=$(echo "$DB_URL" | sed -E 's|.*://([^:@]+):.*|\1|')

STAMP=$(date +%Y%m%d-%H%M%S)
TARGET="$BACKUP_DIR/turfpro-$STAMP.dump"

echo "Sauvegarde de '$DB_NAME' -> $TARGET"
docker compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-privileges -f /tmp/turfpro.dump
docker compose cp postgres:/tmp/turfpro.dump "$TARGET"
docker compose exec -T postgres rm -f /tmp/turfpro.dump

SIZE=$(stat -c%s "$TARGET" 2>/dev/null || stat -f%z "$TARGET")
if [ "$SIZE" -lt 1024 ]; then
  echo "ERREUR : sauvegarde suspecte (< 1 Ko)."
  exit 1
fi
echo "OK ($SIZE octets)."

# Retention
echo "Nettoyage (> $RETENTION_DAYS jours)..."
find "$BACKUP_DIR" -name "turfpro-*.dump" -mtime "+$RETENTION_DAYS" -print -delete

echo "Sauvegardes présentes : $(ls -1 "$BACKUP_DIR"/turfpro-*.dump 2>/dev/null | wc -l)"
