# Plan: Ngày giỗ khác ngày mất

> Trạng thái: **sẵn sàng implement**. Lập 2026-06-07.

## Context

App hiện tính ngày giỗ từ ngày mất: nếu có `death_lunar_month/day` thì dùng trực tiếp; nếu không thì convert `death_month/day` solar → âm. Không có cách phân biệt "ngày mất thực tế" và "ngày giỗ mà gia đình thực tế cúng".

Trong thực tế gia đình Việt Nam, ngày giỗ đôi khi **khác** ngày mất âm lịch — ví dụ: mất ngày 29 tháng thiếu, gia đình cúng giỗ vào ngày 30; hoặc gia đình di chuyển ngày giỗ sang ngày tiện hơn. Tính năng này cho phép nhập ngày giỗ tùy chọn riêng biệt với ngày mất.

Tính năng tương tự đã có cho ngày sinh: checkbox "Khác ngày sinh trên giấy tờ" → fields `legal_birth_year/month/day` → selector `birthday_remind_type`. Plan này mirror pattern đó cho ngày mất / ngày giỗ.

## Design Decisions

1. **Không thêm trường `death_anniversary_type`**. Thay vào đó: nếu `anniversary_lunar_month` và `anniversary_lunar_day` được set thì dùng chúng làm ngày giỗ; nếu không (null) thì fallback về behavior hiện tại (derive từ ngày mất). Đơn giản hơn, ít cột hơn — chỉ có 2 trạng thái nên không cần enum type như `birthday_remind_type`.

2. **Ngày giỗ tùy chọn chỉ nhập âm lịch**. Giỗ trong truyền thống Việt luôn theo âm lịch. Không cần hỗ trợ dương lịch cho trường này.

3. **Có `anniversary_lunar_year` dù thường để trống**. Năm âm lịch ít quan trọng với giỗ (giỗ lặp lại hằng năm) nhưng cần để consistency với các trường khác.

4. **Hiển thị badge "Giỗ khác ngày mất"** trong MemberDetailContent khi ngày giỗ được tùy chỉnh, tương tự badge "Giấy tờ" cho ngày sinh giấy tờ.

5. **computeEvents ưu tiên `anniversary_lunar_*` trước `death_lunar_*`**. Không break backward compat: ai không set ngày giỗ riêng thì behavior không đổi.

## Architecture / Solution Approach

### Luồng dữ liệu

```
MemberForm (UI)
  └─ checkbox "Ngày giỗ khác ngày mất"
       ├─ unchecked → anniversary_lunar_* = null (clear)
       └─ checked   → hiện 3 input (ngày/tháng/năm âm)
  └─ handleSubmit → member action → Supabase upsert

computeEvents (eventHelpers.ts)
  └─ if anniversary_lunar_month && anniversary_lunar_day:
       → dùng anniversary_lunar_* (override)
     else:
       → behavior cũ (death_lunar_* hoặc convert solar)

MemberDetailContent (UI)
  └─ if anniversary_lunar_month:
       → hiện "Ngày giỗ" với badge "Giỗ khác ngày mất"
```

### Trường DB mới

| Cột | Kiểu | Default | Mô tả |
|-----|------|---------|-------|
| `anniversary_lunar_year` | INT | NULL | Năm âm lịch của ngày giỗ tùy chọn |
| `anniversary_lunar_month` | INT | NULL | Tháng âm lịch ngày giỗ |
| `anniversary_lunar_day` | INT | NULL | Ngày âm lịch ngày giỗ |

## Files to Change

| File | Thay đổi |
|------|---------|
| `supabase/migrations/<timestamp>_add_anniversary_date.sql` | Migration: ADD 3 cột mới vào `persons` |
| `docs/schema.sql` | Thêm 3 cột mới vào block `persons` |
| `types/index.ts` | Thêm 3 trường vào `interface Person` |
| `utils/eventHelpers.ts` | `computeEvents`: thêm 3 tham số, ưu tiên `anniversary_lunar_*` |
| `components/MemberForm.tsx` | Thêm state + checkbox + animated fields bên trong block `isDeceased` |
| `app/actions/member.ts` | Include 3 trường mới khi upsert |
| `context/MemberDetailContent.tsx` | Hiển thị ngày giỗ custom với badge |
| `app/dashboard/page.tsx` | Thêm 3 cột vào SELECT |
| `app/dashboard/events/page.tsx` | Thêm 3 cột vào SELECT |
| `components/EventsList.tsx` | Thêm 3 trường vào type inline của prop `persons` |
| `supabase/migrations/<timestamp2>_update_share_rpc_anniversary.sql` | Cập nhật `get_shared_family_tree` RPC: thêm 3 cột mới vào SELECT |
| `components/MemberList.test.tsx` | Thêm 3 trường null vào mock person |
| `components/PersonSelector.test.tsx` | Thêm 3 trường null vào mock person |

