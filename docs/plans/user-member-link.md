# Gắn user ↔ member ("Đây là tôi") + auto view-as + Trang Hồ sơ của tôi

## Bối cảnh

Hiện tại tài khoản đăng nhập không có liên kết nào với người (`persons`) mà họ
đại diện trong cây gia phả. Mục tiêu:

1. Người dùng đăng nhập có thể đánh dấu một thành viên là **"Đây là tôi"** → gắn
   tài khoản của họ với dòng `persons` đó.
2. **Admin** có thể gán bất kỳ user nào với một thành viên từ trang quản lý người dùng.
3. Khi user đã gắn mở trang members **ở chế độ tree** mà URL chưa có `viewAs`,
   thành viên đó được tự động chọn làm ego cho "Xem với tư cách là".
4. Một trang **"Hồ sơ của tôi"** riêng cho phép user tự gắn member **và** chỉnh sửa
   tài khoản của chính mình: avatar, email, mật khẩu.

Quyết định đã chốt với người dùng:
- UI tự gắn ("Đây là tôi") đặt ở **cả** modal chi tiết thành viên **và** trang hồ sơ riêng.
- Một member có thể được gắn bởi **nhiều user** → **không** ràng buộc unique.
- Auto view-as **chỉ áp dụng cho view tree**.
- **Đổi email KHÔNG cần xác thực email** (làm đơn giản).

## Quyết định thiết kế

- **Cột mới** `profiles.person_id UUID` (nullable, `REFERENCES persons(id) ON DELETE SET NULL`), **không** unique. Có index để tra cứu.
- **Gắn member đi qua RPC `SECURITY DEFINER`** (đồng bộ với toàn bộ thao tác ghi profiles hiện có trong `app/actions/user.ts`): một RPC tự gắn và một RPC cho admin. Đảm bảo ghi thành công bất kể RLS / column policy của `profiles`.
- **Avatar / email / mật khẩu** ở trang hồ sơ:
  - Avatar: upload vào bucket **`avatars`** đang có (tái dùng pattern inline trong `MemberForm.tsx:459-485`), rồi lưu `profiles.avatar_url` qua server action dùng session của user — `app/dashboard/layout.tsx:25-31` đã cập nhật `avatar_url` của chính profile theo cách này nên đã được chứng minh là chạy được.
  - Mật khẩu: client gọi `supabase.auth.updateUser({ password })` qua browser client (`@/utils/supabase/client`).
  - **Email (không xác thực):** mặc định `supabase.auth.updateUser({ email })` của Supabase sẽ gửi mail xác nhận. Để **không cần xác thực**, cần tắt "Secure email change" / email confirmations trong cấu hình Auth của project Supabase (Dashboard → Authentication → Email). Code vẫn gọi `updateUser({ email })`; khi confirmation đã tắt thì email đổi ngay không cần bấm link. → ghi chú rõ trong phần Verification.
- **Đồng bộ schema bị lệch:** migration cũng thêm `avatar_url text` vào `profiles` với `IF NOT EXISTS` — cột này đang được dùng/ghi lúc runtime nhưng thiếu trong `docs/schema.sql` và migrations.
- Auto view-as đi qua **prop `initialViewAsPersonId`** trên `MemberListProvider`, chỉ áp dụng khi view hiệu lực là `tree` và URL chưa có `viewAs`.

## Bảo mật (yêu cầu: A không được sửa dữ liệu của B)

Nguyên tắc thiết kế để **cross-user là không thể về mặt cấu trúc**:

- **Mật khẩu & email** đổi qua `supabase.auth.updateUser({ password / email })` — hàm này **luôn** tác động lên user đang đăng nhập (`auth.uid()`) và **không nhận tham số userId**. A không có cách nào nhắm tới B.
- **`linkMyPerson` / `updateMyAvatar`** (self-action) **không nhận userId**. RPC `set_my_person` và phần update avatar đều khóa cứng vào `auth.uid()` / `getUser()` phía server. Client không gửi user id.
- **`adminSetUserPerson`** là action duy nhất nhận `userId`. RPC `admin_set_user_person` **bắt buộc kiểm tra admin** (`IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN RAISE EXCEPTION 'Access denied.'`), giống pattern `set_user_role`/`delete_user` hiện có. Non-admin gọi sẽ bị từ chối ở tầng Postgres.
- **Trang `/dashboard/profile`** chỉ thao tác trên session hiện tại; không có input nào nhận userId của người khác.

