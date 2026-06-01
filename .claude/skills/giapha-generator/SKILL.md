---
name: giapha-generator
description: Generate a giapha-os importable ZIP file (persons.csv + relationships.csv) from natural language description or provided data file. Use when user wants to populate a family tree, describes family members and relationships, or provides existing family data to convert.
---

# Skill: Tạo file import cho Gia Phả OS

Tạo file `.zip` có thể import vào ứng dụng gia phả tại `/dashboard/data → Sao lưu & Phục hồi → Import`.

File ZIP phải chứa đúng 2 file CSV: `persons.csv` và `relationships.csv`.

---

## Bước 1 — Đọc input

- Nếu args có đường dẫn file: đọc file đó bằng Read tool.
- Nếu không có: yêu cầu user mô tả gia phả hoặc dán dữ liệu vào.

Chấp nhận mọi dạng input: mô tả tự nhiên, danh sách text, dữ liệu CSV/Excel paste, file export cũ, v.v.

---

## Bước 2 — Trích xuất thông tin gia phả

Từ input, xác định:

**Thành viên (persons):**
- Họ tên đầy đủ (`full_name`)
- Giới tính: suy luận từ tên Việt Nam khi có thể (`male` / `female` / `other`)
- Năm, tháng, ngày sinh (chỉ cần năm nếu không biết chi tiết hơn)
- Năm, tháng, ngày mất + ngày mất âm lịch nếu được đề cập
- Đã mất chưa (`is_deceased: true/false`)
- Có phải người nhập gia không — tức là vợ/chồng từ ngoài vào (`is_in_law: true` cho dâu/rể)
- Thứ tự con trong gia đình (`birth_order`: 1 = con cả)
- Thế hệ (`generation`: ông bà tổ = 1, con = 2, cháu = 3, …)
- Tên khác / bí danh (`other_names`)
- Ghi chú (`note`)

**Quan hệ (relationships):**
- Hôn nhân: ai lấy ai
- Cha/mẹ – con: ai là cha/mẹ, ai là con
- Con nuôi: đánh dấu `adopted_child`

---

## Bước 3 — Hỏi làm rõ khi cần

Chỉ hỏi khi thông tin thực sự mơ hồ và ảnh hưởng đến cấu trúc cây:
- Giới tính không xác định được từ tên
- Ai là thế hệ 1 (gốc của cây gia phả)
- Thứ tự con cái nếu chưa rõ

Không hỏi từng field nhỏ — để trống là được.

---

## Bước 4 — Tạo UUIDs

Tạo đúng số UUID cần thiết (1 UUID mỗi người + 1 UUID mỗi quan hệ) bằng một lệnh Bash duy nhất:

```bash
python3 -c "import uuid; [print(uuid.uuid4()) for _ in range(TONG_SO_CAN)]"
```

Gán N UUID đầu tiên cho các thành viên (theo thứ tự sẽ liệt kê), phần còn lại cho các quan hệ.

---

## Bước 5 — Xây dựng nội dung CSV

### `persons.csv` — header chính xác:
```
id,full_name,gender,birth_year,birth_month,birth_day,death_year,death_month,death_day,death_lunar_year,death_lunar_month,death_lunar_day,is_deceased,is_in_law,birth_order,generation,other_names,avatar_url,note,created_at,updated_at
```

**Giá trị hợp lệ:**
| Field | Giá trị hợp lệ | Ghi chú |
|-------|----------------|---------|
| `id` | UUID v4 | Bắt buộc |
| `gender` | `male` / `female` / `other` | Bắt buộc |
| `birth_year` … `death_day` | Số nguyên hoặc **để trống** | Không dùng "null" |
| `death_lunar_year/month/day` | Số nguyên hoặc để trống | Ngày âm lịch |
| `is_deceased` | `false` / `true` | Chuỗi **lowercase**, không dùng `0`/`1` hay Python `True`/`False` |
| `is_in_law` | `false` / `true` | Chuỗi **lowercase**; `true` cho dâu/rể nhập gia |
| `birth_order` | Số nguyên bắt đầu từ 1, hoặc để trống | Thứ tự con trong gia đình |
| `generation` | Số nguyên bắt đầu từ 1, hoặc để trống | Tổ cao nhất = 1 |
| `other_names`, `note` | Văn bản tự do hoặc để trống | |
| `avatar_url` | URL hoặc để trống | |
| `created_at`, `updated_at` | **Để trống** | Bị bỏ qua khi import |

### `relationships.csv` — header chính xác:
```
id,type,person_a,person_b,note,created_at,updated_at
```

