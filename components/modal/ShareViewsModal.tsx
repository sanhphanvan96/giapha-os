"use client";

import { getShareViews, ShareView } from "@/app/actions/share";
import { parseDeviceLabel, parseSource } from "@/utils/shareAnalytics";
import { AnimatePresence, motion } from "framer-motion";
import {
  Globe,
  Laptop,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ShareViewsModalProps {
  token: string | null; // null = đóng modal
  onClose: () => void;
}

function DeviceIcon({ type }: { type: string | null }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="size-3.5 shrink-0" />;
    case "tablet":
      return <Tablet className="size-3.5 shrink-0" />;
    case "desktop":
      return <Monitor className="size-3.5 shrink-0" />;
    default:
      return <Laptop className="size-3.5 shrink-0" />;
  }
}


export default function ShareViewsModal({ token, onClose }: ShareViewsModalProps) {
  const isOpen = !!token;
  const [views, setViews] = useState<ShareView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    // Tránh gọi setState synchronously trong effect body
    async function load() {
      setLoading(true);
      setViews([]);
      setError(null);
      const { data, error: err } = await getShareViews(token!, 100);
      setViews(data ?? []);
      setError(err ?? null);
      setLoading(false);
    }

    load();
  }, [token]);

  // Khóa scroll nền khi mở modal
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-stone-200 z-10 max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-850 flex items-center gap-2">
                  <Globe className="size-5 text-amber-600" />
                  Lượt xem — <span className="font-mono text-sm text-stone-500">{token}</span>
                </h3>
                {!loading && !error && (
                  <p className="text-xs text-stone-400 font-medium mt-0.5">
                    {views.length} lượt gần nhất (tối đa 100, giữ 30 ngày)
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="size-8 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 transition-all border border-stone-200/50 shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="size-6 animate-spin text-stone-400" />
                </div>
              )}

              {error && (
                <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              {!loading && !error && views.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm font-semibold italic">
                  Chưa có lượt xem nào được ghi lại.
                </div>
              )}

              {!loading && !error && views.length > 0 && (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-stone-50 border-b border-stone-200">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      <th className="px-4 py-2.5 w-28">Thời gian</th>
                      <th className="px-4 py-2.5">Thiết bị &amp; Thành phố</th>
                      <th className="px-4 py-2.5">IP &amp; Nguồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {views.map((v, i) => (
                      <tr key={i} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-semibold text-stone-700 tabular-nums align-top whitespace-nowrap">
                          {new Date(v.viewed_at).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
                            <DeviceIcon type={v.device_type} />
                            <span>{parseDeviceLabel(v.user_agent)}</span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5 pl-[18px]">
                            {v.city ?? <span className="italic">Không xác định</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap">
                          <div className="text-[11px] font-mono text-stone-500">{v.ip || "—"}</div>
                          <div className="text-[11px] text-stone-400 mt-0.5">{parseSource(v.referrer, v.user_agent)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
