# Plan: "Xem với tư cách là" (View-as Kinship Labels)

**Trạng thái: HOÀN THÀNH** — commit `05f6a58` trên branch `develop` (2026-06-05)

---

## Context

Trước khi có tính năng này, ở `view=tree` người dùng chỉ chọn được **Gốc hiển thị** để quyết định ai là gốc cây. Không có cách nào nhìn cây và biết ngay quan hệ của từng người với mình.

Tính năng mới: thêm selector **"Xem với tư cách là"** — chọn một thành viên làm "ego", sau đó mọi node khác trong cây hiển thị danh xưng tiếng Việt tương đối so với ego đó (Vợ/Chồng, Con, Cháu nội, Ông nội, Con rể, Bác, Chú, Cô, Dì...). Card của chính ego được highlight amber + nhãn "Tôi".

**Phạm vi:** chỉ `view=tree`. Mindmap/Bubble không đổi.

---

## Quyết định thiết kế

| Vấn đề | Quyết định |
|---|---|
| View nào hiện danh xưng | Chỉ tree view |
| Cháu Nội vs Cháu (không phân nhánh) | Nâng cấp `getDirectDescendantTerm` để phân Nội/Ngoại — ảnh hưởng cả KinshipFinder, chấp nhận vì chính xác hơn |
| URL persistence | Sync vào `?viewAs=<id>`, không localStorage |
| Mobile | Selector `w-full sm:w-72`, pill `text-[9px] sm:text-[10px] truncate` |

---

## Kiến trúc giải pháp

### State flow
```
MemberListContext.viewAsPersonId (URL-synced, ?viewAs=id)
  ↓
ViewAsSelector (MembersViews, chỉ tree)   ← chọn ego
  ↓
FamilyTree: computeEgoLabels(egoId, persons, rels) → Map<id, label>  [memoized]
  ↓
FamilyNodeCard: kinshipLabel prop + isEgo prop → pill amber / ring + "Tôi"
```

### Hàm batch mới: `computeEgoLabels`
```ts
export function computeEgoLabels(
  egoId: string,
  persons: PersonNode[],
  relationships: RelEdge[],
): Map<string, string>
```
Build `personsMap / parentMap / spouseMap` **một lần** (tối ưu so với gọi `computeKinship` N lần mỗi lần rebuild maps). Loop tất cả person ≠ ego, gọi `computeKinshipCore(ego, node, ...)`, lấy `result.aCallsB`. Bỏ qua "Chưa xác định". Trả `Map<personId, label>`.

### Nội/Ngoại cho vế dưới
`getDirectDescendantTerm(depth, isPaternal?)` — depth ≥ 2 thêm hậu tố " nội"/" ngoại". Hai call site trong `resolveBloodTerms` có sẵn `isPaternal` bool → truyền vào. "Con" (depth 1) không thêm hậu tố.

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `utils/kinshipHelpers.ts` | Tách `buildKinshipMaps` + `computeKinshipCore` (nội bộ); `computeKinship` public giữ nguyên chữ ký; thêm export `computeEgoLabels`; sửa `getDirectDescendantTerm(depth, isPaternal?)` |
| `utils/kinshipHelpers.test.ts` | **Mới** — 25 unit tests `bun test`, 3 gia đình fixture (ego=C, ego=A, ego=F), regression, edge case. Không cần browser. |
| `context/MemberListContext.tsx` | Thêm `viewAsPersonId / setViewAsPersonId` (URL param `viewAs`): interface, state init, syncFromURL, setter, provider value, no-op fallback |
| `components/ViewAsSelector.tsx` | **Mới** — Wrap `PersonSelector` với `label="Xem với tư cách là"`, `showAllOption` / `allOptionLabel="Tắt danh xưng"` |
| `components/MembersViews.tsx` | Mount `<ViewAsSelector>` cạnh `<RootSelector>`, chỉ khi `currentView === "tree"` |
| `components/FamilyTree.tsx` | Lấy `viewAsPersonId` từ context; `egoLabels = useMemo(() => computeEgoLabels(...), [viewAsPersonId, personsMap, relationships])`; truyền `kinshipLabel`/`isEgo` xuống mỗi `FamilyNodeCard`; thêm `viewAsPersonId` vào dep array `equalizeHeights` |
| `components/FamilyNodeCard.tsx` | Props mới `kinshipLabel?` + `isEgo?`; render pill amber `rounded-full text-[9px] sm:text-[10px] truncate`; ego: `ring-2 ring-amber-400` + badge "Tôi" amber-500 |

---

## API signatures sau thay đổi

```ts
// kinshipHelpers.ts
export interface RelEdge { ... }          // giờ được export
export function computeKinship(           // không đổi chữ ký
  personA: PersonNode, personB: PersonNode,
  persons: PersonNode[], relationships: RelEdge[]
): KinshipResult | null

export function computeEgoLabels(         // mới
  egoId: string,
  persons: PersonNode[],
  relationships: RelEdge[],
): Map<string, string>

// MemberListContext.tsx — thêm vào MemberListViewState
viewAsPersonId: string | null
setViewAsPersonId: (id: string | null) => void
```

---

## Implementation checklist

- [x] Bước 0 — Tạo file tiến độ `docs/plans/view-as-kinship.md`
- [x] Bước 1 — `utils/kinshipHelpers.ts`: tách `buildKinshipMaps` + `computeKinshipCore`; thêm `computeEgoLabels`; sửa `getDirectDescendantTerm(depth, isPaternal?)`
- [x] Bước 2 — `context/MemberListContext.tsx`: state `viewAsPersonId` + URL sync `?viewAs`
- [x] Bước 3 — `components/ViewAsSelector.tsx` (mới)
- [x] Bước 4 — `components/MembersViews.tsx`: mount ViewAsSelector chỉ khi tree
- [x] Bước 5 — `components/FamilyTree.tsx`: `computeEgoLabels` memo + truyền props xuống card
- [x] Bước 6 — `components/FamilyNodeCard.tsx`: pill danh xưng + highlight ego
- [x] Bước 7 — `FamilyTree.tsx`: thêm `viewAsPersonId` vào dep array `equalizeHeights`
- [x] Bước 8 — `utils/kinshipHelpers.test.ts`: 25/25 tests pass (`bun test`)

---

## Verification

### Tự động (đã pass)
- `bun test utils/kinshipHelpers.test.ts` → **25/25 pass**
- `bun run lint` → 0 errors
- `bun run build` → clean (TypeScript + Next.js)

### Thủ công (cần browser)
- [ ] `bun run dev` → chọn ego → nhãn đúng cho Vợ/Chồng, Con, Cháu nội/ngoại, Ông nội/ngoại, Con rể/dâu, Bác/Chú/Cô, Cậu/Dì
- [ ] Card ego highlight + nhãn "Tôi"
- [ ] Bỏ chọn ("Tắt danh xưng") → cây về bình thường
- [ ] Reload trang giữ ego qua `?viewAs=` URL
- [ ] Đổi Gốc hiển thị khi ego đang chọn → danh xưng vẫn đúng
- [ ] Mindmap/Bubble không hiện selector
- [ ] Mobile ~375px: selector không tràn ngang, pill không phá layout card
- [ ] `/dashboard/kinship` → KinshipFinder đúng + Cháu nội/ngoại đúng

---

## Ghi chú tiến độ

| Ngày | Ghi chú |
|------|---------|
| 2026-06-05 | Hoàn thành toàn bộ, commit `05f6a58` trên `develop`. 25/25 tests pass, lint+build clean. Chờ browser test thủ công. |
