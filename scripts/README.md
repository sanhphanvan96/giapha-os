# Scripts

## backup-prod.sh

Dump toàn bộ production Supabase (DB + Storage) về local.

Dùng `pg_dump` trực tiếp — tự động discover mọi table, function, trigger, enum.
Không cần Docker. Thêm table mới → tự backup luôn.

---

## Cài đặt

### pg_dump

```bash
# Mac
brew install libpq
brew link --force libpq

# Ubuntu / Debian / VPS
apt install postgresql-client

# CentOS / RHEL
yum install postgresql
```

### rclone (để backup Storage)

```bash
# Mac
brew install rclone

# Linux
curl https://rclone.org/install.sh | bash
```

---

## Setup lần đầu

### 1. DB credentials

```bash
cp scripts/.env.backup.example scripts/.env.backup
```

Mở `scripts/.env.backup`, điền `DB_URL`:
- Supabase Dashboard → **Settings → Database → Connection string → URI**
- Dùng **Transaction pooler** (port 6543)

### 2. Storage credentials

Supabase Dashboard → **Storage → S3 Access Keys → New access key**

Điền vào `scripts/.env.backup`:

```bash
STORAGE_ENDPOINT=https://zzhkkainxxdyatrbqhpo.supabase.co/storage/v1/s3
STORAGE_REGION=ap-southeast-1
STORAGE_KEY_ID=your_access_key_id
STORAGE_SECRET=your_secret_access_key
STORAGE_BUCKETS="avatars gallery-images"   # cách nhau bằng dấu cách
```

---

## Chạy backup

```bash
./scripts/backup-prod.sh
```

Output lưu tại `backups/`:

```
backups/
  schema_20260608_030000.sql.gz   # structure: tables, enums, functions, triggers, policies
  data_20260608_030000.sql.gz     # data rows (IDs nguyên vẹn)
  auth_20260608_030000.sql.gz     # auth.users (password hash, metadata)
  storage/
    avatars/                      # files từ bucket avatars
    gallery-images/               # files từ bucket gallery-images
```

Giữ 7 bản DB gần nhất, tự xóa bản cũ. Storage sync theo kiểu mirror (thêm/xóa theo production).

### Tự động (cron)

```bash
crontab -e
# Backup lúc 3AM hàng ngày:
0 3 * * * /path/to/giapha-os/scripts/backup-prod.sh >> /path/to/giapha-os/backups/backup.log 2>&1
```

---

## Khôi phục (Restore)

**IDs được giữ nguyên** — `pg_dump --data-only` sinh INSERT với UUID thực, không generate lại.
Storage restore dùng cùng path → URLs trong DB vẫn hợp lệ, không cần sửa gì.

### Restore lên Supabase project mới (disaster recovery)

```bash
TARGET_URL=postgresql://postgres.[ref]:[password]@pooler.supabase.com:6543/postgres

# 1. Schema trước
gunzip -k backups/schema_20260608_030000.sql.gz
psql "$TARGET_URL" < backups/schema_20260608_030000.sql

# 2. Auth users (cần trước vì profiles → FK → auth.users)
gunzip -k backups/auth_20260608_030000.sql.gz
psql "$TARGET_URL" < backups/auth_20260608_030000.sql

# 3. Data (đúng thứ tự FK: profiles sau auth.users, relationships sau persons)
gunzip -k backups/data_20260608_030000.sql.gz
psql "$TARGET_URL" < backups/data_20260608_030000.sql

# 4. Storage — sync từ backup lên project mới
rclone sync backups/storage/avatars \
  :s3:avatars \
  --s3-endpoint=$NEW_STORAGE_ENDPOINT \
  --s3-access-key-id=$NEW_KEY_ID \
  --s3-secret-access-key=$NEW_SECRET \
  --s3-region=ap-southeast-1
```

### Restore lên local (dev)

```bash
LOCAL_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

psql "$LOCAL_URL" < backups/schema_20260608_030000.sql
psql "$LOCAL_URL" < backups/auth_20260608_030000.sql
psql "$LOCAL_URL" < backups/data_20260608_030000.sql
```

Storage local không cần restore (dev dùng production URL hoặc upload lại).

### Restore một phần (chỉ data, giữ schema cũ)

```bash
# Chỉ restore data, bỏ qua schema
psql "$TARGET_URL" < backups/data_20260608_030000.sql
```

---

## Lưu ý

- `scripts/.env.backup` đã được gitignore — không commit credentials
- Sau khi restore auth.users sang project mới, users vẫn login được với password cũ (hash được giữ nguyên)
- Nếu restore lên project cùng (rollback), chạy data restore với `--disable-triggers` để tránh trigger conflict
