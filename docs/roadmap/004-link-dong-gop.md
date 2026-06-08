# 004 — Link đóng góp thông tin gia phả (có kiểm duyệt)

**Tạo:** 2026-06-07  
**Cập nhật:** 2026-06-07  
**Trạng thái:** 🟢 Đang làm  
**Plan chi tiết:** [`docs/plans/link-dong-gop.md`](../plans/link-dong-gop.md)  
**Nhánh:** `feat/link-dong-gop`

---

## Bối cảnh

Cho phép admin tạo link gửi cho người thân. Người nhận mở link (không cần đăng nhập) → bổ sung/sửa thông tin hoặc thêm người mới trong phạm vi được phép → vào hàng chờ → admin duyệt mới ghi vào DB.

---

## Việc cần làm

```
[x] 1. Migration — bảng contribution_links + contributions + 8 RPC
[x] 2. Types     — ContributionPayload, ContributionLink, PendingContribution, ContributionContext
[x] 3. Actions   — app/actions/contribution.ts (7 server actions)
[x] 4. Public page — /donggop/[token]
[x] 5. ContributeForm component
[x] 6. Trang admin duyệt — /dashboard/contributions
[x] 7. ContributionReview component + diff viewer
[x] 8. Tích hợp vào trang Sharing (ContributionLinkManager)
[x] 9. HeaderMenu link "Duyệt đề xuất" (admin)
[x] 10. Tests logic pass 11/11 (utils/contributionHelpers.test.ts)
[x] 11. supabase migration up local OK; bun run build pass
```
