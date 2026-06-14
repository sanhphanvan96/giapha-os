# Runbook: Supabase Migrations

Migration files: `supabase/migrations/YYYYMMDDHHMMSS_name.sql`

Supabase CLI dùng bảng tracking riêng (`supabase_migrations.schema_migrations`) trong từng DB để phân biệt local vs remote — hai bên độc lập, không can thiệp nhau.

## First-time setup (chỉ làm một lần)

**PROJECT_REF** là chuỗi ~20 ký tự trong URL dashboard:
`https://supabase.com/dashboard/project/<PROJECT_REF>`
(cũng là phần đầu API URL: `https://<PROJECT_REF>.supabase.co`)

```bash
# 0. Đăng nhập CLI (mở browser, lưu token vào ~/.supabase/)
supabase login

# 1. Link CLI với remote project
supabase link --project-ref <PROJECT_REF>

# 2. Kéo schema hiện tại của remote về làm baseline
#    → Tạo supabase/migrations/<timestamp>_remote_schema.sql
#    → Tự đánh dấu applied trên remote (không chạy lại, không mất data)
supabase db pull

# 3. Đánh dấu baseline đó là applied trên local
#    (local đã có schema rồi — không cần chạy lại)
#    Lưu ý: không có --local thì mặc định target remote, phải có --local để trỏ đúng local DB
supabase migration repair --local --status applied <timestamp>
#    <timestamp> = 14 chữ số prefix của file vừa tạo ở bước 2
```

## Workflow hàng ngày

```bash
# Tạo migration mới (tự sinh timestamp chuẩn 14 chữ số)
supabase migration new <ten_migration>

# Viết SQL vào file vừa tạo, sau đó:
supabase migration up   # apply lên local — không mất data
supabase db push        # apply lên production — không mất data
```

> ⚠️ `supabase db reset` xóa toàn bộ local DB rồi chạy lại từ đầu — **mất data local**.

## Setup env vars cho Web Push notifications (prod)

Sau khi `supabase db push` migration `push_subscriptions`, cần set thêm env vars trên Vercel để tính năng push hoạt động trên prod:

```bash
# Lấy service_role key của project Supabase prod
supabase projects api-keys

# Link repo local với Vercel project (nếu chưa link)
vercel link

# Set các env vars production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel env add VAPID_SUBJECT production
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
```

Ghi chú:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` → cảnh báo prefix `NEXT_PUBLIC_`: chọn "Leave as is" (đúng ý đồ — public key, không phải secret), "Is sensitive secret?" → **n**.
- `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` → chọn sensitive (**y**).
- `VAPID_SUBJECT` → `mailto:...` hoặc URL bất kỳ, không cần email thật, không phải secret.
- VAPID keypair tạo bằng `npx web-push generate-vapid-keys`, có thể dùng chung 1 cặp cho local + prod.

## Troubleshooting

**Migration bị lỡ, đã mark nhầm là applied:**
```bash
# Unmark — báo CLI migration này chưa chạy trên remote
supabase migration repair --status reverted <timestamp>
supabase db push
```

**Migration có timestamp nhỏ hơn cái cuối cùng trên remote (out of order):**
```bash
# CLI báo: "Found local migration files to be inserted before the last migration"
supabase db push --include-all
```

**Local DB đã có schema nhưng tracking table trống (migration up báo column already exists):**
```bash
# Mark tất cả migration hiện có là applied trên local
for f in supabase/migrations/*.sql; do
  ts=$(basename "$f" | cut -d_ -f1)
  supabase migration repair --local --status applied "$ts"
done
```
