import config from "@/app/config";
import Footer from "@/components/Footer";
import PublicShareView from "@/components/PublicShareView";
import { UserProvider } from "@/components/UserProvider";
import { ViewMode } from "@/components/ViewToggle";
import { Person } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { AlertCircle, ArrowLeft, Clock, Eye, Network } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicSharePage({ params }: PageProps) {
  const { token } = await params;

  // Khởi tạo Supabase client sử dụng anon key (không cần service_role)
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Gọi RPC kiểm tra token và trả về dữ liệu gia phả công khai
  const { data, error } = await supabase.rpc("get_shared_family_tree", {
    share_token: token,
  });

  if (error || !data) {
    // ── GIAO DIỆN LỖI / HẾT HẠN KHÁCH VÃNG LAI ─────────────────────────
    return (
      <div className="min-h-screen bg-neutral text-primary flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border shadow-soft transition-all duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-white flex items-center justify-center shrink-0 text-blue-600">
                <Network className="size-5" />
              </div>
              <h1 className="text-xl font-serif font-bold bg-rainbow-gradient bg-clip-text text-transparent animate-gradient-flow pb-0.5">
                {config.siteName}
              </h1>
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex h-9 items-center justify-center px-4 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full text-center bg-white border border-stone-200 rounded-3xl p-8 shadow-md">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle className="size-8" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-850 mb-3">
              Liên kết không hợp lệ hoặc đã hết hạn
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-6 font-medium">
              Đường dẫn chia sẻ này có thể đã hết hiệu lực (giới hạn thời hạn 7 ngày / 30 ngày) hoặc đã bị thu hồi bởi Người quản trị dòng họ.
            </p>
            <div className="space-y-2">
              <Link
                href="/login"
                className="w-full h-11 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                Đăng nhập hệ thống
              </Link>
              <Link
                href="/"
                className="w-full h-11 bg-transparent text-stone-600 hover:bg-stone-50 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border border-stone-200"
              >
                <ArrowLeft className="size-4" />
                Về trang chủ
              </Link>
            </div>
          </div>
        </main>
        <Footer className="mt-auto bg-white border-t border-stone-200" />
      </div>
    );
  }

  // Phân tách dữ liệu trả về từ RPC
  const { settings = {}, persons = [], relationships = [], custom_events = [], expires_at } = data as {
    settings: { rootId?: string | null; view?: ViewMode };
    persons: Person[];
    relationships: any[];
    custom_events: any[];
    expires_at?: string;
  };

  // Cấu hình ban đầu dựa theo cài đặt của Admin khi chia sẻ
  const initialView = settings.view || "tree";
  const initialRootId = settings.rootId || null;

  // Tính thời gian còn lại của liên kết chia sẻ
  let expiryLabel = "";
  if (expires_at) {
    const expiryDate = new Date(expires_at);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    if (diffMs > 0) {
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      if (diffHours < 24) {
        expiryLabel = `Hết hạn sau ${diffHours} giờ`;
      } else {
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        expiryLabel = `Hết hạn sau ${diffDays} ngày`;
      }
    }
  }

  return (
    <UserProvider user={null} profile={null}>
      <div className="min-h-screen bg-neutral text-primary flex flex-col font-sans">
        {/* Header dành cho khách xem công khai */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border shadow-soft transition-all duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <div className="size-8 rounded-xl bg-white flex items-center justify-center shrink-0 text-blue-600">
                  <Network className="size-5" />
                </div>
                <h1 className="text-base sm:text-lg md:text-xl font-serif font-bold bg-rainbow-gradient bg-clip-text text-transparent animate-gradient-flow pb-0.5 truncate max-w-[110px] min-[360px]:max-w-[150px] sm:max-w-none">
                  {config.siteName}
                </h1>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 border border-stone-200 text-stone-600 whitespace-nowrap">
                  <Eye className="size-3 shrink-0" />
                  <span className="hidden min-[360px]:inline">Chỉ xem</span>
                </span>
                {expiryLabel && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 border border-amber-200 text-amber-700 whitespace-nowrap">
                    <Clock className="size-3 shrink-0" />
                    <span>{expiryLabel}</span>
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/login"
              className="hidden sm:inline-flex h-9 items-center justify-center px-4 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors shrink-0"
            >
              Đăng nhập
            </Link>
          </div>
        </header>

        {/* Tab switcher view */}
        <PublicShareView
          persons={persons}
          relationships={relationships}
          customEvents={custom_events}
          initialView={initialView}
          initialRootId={initialRootId}
        />

        <Footer className="mt-auto bg-white border-t border-stone-200" />
      </div>
    </UserProvider>
  );
}
