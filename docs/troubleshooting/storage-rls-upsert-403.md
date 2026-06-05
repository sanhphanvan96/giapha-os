# Storage Upload 403 — "new row violates row-level security policy"

> **Ngày:** 2026-06-05
> **Môi trường:** Supabase CLI v2.104 local dev (cũng có thể ảnh hưởng production)
> **Trạng thái:** Đã fix ✅

## Triệu chứng

Upload ảnh qua `supabase.storage.from("avatars").upload(path, file, { upsert: true })`
trả về 403:

```json
{
  "statusCode": "403",
  "error": "Unauthorized",
  "message": "new row violates row-level security policy"
}
```

JWT hợp lệ (`role: "authenticated"`, ES256), các service khác (REST, Auth) hoạt động
bình thường. Chỉ Storage bị lỗi.

## Nguyên nhân gốc

**Thiếu SELECT policy trên `storage.objects`.**

Khi dùng `upsert: true`, Storage server chạy:

```sql
INSERT INTO storage.objects (...) VALUES (...)
ON CONFLICT (name, bucket_id) DO UPDATE SET ...
```

PostgreSQL yêu cầu `ON CONFLICT ... DO UPDATE` phải **nhìn thấy** row hiện tại thông qua
SELECT policy. Nếu không có SELECT policy:

1. Row hiện tại "invisible" → conflict check không tìm thấy row
2. INSERT path chạy → tạo row mới → trùng unique constraint
3. PostgreSQL raise RLS violation thay vì unique violation

**Tóm lại:**

```
INSERT policy ✅  (có)
UPDATE policy ✅  (có)
SELECT policy ❌  (THIẾU) ← gây lỗi
DELETE policy ✅  (có)
```

## Tại sao SELECT policy bị thiếu?

Migration `20260605090743_fix_storage_select_policies.sql` đã được record trong
`schema_migrations` nhưng các policy không thực sự tồn tại trong `pg_policy`.

Có thể do migration apply qua `--include-all` khi DB đang ở trạng thái không nhất quán,
hoặc do race condition khi `db reset`.

## Cách debug

```bash
# 1. Kiểm tra policy thực tế trong DB
docker exec supabase_db_giapha-os psql -U postgres -d postgres -c "
  SELECT policyname, cmd FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
  ORDER BY cmd, policyname;
"

# 2. Kiểm tra log của Storage container
docker logs supabase_storage_giapha-os --tail 30

# 3. Simulate upsert dưới role authenticated
docker exec supabase_db_giapha-os psql \
  "postgresql://supabase_storage_admin:postgres@127.0.0.1:5432/postgres" -c "
BEGIN;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '<user-uuid>';
INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata, version)
VALUES ('avatars', 'test.jpg', '<user-uuid>', '<user-uuid>', '{}'::jsonb, '1')
ON CONFLICT (name, bucket_id) DO UPDATE SET version = '2';
ROLLBACK;
"
```

## Fix

Migration `20260605095410_fix_missing_storage_select_policies.sql`:

```sql
-- Idempotent: DROP IF EXISTS trước CREATE
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read gallery" ON storage.objects;
CREATE POLICY "Authenticated users can read gallery"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
```

Applied cả local và production via `supabase db push --include-all`.

## Bài học

1. **Upsert cần SELECT policy.** Đây là yêu cầu của PostgreSQL RLS, không phải bug
   của Supabase. Khi tạo Storage policy cho INSERT + upsert, luôn tạo kèm SELECT.

2. **Migration recorded ≠ policy exists.** Luôn verify bằng `pg_policies` view sau khi
   apply migration, đặc biệt khi dùng `--include-all` hoặc `db reset`.

3. **Storage log cho biết JWT hợp lệ.** Nếu log hiện `"role":"authenticated"` và
   `"owner":"<uuid>"` nhưng vẫn 403 → vấn đề ở RLS policy, không phải JWT/key format.

4. **Key format mới (`sb_publishable_`) không gây lỗi này.** ES256 JWT được verify
   đúng qua JWKS. Đừng đổ lỗi cho key format khi debug RLS.
