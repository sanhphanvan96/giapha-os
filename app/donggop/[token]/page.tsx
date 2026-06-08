import config from "@/app/config";
import ContributeForm from "@/components/ContributeForm";
import Footer from "@/components/Footer";
import { ContributionContext } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { AlertCircle, ArrowLeft, Clock, Network } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Đóng góp thông tin gia phả",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ContributePage({ params }: PageProps) {
  const { token } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc("get_contribution_context", {
    p_token: token,
  });

  const context = (data as ContributionContext | null) ?? null;

  // ── Link không hợp lệ / hết hạn / đã thu hồi ────────────────────────────
  if (error || !context || !context.valid) {
    const reason = context?.reason ?? "not_found";
    const reasonLabels: Record<string, string> = {
      not_found: "Link không tồn tại hoặc đã bị xóa.",
      revoked: "Link đóng góp này đã bị thu hồi.",
      expired: "Link đóng góp này đã hết hạn.",
    };
    const message = reasonLabels[reason] ?? "Link không hợp lệ.";

    return (
      <div className="min-h-screen bg-neutral text-primary flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border shadow-soft">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="size-8 rounded-xl bg-white flex items-center justify-center shrink-0 text-amber-600">
                <Network className="size-5" />
              </div>
              <h1 className="text-xl font-serif font-bold bg-rainbow-gradient bg-clip-text text-transparent animate-gradient-flow pb-0.5">
                {config.siteName}
              </h1>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-red-50 mb-4">
              <AlertCircle className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Link không hợp lệ</h2>
            <p className="text-stone-500 text-sm mb-6">{message}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Về trang chủ
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ── Form đóng góp ────────────────────────────────────────────────────────
  const expiresAt = context.expires_at ? new Date(context.expires_at) : null;
  const now = new Date();
  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-neutral text-primary flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border shadow-soft">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="size-8 rounded-xl bg-white flex items-center justify-center shrink-0 text-amber-600">
              <Network className="size-5" />
            </div>
            <h1 className="text-xl font-serif font-bold bg-rainbow-gradient bg-clip-text text-transparent animate-gradient-flow pb-0.5">
              {config.siteName}
            </h1>
          </Link>
          {daysLeft !== null && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Clock className="size-3.5" />
              <span>Còn {daysLeft} ngày</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-stone-800">Đóng góp thông tin gia phả</h2>
          <p className="text-stone-500 mt-1 text-sm">
            Bổ sung hoặc chỉnh sửa thông tin trong phạm vi được phép.
            Mọi thay đổi sẽ được quản trị viên xét duyệt trước khi lưu.
          </p>
          {context.note && (
            <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              {context.note}
            </div>
          )}
        </div>

        <ContributeForm
          token={token}
          context={context}
        />
      </main>

      <Footer />
    </div>
  );
}
