import LineageManager from "@/components/LineageManager";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import { Person } from "@/types";

export default async function LineagePage() {
  const profile = await getProfile();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();

  const { data: personsData } = await supabase
    .from("persons")
    .select(
      "id, full_name, gender, birth_year, generation, birth_order, is_in_law",
    )
    .order("birth_year", { ascending: true, nullsFirst: false });

  const { data: relsData } = await supabase.from("relationships").select("*");

  // Identify "roots" - people with no parents
  const persons = (personsData || []) as Person[];
  const relationships = relsData || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="title">Thứ tự gia phả</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            Tự động tính toán và cập nhật{" "}
            <strong className="text-stone-700">thế hệ</strong>,{" "}
            <strong className="text-stone-700">thứ tự sinh</strong> và{" "}
            <strong className="text-stone-700">trạng thái Dâu/Rể</strong> cho
            tất cả thành viên. Xem preview trước khi áp dụng.
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌳</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Thế hệ (Generation)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Dùng thuật toán BFS từ các tổ tiên gốc (người chưa có thông
                  tin bố/mẹ trong hệ thống). Tổ tiên = Đời 1, con = Đời 2, cháu
                  = Đời 3... Con dâu/rể kế thừa đời của người bạn đời.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👶</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Thứ tự sinh (Birth Order)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Trong danh sách anh/chị/em cùng cha, sắp xếp theo năm sinh
                  tăng dần và gán số thứ tự 1, 2, 3... Con dâu/rể không được
                  tính thứ tự.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💍</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Dâu / Rể (In-Law Status)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Tự động xác định là dâu/rể nếu thành viên có vợ/chồng trong hệ
                  thống nhưng không có thông tin bố/mẹ. Giúp hiển thị đúng thẻ
                  phân loại ngoài danh sách.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-8 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <span className="text-red-500 mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">
              Lưu ý quan trọng trước khi áp dụng
            </p>
            <p className="text-xs text-red-600 leading-relaxed">
              Thao tác này sẽ <strong>ghi đè</strong> dữ liệu thế hệ, thứ tự sinh và trạng thái Dâu/Rể của{" "}
              <strong>tất cả thành viên</strong>. Hãy kiểm tra kỹ phần preview và đảm bảo dữ liệu quan hệ
              (bố/mẹ, vợ/chồng) đã chính xác trước khi xác nhận.
            </p>
          </div>
        </div>

        {/* Manager */}
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
          <LineageManager persons={persons} relationships={relationships} />
        </div>
      </div>
    </main>
  );
}
