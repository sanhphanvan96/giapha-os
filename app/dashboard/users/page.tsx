import AdminUserList from "@/components/AdminUserList";
import { AdminUserData } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();

  // Fetch users via RPC
  const { data: users, error } = await supabase.rpc("get_admin_users");

  if (error) {
    console.error("Error fetching users:", error);
  }

  const typedUsers = (users as AdminUserData[]) || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-6">
          <h1 className="title">Quản lý Người dùng</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base">
            Danh sách các tài khoản đang tham gia vào hệ thống.
          </p>
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {/* Admin */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Admin
              </span>
              <span className="text-xs text-stone-400">Quản trị viên</span>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>Toàn quyền thêm, sửa, xóa thành viên</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>Quản lý tài khoản &amp; phân quyền</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>Import / Export dữ liệu</li>
            </ul>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                Editor
              </span>
              <span className="text-xs text-stone-400">Biên tập viên</span>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">•</span>Thêm, sửa, xóa thành viên</li>
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">•</span>Quản lý quan hệ trong gia phả</li>
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">•</span>Import / Export dữ liệu</li>
            </ul>
          </div>

          {/* Member */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-500 border border-stone-200">
                Member
              </span>
              <span className="text-xs text-stone-400">Thành viên</span>
            </div>
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">•</span>Xem cây gia phả &amp; sơ đồ</li>
              <li className="flex items-start gap-2"><span className="text-stone-400 mt-0.5">•</span>Xem hồ sơ từng thành viên</li>
              <li className="flex items-start gap-2"><span className="text-stone-300 mt-0.5">•</span><span className="text-stone-400">Không chỉnh sửa được</span></li>
            </ul>
          </div>
        </div>
        <AdminUserList initialUsers={typedUsers} currentUserId={profile.id} />
      </div>
    </main>
  );
}
