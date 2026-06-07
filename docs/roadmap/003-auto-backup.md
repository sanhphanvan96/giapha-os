# 003 — Tự động backup dữ liệu hàng ngày

**Tạo:** 2026-06-07  
**Cập nhật:** 2026-06-07  
**Trạng thái:** 🟡 Chưa bắt đầu

---

## Bối cảnh

Dữ liệu gia phả cần được backup tự động mỗi ngày để phòng trường hợp mất dữ liệu. Cần chọn 1 trong 3 hướng triển khai trước khi bắt đầu code.

---

## Chọn hướng triển khai

```
[ ] Quyết định hướng triển khai (Pi / VPS / Cloudflare)
```

### Hướng A — Raspberry Pi (có sẵn ở nhà)

- **Ưu:** Miễn phí hoàn toàn, kiểm soát toàn bộ, dễ debug
- **Nhược:** Mất điện / mạng nhà là mất backup, cần để Pi chạy 24/7
- **Cách làm:** Bash script + crontab, lưu JSON local, tùy chọn sync lên Google Drive bằng `rclone`

### Hướng B — VPS (Oracle Free, Hetzner, DigitalOcean...)

- **Ưu:** Ổn định hơn Pi, uptime cao, dễ monitor
- **Nhược:** Tốn tiền (trừ Oracle Free Tier — miễn phí vĩnh viễn 2 VM ARM)
- **Cách làm:** Tương tự Pi — bash script + crontab. Oracle Free Tier đáng cân nhắc nhất vì miễn phí và ổn định
- **Gợi ý:** Oracle Cloud Free Tier (ARM VM, 24GB RAM, miễn phí vĩnh viễn)

### Hướng C — Cloudflare (nghiên cứu thêm)

- **Ưu:** Serverless, không cần quản lý máy chủ, free tier rộng
- **Nhược:** Cần nghiên cứu thêm — Cloudflare Workers có giới hạn CPU time (10ms/request free), Cloudflare Cron Triggers chạy được nhưng không lưu file local được
- **Khả năng:** Dùng **Cloudflare Workers + Cron Trigger** để export data → đẩy lên **R2** (object storage, 10GB free) hoặc **D1** (SQLite, 5GB free)
- **Cần nghiên cứu:** Giới hạn CPU time có đủ để fetch nhiều bảng không; R2 có phù hợp để lưu JSON backup không

---

## Dữ liệu cần backup

**Thứ tự backup (theo dependency):**

| Bảng | Mức độ |
|---|---|
| `persons` | Bắt buộc |
| `relationships` | Bắt buộc |
| `person_details_private` | Bắt buộc |
| `custom_events` | Bắt buộc |
| `profiles` | Nên có |
| `gallery_items` | Nên có |
| Storage (avatars, gallery) | Tùy chọn, hàng tuần |

> Không backup `auth.users` (không truy cập được qua REST API) và `share_views` (chỉ là audit log).

---

## Việc cần làm (sau khi chọn hướng)

```
[ ] 1. Chọn hướng A / B / C
[ ] 2. Viết script backup
[ ] 3. Cấu hình cron / trigger chạy lúc 2:00 AM hàng ngày
[ ] 4. Test restore từ file backup
[ ] 5. (Tùy chọn) Thông báo khi backup thành công / thất bại
[ ] 6. (Tùy chọn) Backup file ảnh từ Storage (hàng tuần)
```

---

## Thứ tự restore khi cần

1. `persons`
2. `relationships`
3. `person_details_private`
4. `custom_events`
5. `profiles`
6. File ảnh (Storage)
