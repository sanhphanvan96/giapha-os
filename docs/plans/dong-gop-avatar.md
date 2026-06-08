# Plan: Upload avatar tùy chọn trong form đóng góp

## Context

Form đóng góp (`/donggop/<token>`) cho người chưa login đề xuất sửa/thêm thành viên. Hiện chưa có cách gửi ảnh đại diện. Cần thêm upload avatar **tùy chọn** (ghi rõ "không bắt buộc").

**Ràng buộc cốt lõi:** không cho anon ghi thẳng vào Supabase Storage (tránh lạm dụng).

**Giải pháp:** ảnh đi qua host bên thứ ba tạm thời (**litterbox** — không cần API key, 72h); URL tạm lưu trong `contributions.payload`. Khi admin duyệt, app (session admin) kéo ảnh về bucket `avatars` rồi set `persons.avatar_url`.

## Design decisions

- **Host chọn litterbox** vì không cần API key, auto-expire 72h phù hợp ảnh tạm, upload qua server-proxy để né CORS.
- **Vì sao không base64 trong payload:** phình JSONB. URL gọn hơn.
- **Vì sao kéo về bucket khi duyệt:** litterbox là hobby service, ảnh hết hạn → phải copy sang `avatars` để vĩnh viễn.
- **avatar_temp_url là field top-level** trên `ContributionEdit` / `ContributionNewPerson`, KHÔNG trong `fields` (để tách biệt data vs media).
- **approve_contribution** đổi từ `RETURNS VOID` → `RETURNS JSONB { new_person_ids: { tempId: uuid } }` để action biết uuid của người mới vừa tạo mà upload avatar.
- **Best-effort:** avatar fail không block approve. Data người/quan hệ luôn được áp.

## Kiến trúc / luồng

```
[ContributeForm]
  user chọn ảnh
  → compressImage (512×512, webp, q0.7)
  → đổi File → dataUrl
  → uploadContributionImage(dataUrl)  [server action → litterbox]
  → nhận URL
  → edit.avatar_temp_url = URL
  → hiện preview

[Submit]
  payload = { edits: [..., avatar_temp_url], new_persons: [..., avatar_temp_url] }
  → submit_contribution RPC lưu nguyên (JSONB)

[ContributionReview admin]
  hiện <img src={avatar_temp_url}> trong card

[Approve admin]
  approveContribution action:
  1. đọc payload từ contributions table
  2. gọi RPC approve_contribution → trả { new_person_ids: { tempId: uuid } }
  3. với mỗi edit/new_person có avatar_temp_url:
     fetch(url) → upload bucket avatars → set persons.avatar_url
  4. revalidatePath
```

## Files changed

| File | Thay đổi |
|---|---|
| `types/index.ts` | + `avatar_temp_url?: string \| null` trên `ContributionEdit` & `ContributionNewPerson` |
| `app/actions/contribution.ts` | + `uploadContributionImage(dataUrl)`, sửa `approveContribution` kéo ảnh + helper `copyAvatarFromTemp` |
| `components/ContributeForm.tsx` | + component `AvatarUploadField`; tích hợp vào `EditPersonPanel` & `NewPersonPanel`; filter edit khi có avatar_temp_url |
| `components/ContributionReview.tsx` | preview `<img>` trong edit/new_person card; setters `setEditAvatarUrl`/`setNewPersonAvatarUrl`; ẩn edit với cả chỉ có avatar |
| `supabase/migrations/20260608120000_contribution_approve_return_ids.sql` | `approve_contribution` → `RETURNS JSONB` + collect `v_map` |
| `docs/plans/dong-gop-avatar.md` | file này |

## Verification

```bash
supabase migration up
bun run lint
bun run build
```

Manual checklist:
- [ ] Admin tạo link đóng góp (allow_edit + allow_add)
- [ ] Mở `/donggop/<token>` — panel sửa: chọn ảnh → loading → preview
- [ ] Panel thêm người mới: upload ảnh → preview; nút xóa hoạt động
- [ ] Label "tùy chọn — không bắt buộc" hiển thị
- [ ] Submit thành công khi KHÔNG upload ảnh
- [ ] Submit thành công khi upload ảnh (edits + new_persons)
- [ ] `/dashboard/contributions` hiện preview ảnh trong cả 2 loại card
- [ ] Duyệt → `persons.avatar_url` được set, file trong bucket `avatars`
- [ ] Approve không lỗi khi không có ảnh
- [ ] Approve vẫn thành công khi kéo ảnh thất bại (best-effort)

## Progress log

- 2026-06-08: Lập plan, viết code. Host=litterbox (no key, 72h), copy về bucket khi duyệt, cả 2 panel.
