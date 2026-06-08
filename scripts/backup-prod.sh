#!/usr/bin/env bash
# backup-prod.sh — Dump production Supabase (DB + Storage) vào backups/
# Xem scripts/README.md để setup và hướng dẫn restore.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$REPO_DIR/backups"
KEEP_LAST=7

# Load credentials
ENV_FILE="$SCRIPT_DIR/.env.backup"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

# Validate
if [[ -z "${DB_URL:-}" ]]; then
  echo "ERROR: DB_URL chưa set. Xem scripts/README.md."
  exit 1
fi
if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump không tìm thấy. Xem scripts/README.md để cài."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Bắt đầu backup production..."

# ── 1. Schema (tables, enums, functions, triggers, policies) ──────────────────
log "  Dump schema..."
pg_dump "$DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-acl \
  -f "$BACKUP_DIR/schema_${TIMESTAMP}.sql"
gzip "$BACKUP_DIR/schema_${TIMESTAMP}.sql"
log "  schema_${TIMESTAMP}.sql.gz ($(du -h "$BACKUP_DIR/schema_${TIMESTAMP}.sql.gz" | cut -f1))"

# ── 2. Data (tất cả tables trong public, IDs nguyên vẹn) ─────────────────────
log "  Dump data..."
pg_dump "$DB_URL" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  -f "$BACKUP_DIR/data_${TIMESTAMP}.sql"
gzip "$BACKUP_DIR/data_${TIMESTAMP}.sql"
log "  data_${TIMESTAMP}.sql.gz ($(du -h "$BACKUP_DIR/data_${TIMESTAMP}.sql.gz" | cut -f1))"

# ── 3. Auth users (password hash + metadata, để restore không cần reset pw) ──
log "  Dump auth users..."
pg_dump "$DB_URL" \
  --schema=auth \
  --table=auth.users \
  --data-only \
  --no-owner \
  --no-acl \
  -f "$BACKUP_DIR/auth_${TIMESTAMP}.sql"
gzip "$BACKUP_DIR/auth_${TIMESTAMP}.sql"
log "  auth_${TIMESTAMP}.sql.gz ($(du -h "$BACKUP_DIR/auth_${TIMESTAMP}.sql.gz" | cut -f1))"

# ── 4. Rotate DB backups ──────────────────────────────────────────────────────
log "  Dọn bản cũ (giữ $KEEP_LAST)..."
for PREFIX in schema data auth; do
  ls -t "$BACKUP_DIR"/${PREFIX}_*.sql.gz 2>/dev/null \
    | tail -n "+$((KEEP_LAST + 1))" \
    | xargs -r rm -v
done

# ── 5. Storage (tùy chọn, cần rclone + credentials) ──────────────────────────
if [[ -n "${STORAGE_KEY_ID:-}" && -n "${STORAGE_SECRET:-}" ]]; then
  if ! command -v rclone &>/dev/null; then
    log "  SKIP storage: rclone không tìm thấy (xem README để cài)"
  else
    STORAGE_DIR="$BACKUP_DIR/storage"
    mkdir -p "$STORAGE_DIR"
    for BUCKET in ${STORAGE_BUCKETS:-avatars}; do
      log "  Sync storage bucket: $BUCKET..."
      rclone sync \
        ":s3:${BUCKET}" \
        "$STORAGE_DIR/${BUCKET}" \
        --s3-endpoint="${STORAGE_ENDPOINT}" \
        --s3-access-key-id="${STORAGE_KEY_ID}" \
        --s3-secret-access-key="${STORAGE_SECRET}" \
        --s3-region="${STORAGE_REGION:-ap-southeast-1}" \
        --transfers=10 \
        --quiet
      log "  storage/${BUCKET}: $(find "$STORAGE_DIR/${BUCKET}" -type f 2>/dev/null | wc -l | tr -d ' ') files"
    done
  fi
else
  log "  SKIP storage: STORAGE_KEY_ID chưa set (xem README)"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
log "Backup hoàn tất."
log "Các bản DB hiện có:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print "    " $5, $9}' || true
