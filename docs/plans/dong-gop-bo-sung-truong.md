# Bổ sung trường thông tin cho trang đóng góp gia phả (/donggop/[token])

## Context

Trang đóng góp công khai (`/donggop/[token]`, không cần login) hiện thu **ít trường hơn nhiều** so với form quản trị `MemberForm.tsx`. Người trong họ vào góp thông tin nhưng không nhập được những thứ quan trọng:

- **Ngày sinh trên giấy tờ** (`legal_birth_*`) — thiếu hoàn toàn
- **Ngày mất dương lịch** (`death_year/month/day`) — chỉ có ngày mất âm, không có dương
- **Ngày giỗ khác ngày mất** (`anniversary_lunar_*`) — type cho `edits` đã khai báo nhưng **không có UI**; `new_persons` thì type cũng thiếu
- **Số điện thoại** (`phone_number`) — thiếu hoàn toàn (nằm ở bảng `person_details_private`)
- **Tự suy âm↔dương** — form đóng góp dùng `NumberInput` thuần, **không** auto-convert như `MemberForm` (gây lệch dữ liệu âm/dương)
- `NewPersonPanel` còn thiếu cả **ngày sinh âm** (`birth_lunar_*`) dù type đã có

Đồng thời rà lại trường nào cần: **bỏ qua** nghề nghiệp (`occupation`), nơi ở (`current_residence`), Thuộc đời thứ (`generation`), Thứ tự sinh (`birth_order`) — các trường này vốn đã không có trong form đóng góp, giữ nguyên là không thêm. Cũng **bỏ** `birthday_remind_type` (chọn kiểu nhắc sinh nhật) — quá nâng cao cho người góp; admin tự chỉnh khi duyệt.

Mục tiêu: form đóng góp thu đủ ngày tháng (âm/dương/giấy tờ/giỗ) + số điện thoại, có auto-convert âm↔dương, và luồng duyệt ghi đúng vào `persons` + `person_details_private`.

## Design decisions

- **Auto-convert dùng lại logic của `MemberForm`**: tách 2 helper thuần vào `utils/dateHelpers.ts` (`solarToLunarParts`, `lunarToSolarParts`) bọc `Solar`/`Lunar` của `lunar-javascript`. `MemberForm` có thể refactor dùng sau, nhưng phạm vi lần này chỉ thêm helper + dùng ở form đóng góp.
- **Số điện thoại không prefill trong edit panel**: `get_contribution_context` cố tình **không** trả `phone_number` của người có sẵn (đã xác nhận — không lộ riêng tư). Ô điện thoại luôn để trống, người góp tự nhập. Admin duyệt mới ghi vào `person_details_private`.
- **Ngày giỗ / ngày sinh giấy tờ** ẩn sau checkbox như `MemberForm` (`hasDifferentAnniversary`, `hasDifferentLegalBirth`) để form gọn, không rối người dùng phổ thông.
- **Không thêm `birthday_remind_type`** vào đóng góp — admin set khi duyệt nếu cần.
- Luồng duyệt vẫn admin-review trước khi áp; phone đi qua `payload` JSONB (bảng `contributions`, RLS admin-only) nên an toàn dù form công khai.

## Files to change

| File | Thay đổi |
|---|---|
| `types/index.ts` | `ContributionEdit.fields`: thêm `legal_birth_year/month/day`, `phone_number`. `ContributionNewPerson.fields`: thêm `legal_birth_*`, `anniversary_lunar_*`, `phone_number` |
| `utils/dateHelpers.ts` | Thêm `solarToLunarParts(y,m,d)` và `lunarToSolarParts(y,m,d)` trả `{year,month,day}\|null` |
| `components/ContributeForm.tsx` | Rewrite cả `EditPersonPanel` và `NewPersonPanel`: auto-convert âm↔dương, ngày mất dương, ngày sinh giấy tờ (checkbox), ngày giỗ (checkbox), số điện thoại. `NewPersonPanel` thêm ngày sinh âm |
| `supabase/migrations/20260608041949_contribution_phone_legal_anniversary.sql` | `approve_contribution` DROP+CREATE: ghi `legal_birth_*`, `anniversary_lunar_*` vào `persons`; upsert `phone_number` vào `person_details_private` |