**Giá trị hợp lệ:**
| Field | Giá trị hợp lệ | Ghi chú |
|-------|----------------|---------|
| `id` | UUID v4 | Bắt buộc |
| `type` | `marriage` / `biological_child` / `adopted_child` | |
| `person_a` | UUID | Quan hệ con: **cha hoặc mẹ**; hôn nhân: một trong hai |
| `person_b` | UUID | Quan hệ con: **đứa con**; hôn nhân: người còn lại |
| `note` | Văn bản hoặc để trống | |
| `created_at`, `updated_at` | **Để trống** | |

**Quy tắc quan hệ:**
- Mỗi **đứa con** cần **2 dòng** nếu biết cả cha lẫn mẹ: một dòng với `person_a = id_cha`, một dòng với `person_a = id_me`. Cả hai đều có `person_b = id_con`.
- `marriage`: chiều không quan trọng, nhất quán là được.
- Không được tạo quan hệ với chính mình (`person_a == person_b`).

---

## Bước 6 — Ghi file CSV và tạo ZIP

Dùng Python `csv.writer` để đảm bảo tên tiếng Việt, dấu phẩy trong tên được xử lý đúng.

> ⚠️ **Quan trọng**: `is_deceased` và `is_in_law` phải là chuỗi `"true"`/`"false"` lowercase. **Không dùng Python boolean `True`/`False`** — csv.writer sẽ ghi thành `True`/`False` (uppercase), và PapaParse sẽ không nhận ra là boolean, dẫn đến dữ liệu sai.

Output mặc định lưu vào thư mục `./data` trong project. Tạo thư mục nếu chưa có, sau đó ghi file vào đó.

```bash
mkdir -p ./data && python3 << 'PYEOF'
import csv, os

OUT = "./data"

persons_header = ["id","full_name","gender","birth_year","birth_month","birth_day","death_year","death_month","death_day","death_lunar_year","death_lunar_month","death_lunar_day","is_deceased","is_in_law","birth_order","generation","other_names","avatar_url","note","created_at","updated_at"]
persons_rows = [
    # Mỗi list là một thành viên, dùng "" cho field để trống
    # is_deceased và is_in_law: dùng chuỗi "true"/"false" (lowercase)
    # VD: ["uuid-1", "Nguyễn Văn A", "male", 1950, "", "", "", "", "", "", "", "", "false", "false", "", 1, "", "", "", "", ""],
]

rels_header = ["id","type","person_a","person_b","note","created_at","updated_at"]
rels_rows = [
    # UUID của relationships không bắt buộc phải chính xác (DB tự generate khi import)
    # nhưng vẫn điền để dễ quản lý nội bộ
    # VD: ["uuid-r1", "marriage", "uuid-1", "uuid-2", "", "", ""],
]

with open(os.path.join(OUT, "persons.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(persons_header)
    w.writerows(persons_rows)

with open(os.path.join(OUT, "relationships.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(rels_header)
    w.writerows(rels_rows)

print(f"Đã ghi xong {OUT}/persons.csv và {OUT}/relationships.csv.")
PYEOF
```

Sau đó tạo file ZIP:
```bash
TS=$(date +%Y-%m-%d_%H%M)
zip "./data/giapha-${TS}.zip" ./data/persons.csv ./data/relationships.csv
echo "Đã tạo: $(pwd)/data/giapha-${TS}.zip"
```

---

## Bước 7 — Báo cáo kết quả

Thông báo cho user:
- Tên và đường dẫn file ZIP
- Số thành viên và số quan hệ đã tạo
- Hướng dẫn: vào `/dashboard/data`, nhấn **Import**, chọn file ZIP

---

## Xử lý các trường hợp đặc biệt

- **Đa thê / đa phu**: tạo một dòng `marriage` cho mỗi cặp vợ chồng; mỗi đứa con vẫn cần 2 dòng quan hệ (cha + mẹ).
- **Chỉ biết một phụ huynh**: chỉ tạo 1 dòng `biological_child` cho phụ huynh đó.
- **Người gốc không có cha mẹ trong cây**: đặt `generation = 1`, `is_in_law = false`.
- **Con nuôi**: dùng `adopted_child` thay vì `biological_child`.
- **Người đã mất**: đặt `is_deceased = true`; điền năm mất và ngày âm lịch nếu biết.
- **Tên có dấu phẩy**: Python csv.writer tự xử lý, không cần làm gì thêm.
- **Chỉ tạo persons + relationships**: Skill này không tạo `person_details_private.csv` hay `custom_events.csv`. App vẫn import bình thường khi thiếu 2 file này — chúng là tùy chọn.
