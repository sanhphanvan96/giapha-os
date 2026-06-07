import AdminSharingList from "@/components/AdminSharingList";
import { getShareLinks, getShareViewStats, ShareViewStat } from "@/app/actions/share";
import { getProfile } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function AdminSharingPage() {
  const profile = await getProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  if (!canEdit) {
    redirect("/dashboard");
  }

  const isAdmin = profile?.role === "admin";

  // Fetch song song danh sách link + stats lượt xem (stats chỉ cho admin)
  const [linksResult, statsResult] = await Promise.all([
    getShareLinks(),
    isAdmin ? getShareViewStats() : Promise.resolve({ data: [] as ShareViewStat[] }),
  ]);

  const initialLinks = ("links" in linksResult && Array.isArray(linksResult.links))
    ? linksResult.links
    : [];
  const viewStats: ShareViewStat[] = ("data" in statsResult && Array.isArray(statsResult.data))
    ? statsResult.data
    : [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-6">
          <h1 className="title">Liên kết Chia sẻ</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base">
            Quản lý các đường dẫn cho phép người ngoài dòng họ xem sơ đồ phả hệ mà không cần đăng ký tài khoản.
          </p>
        </div>

        {/* Info Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {/* Rules */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Quy tắc chia sẻ
              </span>
              <span className="text-xs text-stone-400">Chỉ đọc &amp; Bảo mật</span>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Người xem không cần đăng nhập tài khoản.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Chế độ <strong>Chỉ đọc (Read-only)</strong>, không thể sửa đổi sơ đồ.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Ẩn hoàn toàn thông tin cá nhân (SĐT, địa chỉ, nghề nghiệp) của thành viên.</span>
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                Mẹo sử dụng
              </span>
              <span className="text-xs text-stone-400">Cấu hình &amp; Thu hồi</span>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-stone-400 mt-0.5">•</span>
                <span>Có thể đặt thời gian hết hạn tự động (7 ngày hoặc 30 ngày).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stone-400 mt-0.5">•</span>
                <span>Thu hồi liên kết (Xóa bỏ) lập tức chặn quyền truy cập của link đó.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stone-400 mt-0.5">•</span>
                <span>Link lưu cấu hình chế độ xem (Ví dụ: view, rootId) lúc bạn tạo ra.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Table list */}
        <AdminSharingList initialLinks={initialLinks} viewStats={viewStats} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
