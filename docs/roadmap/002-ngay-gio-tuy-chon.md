# 002 — Ngày giỗ tùy chọn

**Tạo:** 2026-06-07  
**Cập nhật:** 2026-06-07  
**Trạng thái:** ✅ Hoàn thành (commit `b7f6aac`)

---

## Bối cảnh

Ngày giỗ (death anniversary) trong phong tục Việt Nam có thể không trùng với ngày mất ghi trên giấy tờ — gia đình có thể chọn ngày theo lịch âm hoặc một ngày khác để tổ chức. Hiện tại hệ thống chỉ có `death_date`; cần thêm trường riêng để lưu ngày giỗ tùy chọn.

---

## Việc cần làm

```
[x] 1. Migration — thêm cột anniversary_date vào bảng persons
[x] 2. UI form    — tùy chọn nhập ngày giỗ riêng khi thêm/sửa thành viên
[x] 3. Hiển thị  — trang chi tiết thành viên hiển thị ngày giỗ nếu có
[x] 4. Thông báo — dùng anniversary_date nếu có, fallback về death_date
```

---

## Chi tiết từng bước

### 1. Migration

Thêm cột `anniversary_date` kiểu `date` (nullable) vào bảng `persons`.

```sql
ALTER TABLE persons ADD COLUMN anniversary_date date;
```

### 2. UI form

Trong form thêm/sửa thành viên, sau trường ngày mất, thêm checkbox "Ngày giỗ khác ngày mất" — nếu tick thì hiện input ngày giỗ tùy chọn.

### 3. Hiển thị

Trang `/dashboard/members/[id]`: hiển thị "Ngày giỗ" nếu `anniversary_date` khác null, kèm chú thích nếu khác `death_date`.

### 4. Thông báo

Khi tính toán và gửi nhắc giỗ: ưu tiên `anniversary_date`, fallback về `death_date` nếu `anniversary_date` là null.
