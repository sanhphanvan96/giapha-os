"use client";

import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { Clock, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] select-none relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#fef3c7,transparent)] pointer-events-none" />

      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-300/20 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-[0%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-amber-100/30 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          className="max-w-md w-full bg-white/70 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 relative overflow-hidden text-center"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100/50 to-transparent rounded-bl-[100px] pointer-events-none" />

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-amber-50 rounded-2xl shadow-sm ring-1 ring-amber-100">
                <Shield className="size-9 text-amber-600" />
              </div>
              <motion.div
                className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow ring-1 ring-stone-100"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Clock className="size-4 text-amber-500" />
              </motion.div>
            </div>
          </div>

          {/* Text */}
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-3">
            Chờ xét duyệt
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-2">
            Tài khoản của bạn đã được tạo thành công.
          </p>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            Vui lòng chờ quản trị viên phê duyệt để truy cập vào hệ thống gia phả.
          </p>

          {/* Info box */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8 text-left">
            <p className="text-[13px] text-amber-800 font-medium leading-relaxed">
              💡 Sau khi được duyệt, bạn có thể đăng nhập lại và truy cập toàn bộ nội dung gia phả.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 text-[14px] font-bold rounded-xl text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 focus:outline-none disabled:opacity-70 disabled:cursor-wait transition-all duration-300 shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:shadow-stone-900/20 hover:-translate-y-0.5"
            >
              <LogOut className="size-4" />
              {loading ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>

            <Link
              href="/"
              className="w-full text-sm font-semibold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200/80 py-3.5 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] focus:outline-none transition-all duration-200 text-center"
            >
              Về trang chủ
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer className="bg-transparent relative z-10 border-none mt-auto" />
    </div>
  );
}
