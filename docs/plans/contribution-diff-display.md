# Sửa hiển thị diff trong màn hình duyệt đề xuất (Contribution Diff Display)

## 1. Context — Vì sao cần sửa

Màn hình admin duyệt đề xuất (`/dashboard/contributions`) hiển thị các thay đổi mà người
thân gửi qua link đóng góp. Phần so sánh "trước → sau" (`FieldDiff`) hiện đang sai/thiếu ở
ba điểm, khiến admin **không thấy đúng** những gì người đóng góp đề xuất, dễ duyệt nhầm:

1. **Prop `persons` thiếu trường** — page chỉ `select` và prop chỉ nhận
   `Pick<Person, "id" | "full_name" | "other_names" | "gender" | "birth_year">`.
   Mọi trường còn lại (năm/tháng/ngày sinh & mất DL/AL, ngày giỗ AL, `is_deceased`, `note`)
   **không có trong dữ liệu `persons`** → `beforeVal = undefined` → `FieldDiff` không render
   được giá trị cũ gạch đỏ. Admin chỉ thấy giá trị mới (xanh) mà không biết nó **thay** giá
   trị gì. Ví dụ: đổi năm mất từ 1990 → 1991 chỉ hiện "1991", không thấy "1990" gạch đỏ.

2. **`FieldDiff` không format giá trị** — dùng `String()` thô:
   - `is_deceased` (boolean) hiển thị `"true"` / `"false"` thay vì `"Đã mất"` / `"Còn sống"`.
   - `gender` hiển thị `"male"` / `"female"` thay vì `"Nam"` / `"Nữ"`.
   - Năm/tháng/ngày là số thì tạm ổn nhưng vẫn nên đi qua cùng một bộ format để nhất quán.

3. **Xóa một trường thì vô hình** — guard `if (after === undefined || after === null) return null`
   ẩn luôn các trường bị **cố ý xóa**. Khi người đóng góp xóa một `note` (gửi `note: null`
   hoặc `note: ""`), admin **không thấy gì cả** → không biết có thao tác xóa, có thể duyệt mà
   không nhận ra dữ liệu cũ sẽ bị mất.

Ngoài ra phát hiện thêm khi đọc code: `FIELD_LABELS` **thiếu** ba trường ngày giỗ AL
(`anniversary_lunar_year` / `_month` / `_day`) — dù chúng nằm trong `ContributionEdit.fields`.
Nếu một đề xuất sửa ngày giỗ, label sẽ fallback về `key.replace(/_/g, " ")` (xấu, tiếng Anh).
Plan này gộp luôn việc bổ sung.

## 2. Design decisions

### 2.1. Kiểu cho prop `persons`: dùng `Person` đầy đủ thay vì Pick rộng hơn

**Quyết định:** Đổi prop `persons` từ Pick hẹp sang `Person[]` (kiểu đầy đủ), và sửa câu
`select` ở page thành `select("*")`.

**Lý do:**
- Tập trường mà diff cần đúng bằng toàn bộ tập trường trong `ContributionEdit.fields`
  (full_name, other_names, gender, 3×birth DL, 3×birth AL, 3×death DL, 3×death AL,
  3×anniversary AL, is_deceased, note) — gần như toàn bộ cột public của `persons`. Một Pick
  liệt kê ~20 trường sẽ dài, dễ lệch khi `ContributionEdit.fields` thay đổi trong tương lai.
- `Person` là kiểu sẵn có, đã import ở cả hai file. Dùng nó giảm rủi ro "thêm trường vào
  contribution nhưng quên thêm vào Pick".
- Bảng `persons` của gia phả nhỏ (vài trăm dòng), `select("*")` không gây vấn đề hiệu năng.
- `PersonName` chỉ dùng `full_name`, `birth_year` — vẫn hoạt động với `Person` đầy đủ.

**Trade-off đã cân nhắc:** `select("*")` kéo về cả cột private (`phone_number`, `occupation`,
`current_residence`). Trang này **chỉ admin** truy cập (đã có `redirect` nếu không phải admin),
nên không lộ dữ liệu nhạy cảm cho người không có quyền. Chấp nhận được.

### 2.2. Hiển thị "xóa một trường" → badge "(đã xóa)" màu đỏ

**Quyết định:** Bỏ guard ẩn khi `after` rỗng. Thay vào đó, khi người đóng góp **cố ý xóa**
(after là `null` / `""`) **và** giá trị cũ có thật (before không rỗng), render:
- dòng giá trị cũ: gạch đỏ như cũ.
- thay cho dòng "giá trị mới" xanh: chip/nhãn **`(đã xóa)`** màu đỏ (`text-red-600`),
  thể hiện rõ trường này sẽ bị xóa.

Quy tắc render chính xác trong `FieldDiff` (sau khi sửa):
1. Tính `beforeStr = formatFieldValue(key, before)`, `afterStr = formatFieldValue(key, after)`.
2. **Bỏ qua (return null)** nếu giá trị không thực sự đổi: coi `null`/`undefined`/`""` là
   "rỗng" và nếu cả before lẫn after đều rỗng → null; nếu before-rỗng và after-rỗng → null.