## Solution approach

### 1. Helper convert (utils/dateHelpers.ts)
```ts
export function solarToLunarParts(y, m, d): {year,month,day} | null  // Solar.fromYmd → getLunar, month = Math.abs(...)
export function lunarToSolarParts(y, m, d): {year,month,day} | null  // Lunar.fromYmd → getSolar
```
Trả `null` nếu year ≤ 100 hoặc convert lỗi.

### 2. ContributeForm — auto-convert
Mỗi panel dùng `patch(partial)` thay vì `set(key, v)` lẻ. Khi nhập đủ 3 ô dương → auto-fill âm (và ngược lại) cho cả ngày sinh lẫn ngày mất. `EditPersonPanel` fallback từ `f.* ?? person.*`; `NewPersonPanel` chỉ từ `f.*`.

### 3. UI mỗi panel (theo thứ tự MemberForm)
- Ngày sinh dương ↔ âm — auto-convert
- Checkbox "Khác ngày sinh trên giấy tờ" → 3 ô `legal_birth_*`
- Số điện thoại
- Checkbox "Đã mất" → ngày mất âm + dương (auto-convert) → checkbox "Ngày giỗ khác ngày mất" → 3 ô `anniversary_lunar_*`
- Avatar, Ghi chú

### 4. Migration approve_contribution
- Edit UPDATE: thêm `legal_birth_*`; sau UPDATE upsert `person_details_private.phone_number` nếu có
- New INSERT: thêm cột `legal_birth_*`, `anniversary_lunar_*`; sau INSERT upsert phone tương tự

## API signatures

```ts
// utils/dateHelpers.ts
export function solarToLunarParts(year: number, month: number, day: number): { year: number; month: number; day: number } | null;
export function lunarToSolarParts(year: number, month: number, day: number): { year: number; month: number; day: number } | null;
```

```sql
-- Chữ ký giữ nguyên: approve_contribution(p_id UUID, p_review_note TEXT) RETURNS JSONB
```

## Verification

```bash
bun run lint
bunx tsc --noEmit
supabase migration up --include-all
```

Manual (chạy `bun run dev`, mở link đóng góp từ `/dashboard` → quản lý link góp):
- [ ] Edit panel: nhập ngày sinh dương → ô âm tự điền (và ngược lại)
- [ ] Nhập ngày mất dương → âm tự điền (và ngược lại)
- [ ] Checkbox "Khác ngày sinh trên giấy tờ" hiện 3 ô, lưu được
- [ ] Checkbox "Ngày giỗ khác ngày mất" hiện 3 ô âm, lưu được
- [ ] Nhập số điện thoại, gửi đề xuất thành công
- [ ] New person panel: có đủ sinh âm/dương, giấy tờ, mất âm/dương, giỗ, điện thoại
- [ ] `/dashboard/contributions` duyệt → kiểm `persons` có `legal_birth_*`, `anniversary_lunar_*`, ngày mất dương; `person_details_private` có `phone_number`
- [ ] Xác nhận người có sẵn trong scope **không** lộ số điện thoại (ô phone trống khi mở edit)
- [ ] Mobile ~375px: các grid 3 cột ngày tháng không vỡ layout

## Progress log

- 2026-06-08: Khảo sát xong. Xác nhận `get_contribution_context` đã trả `legal_birth_*`/`anniversary_lunar_*`/death-solar/birth-lunar nhưng KHÔNG trả phone (an toàn). Gap nằm ở UI form + types + RPC duyệt. Plan khởi tạo.
- 2026-06-08: Implement xong. `utils/dateHelpers.ts` + `solarToLunarParts`/`lunarToSolarParts`. `types/index.ts` extend cả 2 Contribution type. `components/ContributeForm.tsx` rewrite cả 2 panel với auto-convert + 5 trường mới. Migration `20260608041949` applied local. tsc clean.