→ Kiểm chứng bằng **unit test mock client** (xác nhận self-action không gửi user id, admin-action có gửi và đi qua RPC admin-checked) + **checklist thủ công** xác minh tại runtime.

## Kiến trúc / luồng dữ liệu

- **Tự gắn:** nút trong modal/trang hồ sơ → server action (`linkMyPerson`) → RPC `set_my_person` cập nhật `profiles.person_id` cho `auth.uid()` → `router.refresh()` chạy lại dashboard layout để `UserProvider` nhận profile mới.
- **Admin gắn:** trang users → picker trong dòng `AdminUserList` → server action (`adminSetUserPerson`) → RPC `admin_set_user_person` (kiểm tra admin) → `revalidatePath("/dashboard/users")`.
- **Auto view-as:** `app/dashboard/members/page.tsx` đã gọi `getProfile()` → truyền `profile?.person_id` làm `initialViewAsPersonId` cho `MemberListProvider`. Provider khởi tạo `viewAsPersonId` từ prop này khi view là `tree` và không có param `viewAs`, rồi ghi vào URL lúc mount để effect `syncFromURL` hiện có (`MemberListContext.tsx:88-110`) không ghi đè mất.

## Các file cần thay đổi

| File | Thay đổi |
|------|----------|
| `docs/migrations/<ts>_add_profile_person_link.sql` | **Mới.** `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES persons(id) ON DELETE SET NULL` + index; `ADD COLUMN IF NOT EXISTS avatar_url text`; tạo RPC `set_my_person`, `admin_set_user_person`; định nghĩa lại `get_admin_users` trả thêm `person_id`, `person_full_name`; sửa type `admin_user_data` tương ứng |
| `docs/schema.sql` | Thêm `person_id` (+ `avatar_url`) vào CREATE TABLE `profiles`; cập nhật type `admin_user_data` & thân `get_admin_users` cho khớp migration (giữ schema chuẩn đồng bộ) |
| `types/index.ts` | `Profile` += `person_id: string \| null`; `AdminUserData` += `person_id: string \| null`, `person_full_name: string \| null` |
| `app/actions/user.ts` | Action mới: `linkMyPerson(personId: string \| null)` (RPC `set_my_person`), `adminSetUserPerson(userId, personId \| null)` (RPC `admin_set_user_person`), `updateMyAvatar(avatarUrl: string \| null)` (ghi trực tiếp `.update` lên profile của chính mình) |
| `context/MemberListContext.tsx` | Thêm prop `initialViewAsPersonId?: string \| null`; khởi tạo `viewAsPersonId` từ prop khi view hiệu lực là `tree` & không có param `viewAs`; effect lúc mount ghi vào URL để vượt qua `syncFromURL` |
| `app/dashboard/members/page.tsx` | Truyền `initialViewAsPersonId={profile?.person_id ?? null}` cho `MemberListProvider` |
| `components/modal/MemberDetailModal.tsx` | Thêm nút **"Đây là tôi"** (dùng `useUser().profile.person_id`); gọi `linkMyPerson`; hiện "Bỏ liên kết" khi đã gắn với người này; `router.refresh()` sau khi xong |
| `app/dashboard/users/page.tsx` | Fetch `persons` (`id, full_name`); truyền cho `AdminUserList`; dòng `AdminUserData` nay có thông tin người đã gắn |
| `components/AdminUserList.tsx` | Cột mới **"Thành viên"**: hiện tên người đã gắn + `PersonSelector` (tái dùng `components/PersonSelector.tsx`) để gán/xóa qua `adminSetUserPerson` |
| `app/dashboard/profile/page.tsx` | **Mới** server component: load user, profile, danh sách persons, người đã gắn → render form hồ sơ |
| `components/ProfileForm.tsx` (hoặc `app/dashboard/profile/ProfileForm.tsx`) | **Mới** client form: upload avatar (`avatars` bucket → `updateMyAvatar`), `PersonSelector` tự gắn (`linkMyPerson`), đổi email & mật khẩu (`supabase.auth.updateUser`) |
| `components/HeaderMenu.tsx` | Thêm link **"Hồ sơ của tôi"** tới `/dashboard/profile` trong dropdown avatar |
| `app/actions/user.security.test.ts` | **Mới** unit test (`bun:test`) mock `getSupabase`/`getUser`, xác nhận các bất biến bảo mật (xem mục Test bảo mật) |

