# Tinh chỉnh mô hình phân quyền: mô tả rõ ràng + Editor được CRUD thông tin riêng tư

## Context
Bắt đầu từ việc "xem lại mô tả phân quyền có đúng không", sau khi đối chiếu code và làm rõ ý định của chủ repo, mục tiêu cuối là:

- **Admin** = thành viên gia đình rành kỹ thuật (chủ repo): toàn quyền, gồm thông tin riêng tư, quản lý tài khoản đăng nhập, import/export.
- **Editor** = anh em / người trẻ trong nhà: xem, thêm, sửa, xóa người trong cây gia phả **kể cả thông tin riêng tư** (SĐT, nghề nghiệp, nơi ở); **không** import/export (dễ gây hư hại dữ liệu); **không** tạo tài khoản đăng nhập.
- **Viewer** (giá trị enum DB vẫn là `member`): người trong dòng họ chỉ vào xem — cây + hồ sơ công khai; không sửa; không xem thông tin riêng tư.

Hai nhóm thay đổi:
1. **Quyền (logic)**: cho Editor CRUD `person_details_private`. Đây là thay đổi **vừa** (1 migration RLS + ~5 file theo cùng một pattern, không đụng kiến trúc).
2. **Hiển thị**: làm rõ wording (phân biệt "người trong cây gia phả" vs "tài khoản đăng nhập"), đổi nhãn role `member` → "Viewer / Người xem" (giữ enum DB).

## Hiện trạng (đã đối chiếu code)
- Private info ở bảng `person_details_private` (`phone_number`, `occupation`, `current_residence`). RLS trước đây **chỉ admin** đọc/ghi.
- Gating private trong code dùng cờ `isAdmin`; đã có sẵn `isEditor = role==="editor" || isAdmin` trong `UserProvider.tsx` và `is_editor()` trong DB.
- Editor đã có RLS CRUD trên `persons` + `relationships` (migration `20260320230020`); Editor giữ quyền xóa.

## Thiết kế
**Nguyên tắc**: thay cờ gating private từ `isAdmin` → cờ bao gồm editor (`canEditPrivate`), mở RLS tương ứng. Prop `isAdmin` trong `MemberForm` đổi tên thành `canEditPrivate` để phản ánh đúng ngữ nghĩa.

### A. RLS
Migration `supabase/migrations/20260605104610_editor_private_details.sql`:
- Drop & recreate policy SELECT và ALL trên `person_details_private`: `public.is_admin() OR public.is_editor()`.
- `docs/schema.sql` cập nhật tương ứng.

### B. UI gating
| File | Thay đổi |
|---|---|
| `components/MemberForm.tsx` | Prop `isAdmin` → `canEditPrivate`; badge "Chỉ Admin" → "Admin & Biên tập" |
| `app/dashboard/members/new/page.tsx` | Truyền `canEditPrivate={canEdit}` |
| `app/dashboard/members/[id]/edit/page.tsx` | Fetch + initialData + prop dùng `canEditPrivate` |
| `app/dashboard/members/[id]/page.tsx` | Fetch private dùng `canEdit`; truyền `isAdmin={canEdit}` xuống `MemberDetailContent` |
| `components/modal/MemberDetailModal.tsx` | Bỏ `isAdmin` khỏi destructuring; fetch + deps + props dùng `canEdit` |

### C. Hiển thị
| File | Thay đổi |
|---|---|
| `app/dashboard/users/page.tsx` | Legend 3 card: wording rõ hơn, Viewer card thay Member |
| `components/AdminUserList.tsx` | Badge `member`→"Viewer"; 2 dropdown option text |

## Verification
- [ ] `supabase db push` lên production
- [ ] Đăng nhập Editor: thấy section "Thông tin riêng tư" (badge "Admin & Biên tập"), nhập + lưu thành công
- [ ] Đăng nhập Viewer: không thấy private, không sửa được
- [ ] Admin: `/dashboard/users` → legend đúng text mới, card "Viewer / Người xem"

## Progress log
- 2026-06-05: Lập plan và implement xong. Migration applied local. 0 lint errors. Chờ `supabase db push` lên production.