3. Nếu after rỗng nhưng before có giá trị → đây là **xóa**: hiện before gạch đỏ + `(đã xóa)`.
4. Nếu before rỗng và after có giá trị → đây là **thêm**: chỉ hiện after xanh (không có dòng đỏ).
5. Ngược lại (cả hai có giá trị, khác nhau) → hiện before gạch đỏ + after xanh.

**Lý do:** "(đã xóa)" rõ nghĩa với người Việt, không cần icon. Phân biệt rõ 3 case (thêm /
sửa / xóa) giúp admin quyết định đúng.

### 2.3. Format giá trị: tách helper `formatFieldValue(key, value)` thay vì inline

**Quyết định:** Viết một helper thuần `formatFieldValue(key: string, value: unknown): string`
trong `utils/contributionHelpers.ts` (file đã tồn tại — xem `utils/contributionHelpers.test.ts`),
export ra để cả `FieldDiff` và phần hiển thị "người mới" dùng chung, và để **unit test** được.

Quy tắc format:
- `gender`: `male`→`Nam`, `female`→`Nữ`, `other`→`Khác`, còn lại / rỗng → `""`.
- `is_deceased`: `true`→`Đã mất`, `false`→`Còn sống`. (Lưu ý: với `is_deceased`, giá trị
  `false` là **có nghĩa**, không phải "rỗng" — xem 2.4.)
- Các trường số (NUMBER_FIELDS, gồm cả 3 trường anniversary AL): `null`/`undefined`→`""`,
  còn lại `String(value)`.
- Mặc định (text: full_name, other_names, note): `null`/`undefined`→`""`, còn lại `String(value)`.

**Lý do tách helper:**
- Tái sử dụng: phần "Thêm thành viên mới" hiện đang format gender/giới tính bằng tay
  (dòng inline `np.fields.gender === "male" ? "Nam" : ...`) — thay bằng helper cho nhất quán.
- Test được bằng `bun:test` (file `*.test.ts`) — đã có sẵn `utils/contributionHelpers.test.ts`.
- Tránh phình logic trong component.

### 2.4. Định nghĩa "rỗng" và xử lý `is_deceased`

`is_deceased` là boolean: `false` **không phải** rỗng. Helper kiểm tra "rỗng" (`isEmptyValue`)
phải coi rỗng = `null | undefined | ""` (chuỗi rỗng), **không** coi `false` hay `0` là rỗng.
Do đó cần một helper `isEmptyValue(value: unknown): boolean` riêng, không dùng `!value`.

Lưu ý case đặc biệt: nếu đổi `is_deceased` từ `true`→`false`, đây là **sửa** (case 5), hiển
thị `Đã mất` gạch đỏ + `Còn sống` xanh — đúng, không rơi vào nhánh "xóa".

### 2.5. FIELD_LABELS: giữ ở component, bổ sung trường thiếu

**Quyết định:** Giữ `FIELD_LABELS` ở `ContributionReview.tsx` (nơi nó được dùng cho cả diff
và edit mode), **không** tách sang utils. Chỉ **bổ sung** 3 nhãn ngày giỗ AL còn thiếu:
- `anniversary_lunar_year: "Năm giỗ AL"`
- `anniversary_lunar_month: "Tháng giỗ AL"`
- `anniversary_lunar_day: "Ngày giỗ AL"`

**Lý do không tách:** `FIELD_LABELS` thuần là UI string, chỉ dùng trong component này, không
cần test. Tách sang utils tạo import vòng vèo không cần thiết. `formatFieldValue` cần tách (vì
có logic + cần test); label thì không.

## 3. Architecture — Thay đổi ở đâu, luồng dữ liệu

Luồng: `app/dashboard/contributions/page.tsx` (server) fetch `persons` (đầy đủ trường) →
truyền xuống `<ContributionReview persons={...} />` (client) → `ContributionCard` → với mỗi
`edit`, tìm `person` theo `edit.person_id`, lấy `beforeVal = person[key]`, render `<FieldDiff>`.

Thay đổi:
1. **page.tsx**: `select("*")` thay vì select 5 cột; ép kiểu `Person[]`.
2. **types/index.ts** (nếu cần): không thay đổi kiểu — chỉ dùng `Person` sẵn có.
3. **ContributionReview.tsx**:
   - Prop `persons: Person[]` (bỏ Pick).
   - `FieldDiff` viết lại theo 5 case ở 2.2, dùng `formatFieldValue` + `isEmptyValue`.
   - Bổ sung 3 nhãn anniversary vào `FIELD_LABELS`.
   - Phần "Thêm thành viên mới": thay đoạn format gender inline bằng `formatFieldValue`.
4. **utils/contributionHelpers.ts**: thêm `isEmptyValue`, `formatFieldValue`, và export hằng
   `GENDER_LABELS` nếu hữu ích (tùy chọn). Đặt `NUMBER_FIELDS`/`BOOLEAN`/danh sách trường ở
   đây để helper tự quyết định format theo key. Lưu ý: `NUMBER_FIELDS` trong component và bộ
   trường số trong helper phải khớp — cân nhắc export từ helper rồi import vào component để
   single-source-of-truth (tùy chọn, không bắt buộc).

