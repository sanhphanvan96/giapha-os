# Architecture Notes

Chi tiết bổ sung cho phần Architecture trong CLAUDE.md.

## Tree visualization

`components/FamilyTree.tsx` renders cây phả hệ theo layout đệ quy tự viết (không dùng D3 layout — D3 chỉ dùng cho pan/zoom qua `hooks/usePanZoom.ts`). Trước khi render, `utils/treeHelpers.ts:buildAdjacencyLists()` chuyển mảng `relationships` phẳng thành `Map`-based adjacency lists (O(1) lookup). Children trong mỗi node được sort theo `birth_order` rồi `birth_year`.

`components/MindmapTree.tsx` render view radial mindmap từ cùng dữ liệu.

## Kinship calculator

`utils/kinshipHelpers.ts` — BFS trên relationship graph, tìm đường ngắn nhất giữa 2 người, map sang thuật ngữ xưng hô tiếng Việt (Bác, Chú, Cô, Dì...).

Key exports:
- `computeKinship(a, b)` — tính quan hệ pairwise
- `computeEgoLabels(ego, persons, rels)` — batch: build map một lần, gán nhãn toàn bộ danh sách tương đối với ego

## View state

`context/MemberListContext.tsx` (`MemberListProvider`) giữ client-side state cho trang members:
- `viewMode`: `tree` / `mindmap` / `bubble` / `list` (default `tree`)
- `viewAsPersonId`: ego cho kinship labels ("view-as")
- Filter toggles: `hideDaughtersInLaw`, `hideSonsInLaw`, `hideDaughters`, `hideSons`, `hideMales`, `hideFemales`, `hideExpandButtons`, `autoCollapseLevel`
- State được sync lên URL search params → links shareable

`components/UserProvider.tsx` expose current user + profile qua `useUser()` cho client components.

## Import / Export

`app/actions/data.ts` — xử lý JSON, CSV (papaparse), GEDCOM backup/restore.
- `utils/gedcom.ts` — serialization GEDCOM
- `utils/csv.ts` — serialization CSV