## Chữ ký API

```ts
// app/actions/user.ts
export async function linkMyPerson(personId: string | null): Promise<{ error: string } | { success: true }>;
export async function adminSetUserPerson(userId: string, personId: string | null): Promise<{ error: string } | { success: true }>;
export async function updateMyAvatar(avatarUrl: string | null): Promise<{ error: string } | { success: true }>;
```

```sql
-- RPC (SECURITY DEFINER)
CREATE FUNCTION set_my_person(target_person_id uuid) RETURNS void ...      -- cập nhật profiles where id = auth.uid()
CREATE FUNCTION admin_set_user_person(target_user_id uuid, target_person_id uuid) RETURNS void ...  -- kiểm tra admin rồi cập nhật
-- get_admin_users nay trả: id, email, role, created_at, is_active, person_id, person_full_name
```

```ts
// context/MemberListContext.tsx — prop mới
MemberListProvider({ ..., initialViewAsPersonId }: { ...; initialViewAsPersonId?: string | null })
```

```ts
// types/index.ts
interface Profile { ...; person_id: string | null; avatar_url: string | null }
interface AdminUserData { ...; person_id: string | null; person_full_name: string | null }
```

## Ghi chú triển khai

- **Nhiều user / một member:** không ràng buộc unique; danh sách admin có thể hiện cùng một người ở nhiều dòng — chấp nhận theo quyết định.
- **Chống ghi đè auto view-as:** trong `MemberListContext`, `syncFromURL` hiện chạy lúc mount và set `viewAsPersonId` theo URL (null nếu thiếu). Để auto-default "dính": khởi tạo state từ `initialViewAsPersonId` (chỉ khi tree + không có `viewAs`) **và** thêm effect chạy một lần lúc mount gọi `setViewAsPersonId(initialViewAsPersonId)` khi `view === "tree"` và URL thiếu `viewAs` — việc này ghi `viewAs` vào URL (qua `replaceState` có sẵn), nên các lần `syncFromURL` sau đọc lại nhất quán. Nếu user tự xóa view-as thì param bị bỏ và **không** tự bật lại.
- **Đổi mật khẩu:** `supabase.auth.updateUser` không xác minh mật khẩu cũ; giữ luồng đơn giản nhưng yêu cầu nhập lại mật khẩu 2 lần (confirm) ở client.
- **Đổi email không xác thực:** cần tắt email confirmations trong cấu hình Supabase Auth (xem phần Quyết định thiết kế). Nếu chưa tắt, Supabase vẫn gửi mail xác nhận.
- **Avatar bucket:** tái dùng bucket `avatars` với key riêng, vd `profile_${userId}.${ext}`, `upsert: true`, thêm `?t=${Date.now()}` chống cache (giống `MemberForm.tsx:473-477`).
- **Không thực hiện thao tác git** trừ khi người dùng yêu cầu.
- Khi bắt đầu code: copy plan này vào `docs/plans/<feature-slug>.md` theo quy ước trong CLAUDE.md.

## Test bảo mật (`app/actions/user.security.test.ts`)

Unit test với `bun:test`, mock `@/utils/supabase/queries` (`getSupabase` trả fake
client ghi lại các lời gọi `.rpc()` / `.from().update().eq()`; `getUser` trả 1 user
giả với id cố định). Các case:

- **`linkMyPerson` không gửi user id:** gọi `linkMyPerson("p1")` → fake client nhận `rpc("set_my_person", { target_person_id: "p1" })`; payload **không chứa** bất kỳ trường userId nào → chứng minh chỉ dựa vào `auth.uid()` phía server.
- **Bất biến chữ ký self-action:** `expect(linkMyPerson.length).toBe(1)` và `updateMyAvatar.length === 1` — self-action không nhận userId. `expect(adminSetUserPerson.length).toBe(2)` — chỉ action admin mới có userId.
- **`updateMyAvatar` chỉ ghi own row:** gọi → fake client ghi `from("profiles").update(...).eq("id", <id từ getUser>)`; id dùng để filter lấy từ `getUser()` chứ **không** từ tham số.
- **`adminSetUserPerson` đi qua RPC admin-checked:** gọi `adminSetUserPerson("userB", "p1")` → `rpc("admin_set_user_person", { target_user_id: "userB", target_person_id: "p1" })`; và khi fake RPC trả lỗi `'Access denied.'` (mô phỏng non-admin) thì action trả `{ error: ... }` chứ không nuốt lỗi.
- **Truyền `null` để bỏ liên kết:** `linkMyPerson(null)` / `adminSetUserPerson("userB", null)` gọi RPC với `target_person_id: null` (xóa gắn).

> Lưu ý: unit test mock không thay thế được enforcement thật ở Postgres (auth.uid()
> + admin check trong RPC `SECURITY DEFINER`). Đó vẫn là tầng bảo mật chính; test
> chỉ chốt cứng hợp đồng phía server-action và checklist thủ công xác minh runtime.

## Verification (kiểm thử)

Lệnh:
- `bun test` (chạy `app/actions/user.security.test.ts` + test hiện có)
- `bun run lint`
- `bun run build` (hoặc Serena `get_diagnostics_for_file` cho từng file `.tsx`/`.ts` đã sửa)
- Áp dụng migration lên project Supabase trước khi test thủ công.
- Tắt email confirmations trong Supabase Auth để test đổi email không cần xác thực.

Checklist bảo mật thủ công (đăng nhập 2 tài khoản A non-admin & B):
- [ ] Trên thiết bị của A, không có UI/endpoint nào nhận userId của B; A đổi mật khẩu/email chỉ ảnh hưởng chính A (đăng nhập lại của B không đổi).
- [ ] A (non-admin) không vào được `/dashboard/users` (redirect `/dashboard`).
- [ ] Gọi thử `adminSetUserPerson` từ phiên của A (vd qua devtools) → trả `Access denied.`, `profiles.person_id` của B **không** đổi.
- [ ] A tự gắn/bỏ gắn member chỉ thay đổi `profiles.person_id` của A.

Checklist thủ công trên trình duyệt:
- [ ] Modal chi tiết thành viên hiện **"Đây là tôi"**; bấm là gắn tài khoản; nút đổi thành "Bỏ liên kết"; bỏ liên kết chạy được.
- [ ] Với user role **member** (chỉ đọc), tự gắn/bỏ gắn vẫn hoạt động.
- [ ] Mở `/dashboard/members?view=tree` khi đã gắn & URL chưa có `viewAs` → người đã gắn tự thành ego (danh xưng tính theo họ); URL có thêm `viewAs=<id>`.
- [ ] Ở tree view, tắt view-as ("Tắt danh xưng") thì bỏ ego và **không** tự bật lại.
- [ ] Ở view `mindmap`/`bubble`/`list` khi chưa có `viewAs`, **không** auto ego (chỉ tree).
- [ ] Admin `/dashboard/users`: gán member cho user qua cột mới; hiện tên đã gắn; xóa gắn được; non-admin không vào được trang.
- [ ] `/dashboard/profile`: đổi avatar (lưu được + dropdown header cập nhật), tự gắn member, đổi email (đổi ngay không cần xác thực khi đã tắt confirmation), đổi mật khẩu (đăng nhập lại bằng mật khẩu mới).
- [ ] Link "Hồ sơ của tôi" xuất hiện trong dropdown avatar và điều hướng đúng.

## Nhật ký tiến độ

- 2026-06-05 — Tạo plan. Chốt: cả 2 vị trí self-link, nhiều user/1 member, auto view-as chỉ tree, trang hồ sơ chỉnh sửa avatar/email/mật khẩu, đổi email không cần xác thực, thêm unit test bảo mật + checklist (A không sửa được B). Chưa code.
