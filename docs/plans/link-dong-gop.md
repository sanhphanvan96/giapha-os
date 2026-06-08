# Plan: Link đóng góp thông tin gia phả (có kiểm duyệt)

> **Trạng thái:** 🟢 Đang làm  
> **Nhánh:** `feat/link-dong-gop`  
> **Tạo:** 2026-06-07

---

## Context

Admin tạo link token gửi cho người thân. Người nhận mở `/donggop/{token}` (không cần đăng nhập) → bổ sung/sửa thông tin những người trong phạm vi cho phép + thêm người mới → gửi → vào bảng `contributions` (status=pending). Admin vào `/dashboard/contributions` xem diff → Duyệt (ghi DB) hoặc Từ chối.

Mục tiêu: huy động họ hàng làm giàu dữ liệu gia phả mà vẫn an toàn (đầu vào ẩn danh không tự động ghi `persons`).

---

## Design decisions

1. **Ẩn danh qua token, an toàn nhờ kiểm duyệt.** Token hết hạn + thu hồi được. Form bắt nhập tên người đóng góp.
2. **Tái dùng pattern share.** Token format `giapha-contrib-{random}`, tương tự `createShareLink` và RPC `get_shared_family_tree`.
3. **Ghi vào bảng đề xuất, KHÔNG đụng `persons`.** Chỉ RPC admin mới áp payload vào DB thật.
4. **Guard scope phía server.** RPC `submit_contribution` validate mọi `person_id` trong payload ∈ `scope_person_ids`.
5. **Admin-check trong mọi RPC quản lý** — `RAISE EXCEPTION 'Access denied.'` nếu không phải admin.
6. **Phase 1 = sửa người có sẵn. Phase 2 = thêm người mới.** Cả 2 trong plan này, code theo thứ tự.

---

## Architecture

```
Admin (Sharing page)
  └─ createContributionLink(scope[], allowEdit, allowAdd, note, expiryDays)
        → RPC admin_create_contribution_link → token
        → URL /donggop/{token} + copy + thu hồi

Người thân  GET /donggop/{token}  (không login)
  └─ server fetch: RPC get_contribution_context(token)
        → {persons trong scope (slice public), allow_edit, allow_add}
  └─ ContributeForm: sửa field / thêm người + nhập tên đóng góp → Gửi
        → Server Action submitContribution
        → RPC submit_contribution (validate token + guard scope)
        → INSERT contributions (status=pending)
  └─ Màn cảm ơn

Admin  /dashboard/contributions
  └─ getPendingContributions() → list + diff
  └─ approveContribution(id)  → RPC apply payload → persons updated / person inserted + relationship
     rejectContribution(id)   → status=rejected
  └─ Badge số pending ở HeaderMenu
```

---

## Data model (migration mới)

### `contribution_links`

| cột | kiểu | ghi chú |
|---|---|---|
| id | uuid pk | gen_random_uuid() |
| token | text unique not null | giapha-contrib-… |
| scope_person_ids | uuid[] not null default '{}' | danh sách id đã expand |
| allow_edit | boolean default true | cho sửa người có sẵn |
| allow_add | boolean default true | cho thêm người mới |
| note | text | ghi chú admin |
| created_by | uuid references auth.users | |
| expires_at | timestamptz | |
| revoked | boolean default false | |
| created_at | timestamptz default now() | |

### `contributions`

| cột | kiểu | ghi chú |
|---|---|---|
| id | uuid pk | |
| link_id | uuid → contribution_links on delete cascade | |
| contributor_name | text not null | bắt buộc nhập |
| contributor_note | text | quan hệ / ghi chú thêm |
| payload | jsonb not null | `{ edits:[{person_id, fields:{}}], new_persons:[{tempId, fields:{}, parent_person_id, relation_type}] }` |
| status | text default 'pending' | check in ('pending','approved','rejected') |
| reviewed_by | uuid references auth.users | nullable |
| reviewed_at | timestamptz | nullable |
| review_note | text | nullable |
| created_at | timestamptz default now() | |

RLS: bật trên cả 2 bảng; deny ghi trực tiếp từ client. Chỉ RPC `SECURITY DEFINER` được phép.

---

## API signatures

### RPC (Postgres)

```sql
-- Tạo link (admin)
admin_create_contribution_link(
  p_scope uuid[], p_allow_edit bool, p_allow_add bool,
  p_note text, p_expiry_days int
) RETURNS text  -- token

-- Đọc context (public, anon)
get_contribution_context(p_token text) RETURNS jsonb
-- {valid: bool, expired: bool, allow_edit, allow_add,
--  persons: [{id, full_name, gender, birth_year, ...}]}

-- Submit (public, anon)
submit_contribution(
  p_token text, p_name text, p_note text, p_payload jsonb
) RETURNS uuid  -- contribution.id

-- Lấy danh sách pending (admin)
get_pending_contributions() RETURNS TABLE(...)

-- Duyệt (admin)
approve_contribution(p_id uuid, p_review_note text) RETURNS void

-- Từ chối (admin)
reject_contribution(p_id uuid, p_review_note text) RETURNS void

-- Lấy danh sách link (admin)
get_contribution_links() RETURNS TABLE(...)

-- Thu hồi link (admin)
revoke_contribution_link(p_token text) RETURNS void
```

### Server actions — `app/actions/contribution.ts`

