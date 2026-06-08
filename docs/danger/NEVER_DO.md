# TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM

## Database
- `supabase db reset` — XÓA TOÀN BỘ DATA LOCAL
- `supabase db reset --local` — như trên
- Bất kỳ lệnh DROP TABLE, TRUNCATE, DELETE không có WHERE
- `supabase db push` mà không có lệnh rõ ràng từ user
- Bất kỳ lệnh nào ảnh hưởng đến database (local hoặc production) mà không được user yêu cầu cụ thể

## Git
- `git push --force`
- `git reset --hard`
- `git clean -f`

---

Sự cố: 2026-06-07 — Claude chạy `supabase db reset --local` khi đang fix bug SQL.
Hậu quả: Xóa toàn bộ data nhập tay của user trên local database. Không thể recover.
