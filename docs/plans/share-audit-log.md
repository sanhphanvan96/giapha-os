# Kế hoạch: Audit log / Thống kê lượt xem cho trang chia sẻ

## Context

Trang chia sẻ công khai (`/chiase/[token]`) hiện không ghi lại bất kỳ thông tin truy cập nào.
Admin muốn biết: **ai đã vào** (IP), **bằng thiết bị/trình duyệt gì** (User-Agent), **ở thành phố nào**
(vd Đà Nẵng — mặc định quốc gia là VN nên không lưu country), **đếm tổng số lượt xem** mỗi link chia sẻ,
và **referrer** (đến từ Facebook/Zalo/trực tiếp). Chỉ admin được xem. Yêu cầu: ổn định, miễn phí.

Giải pháp: tự xây trên Supabase (free tier dư dùng), lấy vị trí địa lý qua **Vercel headers**
(không tốn API call), ghi log server-side khi trang chia sẻ được mở.

## Design decisions

- **Geo qua Vercel headers**: `x-vercel-ip-city` (city), không lưu country/region (ngầm định VN).
  City bị URL-encode → cần `decodeURIComponent`. Nếu không deploy trên Vercel thì city = `null` ("Không xác định").
- **Lưu IP đầy đủ** (admin yêu cầu "biết IP nào vào"), chỉ admin xem được qua RLS.
- **Ghi log server-side** trong Server Component `app/chiase/[token]/page.tsx`, sau khi RPC xác thực token
  thành công. Gọi qua **RPC `SECURITY DEFINER`** (`log_share_view`) để không phải mở RLS insert cho `anon`.
  Insert là **fire-and-forget** (bọc try/catch, không chặn render, lỗi log không làm hỏng trang).
- **Phân loại thiết bị** (mobile/tablet/desktop) bằng helper regex thuần — không thêm thư viện.
- **Auto-cleanup: lazy throttled** — RPC `log_share_view` tự xóa các dòng > 30 ngày, chạy ~5% số lượt
  (`random() < 0.05`), nằm trong DEFINER nên không block request. Thuần code, không cần chạm Supabase Dashboard.
- **Xem audit log: modal tại chỗ** trong `/dashboard/sharing` — mỗi link có nút "Lượt xem" mở popup
  hiện tổng số + nhật ký chi tiết. Không tạo trang/menu mới.
- **Đọc dữ liệu admin** qua 2 RPC `SECURITY DEFINER` có guard `is_admin()`:
  `get_share_view_stats()` (tổng hợp theo token) và `get_share_views(p_token, p_limit)` (chi tiết 1 link).

## Architecture / data flow

```
Khách mở /chiase/[token]
  → page.tsx: rpc("get_shared_family_tree") xác thực token (đã có)
  → nếu hợp lệ: đọc headers() lấy ip / user-agent / city / referrer
  → rpc("log_share_view", {...})  [fire-and-forget, DEFINER insert + cleanup ~5%]

Admin mở /dashboard/sharing
  → page.tsx: Promise.all([getShareLinks(), rpc("get_share_view_stats")])
  → AdminSharingList hiện badge tổng lượt xem / link
  → bấm "Lượt xem" → modal gọi action getShareViews(token) → rpc("get_share_views")
```

## Files to change

| File | Thay đổi |
|---|---|
| `supabase/migrations/20260607000000_add_share_views.sql` | **MỚI**: bảng `share_views` + RLS + 3 RPC |
| `utils/shareAnalytics.ts` | **MỚI**: `getRequestMeta(headers)` + `parseDeviceType(ua)` |
| `app/chiase/[token]/page.tsx` | Đọc headers, gọi `log_share_view` fire-and-forget |
| `app/actions/share.ts` | Thêm `getShareViews(token)` và `getShareViewStats()` |
| `app/dashboard/sharing/page.tsx` | Fetch thêm `get_share_view_stats`, truyền `viewStats` |
| `components/AdminSharingList.tsx` | Badge lượt xem + nút mở `ShareViewsModal` |
| `components/modal/ShareViewsModal.tsx` | **MỚI**: modal nhật ký chi tiết |
| `app/actions/share.test.ts` | Thêm test `getShareViews` / `getShareViewStats` |
| `docs/schema.sql` | Bổ sung `share_views` + RPC |

## Verification

```bash
supabase migration up
bun run lint
bun test
bun run build
```

Manual:
- [ ] Mở `/chiase/<token>` hợp lệ → dòng mới trong `share_views`
- [ ] Mở nhiều lần → tổng lượt xem tăng đúng
- [ ] Trang chia sẻ vẫn render bình thường khi RPC log lỗi
- [ ] `device_type` đúng (mobile vs desktop)
- [ ] `/dashboard/sharing` admin: thấy badge + modal nhật ký
- [ ] Editor/member: `getShareViews` trả lỗi "Access denied"
- [ ] Referrer hiển thị khi vào từ trang khác

## Verification checklist

- [ ] Mở `/chiase/<token>` hợp lệ → dòng mới trong `share_views`
- [ ] Mở nhiều lần → tổng lượt xem tăng đúng
- [ ] Trang chia sẻ vẫn render bình thường khi RPC log lỗi
- [ ] `device_type` đúng (mobile vs desktop)
- [ ] `/dashboard/sharing` admin: thấy badge + modal nhật ký
- [ ] Editor/member: `getShareViews` trả lỗi "Access denied"
- [ ] Referrer hiển thị khi vào từ trang khác

## Progress log

- 2026-06-07: Lập kế hoạch và triển khai hoàn chỉnh. Migration, helper, log trong page, 2 actions mới,
  modal ShareViewsModal, badge trong AdminSharingList, 11 tests pass, build OK.
