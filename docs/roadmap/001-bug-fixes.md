# 001 — Fix bugs & code issues

**Nguồn:** Code review bằng Serena MCP  
**Tạo:** 2026-06-02  
**Cập nhật:** 2026-06-02  
**Trạng thái:** 🟡 Chưa bắt đầu

---

## Tiến độ tổng quan

```
[ ] P1 — Data integrity (0/2)
[ ] P2 — Logic bugs     (0/3)
[ ] P3 — Memory & UX    (0/2)
[ ] P4 — Code quality   (0/2)
```

---

## P1 — Nghiêm trọng: Data integrity

### [ ] 1.1 — `importData` không có transaction / rollback

**File:** `app/actions/data.ts` → `importData()`  
**Vấn đề:** Import xóa toàn bộ data theo thứ tự
(custom_events → relationships → person_details_private → persons)
rồi insert lại từng chunk. Nếu bất kỳ chunk nào fail → data đã xóa nhưng chưa được restore. Không có cơ chế rollback.  
**Rủi ro:** Mất dữ liệu không phục hồi với gia đình lớn.

**Hướng fix:**
- Trước khi xóa, export toàn bộ data hiện tại vào biến backup trong memory.
- Nếu bất kỳ bước insert nào fail, re-insert lại từ backup.
- Hoặc: dùng Supabase Edge Function với transaction thật sự (nếu muốn atomic).
- Ít nhất: thêm bước "preview" cho user xem trước số lượng records trước khi xóa.

---

### [ ] 1.2 — `deleteMemberProfile` không xóa avatar khỏi Storage

**File:** `app/actions/member.ts` → `deleteMemberProfile()` (line 6–49)  
**Vấn đề:** Chỉ xóa row trong bảng `persons`, không xóa file ảnh trong Supabase Storage bucket `avatars/`. Mỗi lần xóa thành viên để lại orphaned file.  
**Rủi ro:** Storage đầy dần, không có cách dọn dẹp tự động.

**Hướng fix:**
```ts
// Trước khi delete persons row:
const { data: person } = await supabase.from("persons").select("avatar_url").eq("id", memberId).single();
if (person?.avatar_url) {
  const fileName = person.avatar_url.split("/").pop();
  if (fileName) await supabase.storage.from("avatars").remove([fileName]);
}
```

---

## P2 — Bug logic

### [ ] 2.1 — Filter tree sai: `hideDaughtersInLaw` / `hideSonsInLaw`

**File:** `utils/treeHelpers.ts` → `getFilteredTreeData()` (line 82–85)  
**Vấn đề:** Filter chỉ kiểm tra `gender`, không kiểm tra `is_in_law`. Kết quả: ẩn tất cả vợ/chồng (kể cả người gốc dòng tộc), không phải chỉ dâu/rể.

**Fix:**
```ts
// Hiện tại (SAI):
if (hideDaughtersInLaw && s.person.gender === "female") return false;
if (hideSonsInLaw && s.person.gender === "male") return false;

// Đúng:
if (hideDaughtersInLaw && s.person.gender === "female" && s.person.is_in_law) return false;
if (hideSonsInLaw && s.person.gender === "male" && s.person.is_in_law) return false;
```

---

### [ ] 2.2 — `isDeceased` không nhất quán giữa các component

**Files:**
- `components/PersonCard.tsx:17` → dùng `person.is_deceased` (boolean flag)
- `context/MemberDetailContent.tsx:73–80` → dùng flag OR bất kỳ trường ngày mất nào

**Vấn đề:** Nếu có người nhập ngày mất nhưng quên tick checkbox "Đã mất" →
PersonCard hiển thị người đó như còn sống, trang chi tiết lại hiển thị như đã mất.

**Hướng fix:** Tạo một helper function dùng chung:
```ts
// utils/personHelpers.ts
export function isPersonDeceased(person: Person): boolean {
  return person.is_deceased ||
    !!person.death_year || !!person.death_month || !!person.death_day ||
    !!person.death_lunar_year || !!person.death_lunar_month || !!person.death_lunar_day;
}
```
Rồi dùng thống nhất ở tất cả components. Đồng thời nên auto-set `is_deceased = true` trong `MemberForm` khi user nhập ngày mất.

---

### [ ] 2.3 — `computeKinship` return không nhất quán với type signature

**File:** `utils/kinshipHelpers.ts` → `computeKinship()` (line 381–674)  
**Vấn đề:** Signature khai báo `KinshipResult | null` nhưng khi không tìm được quan hệ, trả về object `{ distance: -1, aCallsB: "Chưa xác định" }` thay vì `null`. Caller phải check `result.distance === -1` — không nhất quán với contract.

**Hướng fix:** Thay dòng return cuối thành `return null;` và cập nhật tất cả caller để handle `null`.

---

## P3 — Memory leak & UX

### [ ] 3.1 — `URL.createObjectURL` không được revoke

**File:** `components/MemberForm.tsx` (line ~602)  
**Vấn đề:** Mỗi lần chọn ảnh tạo một object URL mới, không gọi `URL.revokeObjectURL()` khi đổi ảnh hoặc unmount component → memory leak.

**Fix:**
```ts
onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    // Revoke URL cũ trước khi tạo mới
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }
}}
```
Thêm cleanup trong `useEffect` return khi unmount.

---

### [ ] 3.2 — Search không bao gồm `other_names`

**File:** `components/MemberList.tsx` (line 31)  
**Vấn đề:** Chỉ tìm theo `full_name`, bỏ sót nickname/tên thánh lưu trong `other_names`.

**Fix:**
```ts
// Hiện tại:
const matchesSearch = person.full_name.toLowerCase().includes(searchTerm.toLowerCase());

// Đúng:
const term = searchTerm.toLowerCase();
const matchesSearch =
  person.full_name.toLowerCase().includes(term) ||
  (person.other_names?.toLowerCase().includes(term) ?? false);
```

---

## P4 — Code quality

### [ ] 4.1 — `MemberListProvider` triple URL sync

**File:** `context/MemberListContext.tsx` → `MemberListProvider()` (line 23–141)  
**Vấn đề:** State được sync từ 3 nguồn: props (`initialView`), `useSearchParams()`, và `useEffect` đọc `window.location.search`. Gây flash sai view khi mount và conflict với Next.js router vì dùng `window.history.replaceState` trực tiếp thay vì `router.replace`.

**Hướng fix:** Chọn một nguồn chính (props từ server là đúng nhất), bỏ `useEffect` sync, dùng `router.replace` thay vì `window.history.replaceState`.

---

### [ ] 4.2 — `fetchAll` trong `exportData` dùng `any[]`

**File:** `app/actions/data.ts` (trong `exportData()`)  
**Vấn đề:** `let allData: any[] = []` bypass TypeScript hoàn toàn, lỗi shape data không bị catch lúc build.

**Fix:** Type rõ ràng theo từng table:
```ts
const fetchAll = async <T>(table: string, selectCols: string, orderBy: string): Promise<T[]> => {
  let allData: T[] = [];
  // ...
};
```

---

## Ghi chú khi implement

- Fix P1 trước, đặc biệt 1.1 (import transaction) vì rủi ro mất data cao nhất.
- 2.2 (`isDeceased` helper) ảnh hưởng nhiều file, cần test kỹ sau khi sửa.
- 4.1 (URL sync) dễ gây regression ở navigation, cần test cả share link.
