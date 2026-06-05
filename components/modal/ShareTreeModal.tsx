"use client";

import { createShareLink, deleteShareLink, getShareLinks } from "@/app/actions/share";
import { useMemberListView } from "@/context/MemberListContext";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, Copy, Loader2, Share2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ShareTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareTreeModal({ isOpen, onClose }: ShareTreeModalProps) {
  const { rootId, view } = useMemberListView();
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeLinks, setActiveLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Lấy gốc URL hiện tại
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Tải danh sách liên kết hoạt động
  const fetchLinks = async () => {
    setLinksLoading(true);
    const result = await getShareLinks();
    if ("links" in result && Array.isArray(result.links)) {
      setActiveLinks(result.links);
    }
    setLinksLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
      setGeneratedLink(null);
      setCopied(false);
      setError(null);
    }
  }, [isOpen]);

  const handleCreateLink = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    // Lưu các cấu hình hiện tại để khi khách vào sẽ thấy đúng chế độ xem
    const settings = {
      rootId,
      view,
    };

    const result = await createShareLink(expiryDays, settings);

    if ("error" in result) {
      setError(result.error as string);
      setLoading(false);
      return;
    }

    if (result.success && result.token) {
      const fullUrl = `${origin}/chiase/${result.token}`;
      setGeneratedLink(fullUrl);
      fetchLinks();
    }
    setLoading(false);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDeleteLink = async (token: string) => {
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn thu hồi liên kết này không? Người nhận link sẽ không thể xem cây gia phả được nữa.");
    if (!confirmDelete) return;

    const result = await deleteShareLink(token);
    if ("success" in result) {
      fetchLinks();
      if (generatedLink?.includes(token)) {
        setGeneratedLink(null);
      }
    }
  };

  // Ngăn cuộn trang phía sau khi mở modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
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
          {/* Backdrop click away */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-stone-200 p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-150">
              <h3 className="text-xl font-serif font-bold text-stone-850 flex items-center gap-2">
                <Share2 className="size-5 text-amber-600" />
                Chia sẻ cây gia phả
              </h3>
              <button
                onClick={onClose}
                className="size-8 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-950 transition-all border border-stone-200/50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4 flex-1">
              <p className="text-sm text-stone-500 font-medium">
                Tạo liên kết chia sẻ an toàn để những người không có tài khoản vẫn có thể xem cây gia phả của bạn ở chế độ chỉ đọc.
              </p>

              {/* Expiry Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                  THỜI HẠN LIÊN KẾT
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExpiryDays(7)}
                    className={`flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      expiryDays === 7
                        ? "bg-amber-50 border-amber-400 text-amber-700 shadow-sm"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Calendar className="size-4" />
                    7 Ngày (Mặc định)
                  </button>
                  <button
                    onClick={() => setExpiryDays(30)}
                    className={`flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      expiryDays === 30
                        ? "bg-amber-50 border-amber-400 text-amber-700 shadow-sm"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Calendar className="size-4" />
                    30 Ngày
                  </button>
                </div>
              </div>

              {/* Generate button */}
              {!generatedLink && (
                <button
                  onClick={handleCreateLink}
                  disabled={loading}
                  className="w-full h-11 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Đang tạo liên kết...
                    </>
                  ) : (
                    <>
                      Tạo liên kết chia sẻ
                    </>
                  )}
                </button>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Result Link Display */}
              {generatedLink && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    LIÊN KẾT ĐÃ ĐƯỢC TẠO
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      onClick={() => handleCopy(generatedLink)}
                      className="flex-1 px-3 h-10 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none cursor-pointer truncate font-mono font-medium"
                    />
                    <button
                      onClick={() => handleCopy(generatedLink)}
                      className="size-10 bg-stone-900 text-white rounded-xl hover:bg-stone-800 flex items-center justify-center shrink-0 shadow-sm transition-all active:scale-95"
                      title="Sao chép vào Clipboard"
                    >
                      {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700/80 font-semibold italic">
                    * Bất cứ ai có liên kết này đều có thể xem cây gia phả. Hãy chia sẻ có cẩn trọng.
                  </p>
                </div>
              )}

              {/* Active Links History */}
              <div className="pt-2">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  LIÊN KẾT ĐANG HOẠT ĐỘNG ({activeLinks.length})
                </div>

                {linksLoading && activeLinks.length === 0 ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-stone-400" />
                  </div>
                ) : activeLinks.length === 0 ? (
                  <div className="text-center py-4 text-xs text-stone-400 font-semibold italic">
                    Chưa có liên kết chia sẻ nào hoạt động.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {activeLinks.map((link) => {
                      const fullUrl = `${origin}/chiase/${link.token}`;
                      const isExpired = new Date(link.expires_at) < new Date();
                      return (
                        <div
                          key={link.token}
                          className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-150 rounded-xl text-xs"
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-mono text-stone-800 font-medium truncate">
                              /chiase/{link.token}
                            </p>
                            <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                              Hạn dùng: {new Date(link.expires_at).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                handleCopy(fullUrl);
                                alert("Đã sao chép liên kết vào bộ nhớ tạm!");
                              }}
                              className="size-7 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg flex items-center justify-center hover:text-stone-900 transition-colors"
                              title="Sao chép"
                            >
                              <Copy className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.token)}
                              className="size-7 bg-white hover:bg-red-50 border border-stone-200 text-stone-500 rounded-lg flex items-center justify-center hover:text-red-600 hover:border-red-200 transition-colors"
                              title="Thu hồi liên kết"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