```ts
createContributionLink(scope: string[], allowEdit: boolean, allowAdd: boolean, note: string, expiryDays: number): Promise<{success?: true; token?: string; error?: string}>
getContributionLinks(): Promise<ContributionLink[]>
revokeContributionLink(token: string): Promise<{success?: true; error?: string}>
submitContribution(token: string, name: string, note: string, payload: ContributionPayload): Promise<{success?: true; error?: string}>
getPendingContributions(): Promise<PendingContribution[]>
approveContribution(id: string, reviewNote?: string): Promise<{success?: true; error?: string}>
rejectContribution(id: string, reviewNote?: string): Promise<{success?: true; error?: string}>
```

### Types — `types/index.ts`

```ts
interface ContributionPayload {
  edits: Array<{ person_id: string; fields: Partial<Person> }>;
  new_persons: Array<{
    tempId: string;
    fields: Partial<Person>;
    parent_person_id: string;
    relation_type: "biological_child" | "adopted_child";
  }>;
}
interface ContributionLink { id: string; token: string; scope_person_ids: string[]; allow_edit: boolean; allow_add: boolean; note: string | null; expires_at: string; revoked: boolean; created_at: string; }
interface PendingContribution { id: string; link_id: string; contributor_name: string; contributor_note: string | null; payload: ContributionPayload; status: string; created_at: string; persons_snapshot: Person[]; }
```

---

## Files cần thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/<ts>_contribution_links.sql` | **Mới.** 2 bảng + RLS + 8 RPC |
| `docs/schema.sql` | Đồng bộ 2 bảng + RPC |
| `types/index.ts` | 3 type mới |
| `app/actions/contribution.ts` | **Mới.** 7 server action |
| `app/donggop/[token]/page.tsx` | **Mới.** Public page (mẫu: `app/chiase/[token]/page.tsx`) |
| `components/ContributeForm.tsx` | **Mới.** Form sửa + thêm người (field từ MemberForm, PersonSelector cho scope) |
| `app/dashboard/contributions/page.tsx` | **Mới.** Admin-only duyệt đề xuất |
| `components/ContributionReview.tsx` | **Mới.** List pending + diff + Duyệt/Từ chối |
| `app/dashboard/sharing/page.tsx` | Thêm section tạo + quản lý link đóng góp |
| `components/HeaderMenu.tsx` | Badge số pending cho admin |

---

## Tái dùng

- `app/actions/share.ts` → pattern token, RPC SECURITY DEFINER
- `app/chiase/[token]/page.tsx` → public route shape
- `components/MemberForm.tsx` → field layout
- `components/PersonSelector.tsx` → chọn người trong scope
- `utils/treeHelpers.ts:buildAdjacencyLists()` → expand nhánh thành danh sách id
- `app/dashboard/users/page.tsx` → admin-only guard

---

## Security

- Token = capability. Không expose `persons` trực tiếp, chỉ slice public qua RPC.
- `submit_contribution` guard scope server-side: payload đụng người ngoài scope → reject.
- create/approve/reject/list = admin-checked trong RPC.
- Ghi vào DB thật chỉ khi admin duyệt — input ẩn danh không tự ghi `persons`.
- RLS deny ghi trực tiếp 2 bảng.

---

## Verification

```bash
bun run lint
bun test                # guard scope logic, payload mapping
bun run test            # ContributeForm, ContributionReview (RTL)
bun run build
supabase migration up   # local only
```

Manual browser:
- [ ] Admin tạo link scope = vài người → nhận URL `/donggop/{token}`
- [ ] Mở link ẩn danh → thấy đúng người trong scope, không thấy người ngoài
- [ ] Sửa 1 field + nhập tên đóng góp → Gửi → màn cảm ơn
- [ ] `persons` chưa đổi (chỉ contributions pending)
- [ ] (allow_add) Thêm 1 người con → Gửi → pending
- [ ] Admin `/dashboard/contributions` → thấy diff → Duyệt → `persons` cập nhật + person mới + relationship đúng
- [ ] Từ chối → không ghi gì
- [ ] Token hết hạn / revoked → link báo lỗi, submit bị từ chối
- [ ] Payload đụng người ngoài scope thủ công → RPC từ chối
- [ ] Non-admin gọi approve → Access denied
- [ ] Badge pending đúng ở HeaderMenu

---

## Progress log

- 2026-06-07 — Tạo plan. Tạo nhánh `feat/link-dong-gop`. Sync roadmap (002 ✅, 001 đang làm).
- [x] Migration xong (`20260607100000_contribution_links.sql`)
- [x] Types xong (`types/index.ts`)
- [x] Actions xong (`app/actions/contribution.ts`)
- [x] Public page xong (`app/donggop/[token]/page.tsx`)
- [x] ContributeForm xong (`components/ContributeForm.tsx`)
- [x] Admin page xong (`app/dashboard/contributions/page.tsx`)
- [x] ContributionReview xong (`components/ContributionReview.tsx`)
- [x] ContributionLinkManager tích hợp vào trang Sharing
- [x] HeaderMenu: thêm link "Duyệt đề xuất" cho admin
- [x] Tests logic pass (11/11 — `utils/contributionHelpers.test.ts`)
- [x] `supabase migration up` local OK (2026-06-07)
- [x] `bun run build` pass — không lỗi TypeScript
