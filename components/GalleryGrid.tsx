"use client";

import { GalleryItem } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CalendarDays, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/components/UserProvider";

interface GalleryGridProps {
  items: GalleryItem[];
  isAdmin?: boolean;
  isEditor?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onDeleteSuccess?: (id: string) => void;
}

export default function GalleryGrid({
  items,
  isAdmin,
  isEditor,
  onEdit,
  onDeleteSuccess,
}: GalleryGridProps) {
  const { user } = useUser();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = useCallback(() => setSelectedIndex(null), []);

  const handlePrev = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i < items.length - 1 ? i + 1 : i));
  }, [items.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  useEffect(() => {
    document.body.style.overflow = selectedIndex !== null ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex]);

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hình ảnh này?")) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();

      const fileName = item.image_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("gallery").remove([fileName]);
      }

      const { error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", item.id);
      if (error) throw error;

      setSelectedIndex(null);
      if (onDeleteSuccess) onDeleteSuccess(item.id);
    } catch (err) {
      console.error("Error deleting gallery item", err);
      alert("Đã xảy ra lỗi khi xóa hình ảnh.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-stone-100 shadow-sm">
        <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mb-4 border border-stone-100">
          <Maximize2 className="size-8 text-stone-300" />
        </div>
        <h3 className="text-xl font-bold text-stone-700 mb-2">
          Chưa có hình ảnh nào
        </h3>
        <p className="text-stone-500 max-w-sm">
          Hãy là người đầu tiên thêm hình ảnh để lưu giữ những kỷ niệm đẹp của
          dòng họ.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-stone-100 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
            onClick={() => setSelectedIndex(index)}
          >
            {/* Image */}
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay — always visible on mobile, hover-only on desktop */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
              <div className="transform sm:translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">
                  {item.title}
                </h3>
                {item.event_date && (
                  <p className="text-stone-300 text-sm flex items-center gap-1.5 font-medium">
                    <CalendarDays className="size-3.5" />
                    {dayjs(item.event_date).format("DD/MM/YYYY")}
                  </p>
                )}
              </div>
            </div>

            {/* Maximize icon — always visible on mobile, hover-only on desktop */}
            <div className="absolute top-4 right-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                <Maximize2 className="size-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col lg:items-center lg:justify-center bg-black/90 backdrop-blur-sm"
          >
            {/* Top bar: counter + close */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
              {items.length > 1 ? (
                <span className="text-white/70 text-sm font-medium tabular-nums">
                  {selectedIndex! + 1} / {items.length}
                </span>
              ) : (
                <span />
              )}
              <button
                onClick={handleClose}
                className="size-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Card: full-screen mobile, centered card on desktop */}
            <div className="flex flex-col lg:flex-row w-full h-full lg:h-auto lg:max-w-6xl lg:max-h-[90vh] lg:rounded-2xl bg-stone-950 lg:overflow-hidden lg:shadow-2xl pt-12 lg:pt-0">

              {/* Image area */}
              <div className="flex-1 min-h-0 relative flex items-center justify-center bg-black/50 p-2 lg:p-6">
                {items.length > 1 && (
                  <button
                    onClick={handlePrev}
                    disabled={selectedIndex === 0}
                    className="absolute left-3 z-10 size-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors disabled:opacity-30 backdrop-blur-sm"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                )}

                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.title}
                  className="max-w-full max-h-full object-contain lg:rounded-lg"
                />

                {items.length > 1 && (
                  <button
                    onClick={handleNext}
                    disabled={selectedIndex === items.length - 1}
                    className="absolute right-3 z-10 size-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors disabled:opacity-30 backdrop-blur-sm"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                )}
              </div>

              {/* Info panel */}
              <div className="w-full lg:w-96 bg-white flex flex-col shrink-0 max-h-[38vh] lg:max-h-none overflow-y-auto">
                <div className="p-5 lg:p-8 flex-1">
                  <h2 className="text-xl font-bold text-stone-800 mb-3 leading-tight">
                    {selectedItem.title}
                  </h2>

                  {selectedItem.event_date && (
                    <div className="flex items-center gap-2 text-stone-500 font-medium mb-4 pb-4 border-b border-stone-100">
                      <CalendarDays className="size-4 shrink-0" />
                      <span>
                        {dayjs(selectedItem.event_date).format("DD/MM/YYYY")}
                      </span>
                    </div>
                  )}

                  {selectedItem.description ? (
                    <div className="prose prose-stone text-stone-600">
                      <p className="whitespace-pre-wrap leading-relaxed text-sm lg:text-base">
                        {selectedItem.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-stone-400 italic text-sm">
                      Không có nội dung mô tả.
                    </p>
                  )}
                </div>

                <div className="p-4 lg:p-6 bg-stone-50 border-t border-stone-100 text-xs text-stone-400 font-medium flex justify-between items-center shrink-0">
                  <span>
                    Đã thêm vào{" "}
                    {dayjs(selectedItem.created_at).format("DD/MM/YYYY")}
                  </span>

                  {(isAdmin ||
                    (isEditor && selectedItem.created_by === user?.id)) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleClose();
                          if (onEdit) onEdit(selectedItem);
                        }}
                        className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 hover:text-stone-900 font-medium text-sm transition-all shadow-sm"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(selectedItem)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDeleting ? "Đang xóa..." : "Xóa"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