## 4. Files to change

| File | Thay đổi |
|---|---|
| `app/dashboard/contributions/page.tsx` | Đổi `select("id, full_name, ...")` → `select("*")`; ép kiểu `personsData as Person[]`; bỏ kiểu Pick ở biến `persons`. |
| `components/ContributionReview.tsx` | Prop `persons: Person[]`; viết lại `FieldDiff` (5 case, dùng `formatFieldValue` + `isEmptyValue`, hiển thị `(đã xóa)`); bổ sung 3 nhãn `anniversary_lunar_*` vào `FIELD_LABELS`; thay format gender inline ở phần "người mới" bằng `formatFieldValue`. |
| `utils/contributionHelpers.ts` | Thêm `isEmptyValue(value)` và `formatFieldValue(key, value)`; (tùy chọn) export `NUMBER_FIELDS` để chia sẻ với component. |
| `utils/contributionHelpers.test.ts` | Thêm test cho `isEmptyValue` và `formatFieldValue` (gender, is_deceased true/false, số, text, null/empty). |

## 5. API signatures

```ts
// utils/contributionHelpers.ts

/** true nếu value coi như "rỗng": null | undefined | "" (chuỗi rỗng).
 *  KHÔNG coi false hay 0 là rỗng. */
export function isEmptyValue(value: unknown): boolean;

/** Format giá trị một trường person sang chuỗi hiển thị tiếng Việt.
 *  - gender: male→"Nam", female→"Nữ", other→"Khác"
 *  - is_deceased: true→"Đã mất", false→"Còn sống"
 *  - số / text: String(value), rỗng → ""
 *  Trả "" cho giá trị rỗng (trừ is_deceased=false → "Còn sống"). */
export function formatFieldValue(key: string, value: unknown): string;

/** (tùy chọn) Các key là trường số — chia sẻ với ContributionReview. */
export const NUMBER_FIELDS: Set<string>;
```

```tsx
// components/ContributionReview.tsx

interface Props {
  contributions: PendingContribution[];
  persons: Person[]; // đổi từ Pick<...>
}

function FieldDiff({
  label,
  before,
  after,
  fieldKey, // MỚI: cần để format đúng theo loại trường
}: {
  label: string;
  before: unknown;
  after: unknown;
  fieldKey: string;
}): JSX.Element | null;
```

Lưu ý nơi gọi `<FieldDiff>` (khoảng dòng 300-309) phải truyền thêm `fieldKey={key}`.

## 6. Verification

### Lệnh tự động

```bash
bun test utils/contributionHelpers.test.ts   # unit test helper (bun:test, *.test.ts)
bun run lint                                  # eslint
bun run build                                 # đảm bảo type-check pass (prop Person[])
```

Hoặc kiểm type nhanh bằng Serena `get_diagnostics_for_file` cho 2 file `.tsx`/`.ts` đã sửa.

### Checklist test thủ công trên trình duyệt (`/dashboard/contributions`, đăng nhập admin)

- [ ] **Sửa năm mất** (1990 → 1991): thấy `1990` gạch đỏ + `1991` xanh.
- [ ] **Sửa giới tính** (male → female): thấy `Nam` gạch đỏ + `Nữ` xanh (KHÔNG phải `male`/`female`).
- [ ] **Sửa is_deceased** (false → true): thấy `Còn sống` gạch đỏ + `Đã mất` xanh (KHÔNG `false`/`true`).
- [ ] **Sửa is_deceased** (true → false): thấy `Đã mất` gạch đỏ + `Còn sống` xanh (không bị ẩn).
- [ ] **Thêm trường mới** (note từ trống → "abc"): chỉ thấy `abc` xanh, không có dòng đỏ.
- [ ] **Xóa trường** (note "abc" → trống): thấy `abc` gạch đỏ + nhãn `(đã xóa)` màu đỏ.
- [ ] **Sửa ngày giỗ AL** (anniversary_lunar_*): label hiển thị "Ngày/Tháng/Năm giỗ AL" (không phải tiếng Anh).
- [ ] **Sửa ngày sinh/mất DL & AL**: đều thấy before gạch đỏ + after xanh.
- [ ] **Người mới**: phần "Thêm thành viên mới" hiển thị giới tính "Nam/Nữ/Khác" đúng.
- [ ] **Edit mode** vẫn hoạt động: bấm "Chỉnh sửa", sửa các trường, "Lưu chỉnh sửa" OK.
- [ ] **Duyệt / Từ chối** vẫn chạy bình thường sau khi sửa.
- [ ] Mobile ~375px: các dòng diff không vỡ layout (label `w-28` + giá trị xuống dòng OK).
- [ ] Không có giá trị "trước" nào còn bị `undefined` (không còn case mất dòng đỏ do prop thiếu trường).

## 7. Progress log

<!-- Cập nhật sau mỗi phiên: ngày + commit + ghi chú -->
