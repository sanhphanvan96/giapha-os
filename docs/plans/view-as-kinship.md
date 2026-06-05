# Tiến độ: Tính năng "Xem với tư cách là" (View-as Kinship Labels)

Tính năng: Tại `view=tree`, cho phép user chọn một ego, cây hiển thị danh xưng tiếng Việt
của từng thành viên tương đối với ego đó (Vợ/Chồng, Con, Cháu nội, Ông nội, Con rể, Bác, Chú...).

Xem plan đầy đủ: `/Users/sphan/.claude/plans/t-i-mu-n-c-th-m-proud-sonnet.md`

---

## Checklist thực hiện

- [x] **Bước 0** — Tạo file tiến độ này (`docs/plans/view-as-kinship.md`)

- [x] **Bước 1** — `utils/kinshipHelpers.ts`: Refactor + batch `computeEgoLabels` + Nội/Ngoại
  - [x] 1a. Tách `buildKinshipMaps(persons, relationships)` → `{ personsMap, parentMap, spouseMap }`
  - [x] 1b. Tách `computeKinshipCore(personA, personB, personsMap, parentMap, spouseMap)` — logic hiện tại (bước 0–4)
  - [x] 1c. `computeKinship` public giữ nguyên chữ ký, gọi build + core (tương thích KinshipFinder)
  - [x] 1d. Export `computeEgoLabels(egoId, persons, relationships): Map<string, string>` — build maps 1 lần, loop tất cả, lấy `aCallsB`
  - [x] 1e. Sửa `getDirectDescendantTerm(depth, isPaternal?)` — depth>=2 thêm hậu tố " nội"/" ngoại"

- [x] **Bước 2** — `context/MemberListContext.tsx`: State `viewAsPersonId` (URL param `viewAs`)
  - [x] Interface + state init + syncFromURL + setter + Provider value + no-op fallback

- [x] **Bước 3** — `components/ViewAsSelector.tsx` (mới): Copy RootSelector, `showAllOption`="Tắt danh xưng"

- [x] **Bước 4** — `components/MembersViews.tsx`: Mount `<ViewAsSelector>` chỉ khi `view==="tree"`

- [x] **Bước 5** — `components/FamilyTree.tsx`: `computeEgoLabels` memo, truyền `kinshipLabel`/`isEgo` xuống card

- [x] **Bước 6** — `components/FamilyNodeCard.tsx`: Render pill danh xưng (amber, mobile-friendly) + highlight ego ("Tôi")

- [x] **Bước 7** — Dọn dẹp: thêm `viewAsPersonId` vào dep array của `equalizeHeights` effect

- [x] **Bước 8** — `utils/kinshipHelpers.test.ts` (mới): Unit test `bun test`, không cần browser
  - [x] Dữ liệu mẫu 3 đời (A-B; con C+D; cháu F nội, H ngoại)
  - [x] Test computeEgoLabels: ego=C → Vợ, Con, Bố, Mẹ, Em gái, Em/Anh rể
  - [x] Test computeEgoLabels: ego=A → Cháu nội, Cháu ngoại, Con
  - [x] Test regression computeKinship vẫn đúng sau refactor
  - [x] Test biên: không liên quan → không set nhãn
  - [x] `bun test utils/kinshipHelpers.test.ts` tất cả pass ✓

---

## Verification cuối

- [x] 0. `bun test utils/kinshipHelpers.test.ts` → 25/25 pass
- [ ] 1. `bun run dev` → `/dashboard/members?view=tree` → chọn ego → nhãn đúng
- [ ] 2. Ego tự highlight + nhãn "Tôi"
- [ ] 3. Bỏ chọn ("Tắt danh xưng") → cây về bình thường
- [ ] 4. Reload trang giữ ego qua `?viewAs=` URL
- [ ] 5. Đổi Gốc hiển thị khi ego đang chọn → danh xưng vẫn đúng
- [ ] 6. Mindmap/Bubble không hiện selector, không đổi
- [ ] 7. Mobile ~375px: selector không tràn, pill không phá layout card
- [x] 8. `bun run lint && bun run build` pass (0 errors, 5 pre-existing warnings)
- [ ] 9. `/dashboard/kinship` → KinshipFinder đúng + cháu có hậu tố nội/ngoại

---

## Ghi chú tiến độ

| Ngày | Bước | Ghi chú |
|------|------|---------|
| 2026-06-05 | Bước 0 | Tạo file tiến độ |
| 2026-06-05 | Bước 1 + 8 | Refactor kinshipHelpers: buildKinshipMaps, computeKinshipCore, computeKinship (giữ nguyên), computeEgoLabels; fix getDirectDescendantTerm nội/ngoại; 25/25 tests pass |
| 2026-06-05 | Bước 2–7 | MemberListContext (viewAsPersonId+URL sync), ViewAsSelector, MembersViews, FamilyTree, FamilyNodeCard; lint+build pass |