## API Signatures

### `computeEvents` — tham số mở rộng

```ts
// Thêm 3 trường optional vào mỗi person object
persons: {
  // ... các trường hiện tại ...
  anniversary_lunar_year?: number | null;   // NEW
  anniversary_lunar_month?: number | null;  // NEW
  anniversary_lunar_day?: number | null;    // NEW
}[]
```

Ưu tiên logic bên trong (thay thế block death anniversary hiện tại):

```ts
// Ưu tiên: anniversary_lunar > death_lunar > convert solar
if (p.anniversary_lunar_month && p.anniversary_lunar_day) {
  lMonth = p.anniversary_lunar_month;
  lDay = p.anniversary_lunar_day;
} else if (p.death_lunar_month && p.death_lunar_day) {
  lMonth = p.death_lunar_month;
  lDay = p.death_lunar_day;
} else {
  // convert death solar → lunar (behavior cũ)
}
```

### `Person` interface (types/index.ts)

```ts
// Thêm sau death_lunar_day:
anniversary_lunar_year: number | null;
anniversary_lunar_month: number | null;
anniversary_lunar_day: number | null;
```

### MemberForm state mới

```ts
const [hasDifferentAnniversary, setHasDifferentAnniversary] = useState<boolean>(
  !!(initialData?.anniversary_lunar_month && initialData?.anniversary_lunar_day)
);
const [anniversaryLunarYear, setAnniversaryLunarYear] = useState<number | "">(
  initialData?.anniversary_lunar_year || ""
);
const [anniversaryLunarMonth, setAnniversaryLunarMonth] = useState<number | "">(
  initialData?.anniversary_lunar_month || ""
);
const [anniversaryLunarDay, setAnniversaryLunarDay] = useState<number | "">(
  initialData?.anniversary_lunar_day || ""
);
```

Phần submit:
```ts
anniversary_lunar_year: hasDifferentAnniversary && anniversaryLunarYear !== "" ? Number(anniversaryLunarYear) : null,
anniversary_lunar_month: hasDifferentAnniversary && anniversaryLunarMonth !== "" ? Number(anniversaryLunarMonth) : null,
anniversary_lunar_day: hasDifferentAnniversary && anniversaryLunarDay !== "" ? Number(anniversaryLunarDay) : null,
```

## Verification

```bash
# Unit test computeEvents
bun test utils/eventHelpers.test.ts  # nếu có

# TypeScript check
bun run build

# Migrations
supabase migration new add_anniversary_date
# (viết SQL)
supabase migration up
```

### Manual browser checklist

- [ ] Mở form chỉnh sửa thành viên đã mất → thấy checkbox "Ngày giỗ khác ngày mất" phía dưới block ngày mất
- [ ] Tick checkbox → hiện animated form nhập ngày âm (Ngày / Tháng / Năm)
- [ ] Nhập ngày giỗ khác ngày mất → Save → reload trang → dữ liệu persist
- [ ] Untick checkbox → Save → ngày giỗ custom bị xóa, anniversary trở về derive từ ngày mất
- [ ] Trang Dashboard (sự kiện/events): thành viên có ngày giỗ custom → anniversary đúng ngày giỗ custom, không phải ngày mất
- [ ] Thành viên KHÔNG có ngày giỗ custom → behavior không đổi so với trước
- [ ] MemberDetailContent: khi có custom anniversary, hiển thị badge "Giỗ khác ngày mất"
- [ ] MemberDetailContent: không có custom anniversary → không hiện section này
- [ ] Share link: page chia sẻ vẫn tính đúng sự kiện ngày giỗ custom

## Progress Log

- 2026-06-07: Plan tạo. Implement xong toàn bộ. Build sạch, 49 component tests + 75 unit tests pass. Còn migration `supabase migration up` và `supabase db push` để apply lên DB.
