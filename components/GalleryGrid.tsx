"use client";

import { GalleryItem } from "@/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  CalendarDays,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  MoreVertical,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const imgContainerRef = useRef<HTMLDivElement>(null);
  // Ref to read current zoom state inside event handlers without stale closure
  const zoomStateRef = useRef({ scale: 1, pan: { x: 0, y: 0 } });
  zoomStateRef.current = { scale, pan };

  // Lightbox UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
    setMenuOpen(false);
    setConfirmDeleteOpen(false);
    setInfoExpanded(false);
  }, []);

  const handlePrev = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i < items.length - 1 ? i + 1 : i));
  }, [items.length]);

  const zoomIn = useCallback(
    () => setScale((s) => Math.min(4, +(s + 0.5).toFixed(1))),
    []
  );
  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(1, +(s - 0.5).toFixed(1));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Reset zoom + UI state when switching photos
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setMenuOpen(false);
    setConfirmDeleteOpen(false);
    setInfoExpanded(false);
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDeleteOpen) {
          setConfirmDeleteOpen(false);
          return;
        }
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        handleClose();
      }
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, handleClose, handlePrev, handleNext, confirmDeleteOpen, menuOpen]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = selectedIndex !== null ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [menuOpen]);

  // Imperative event listeners for zoom + pan (wheel, pinch, drag, double-tap)
  useEffect(() => {
    const container = imgContainerRef.current;
    if (!container || selectedItem === null) return;

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let lastTap = 0;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const clampScale = (s: number) => Math.min(4, Math.max(1, s));

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => {
        const next = clampScale(+(s * (1 - e.deltaY * 0.002)).toFixed(2));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      if (zoomStateRef.current.scale <= 1) return;
      isDragging = true;
      dragStart = {
        x: e.clientX - zoomStateRef.current.pan.x,
        y: e.clientY - zoomStateRef.current.pan.y,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onDblClick = () => {
      const { scale: s } = zoomStateRef.current;
      if (s > 1) {
        setScale(1);
        setPan({ x: 0, y: 0 });
      } else {
        setScale(2);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDist = getDistance(e.touches[0], e.touches[1]);
        pinchStartScale = zoomStateRef.current.scale;
      } else if (e.touches.length === 1) {
        dragStart = {
          x: e.touches[0].clientX - zoomStateRef.current.pan.x,
          y: e.touches[0].clientY - zoomStateRef.current.pan.y,
        };
        // Double-tap detection
        const now = Date.now();
        if (now - lastTap < 300) {
          const { scale: s } = zoomStateRef.current;
          if (s > 1) {
            setScale(1);
            setPan({ x: 0, y: 0 });
          } else {
            setScale(2);
          }
        }
        lastTap = now;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const next = clampScale(pinchStartScale * (dist / pinchStartDist));
        setScale(next);
        if (next === 1) setPan({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && zoomStateRef.current.scale > 1) {
        e.preventDefault();
        setPan({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
    };

    const onTouchEnd = () => {
      pinchStartDist = 0;
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("dblclick", onDblClick);
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("dblclick", onDblClick);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [selectedItem]);

  // Download the current image
  const handleDownload = useCallback(async (item: GalleryItem) => {
    try {
      const response = await fetch(item.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = item.image_url.split(".").pop()?.split("?")[0] ?? "jpg";
      a.download = `${item.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(item.image_url, "_blank");
    }
  }, []);

  // Open the delete confirmation dialog
  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    setConfirmDeleteOpen(true);
  }, []);

  // Execute the actual deletion after user confirms
  const confirmDelete = useCallback(async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();

      const fileName = selectedItem.image_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("gallery").remove([fileName]);
      }

      const { error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", selectedItem.id);
      if (error) throw error;

      setSelectedIndex(null);
      setConfirmDeleteOpen(false);
      if (onDeleteSuccess) onDeleteSuccess(selectedItem.id);
    } catch (err) {
      console.error("Error deleting gallery item", err);
      alert("Đã xảy ra lỗi khi xóa hình ảnh.");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItem, onDeleteSuccess]);

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

  const canEdit =
    !!selectedItem &&
    (isAdmin || (isEditor && selectedItem.created_by === user?.id));

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
            {/* Top bar: counter + actions + close */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
              {items.length > 1 ? (
                <span className="text-white/70 text-sm font-medium tabular-nums">
                  {selectedIndex! + 1} / {items.length}
                </span>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                {/* Download — visible to all roles */}
                <button
                  onClick={() => handleDownload(selectedItem)}
                  className="size-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
                  aria-label="Tải ảnh xuống"
                >
                  <Download className="size-5" />
                </button>

                {/* Kebab menu — editors/admins only */}
                {canEdit && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((v) => !v)}
                      className="size-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
                      aria-label="Tùy chọn"
                    >
                      <MoreVertical className="size-5" />
                    </button>

                    <AnimatePresence>
                      {menuOpen && (
                        <motion.div
                          key="menu"
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl ring-1 ring-stone-100 overflow-hidden py-1 z-30"
                        >
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              handleClose();
                              if (onEdit) onEdit(selectedItem);
                            }}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-stone-700 hover:bg-stone-50 text-sm font-medium transition-colors"
                          >
                            <Pencil className="size-4 text-stone-400" />
                            Sửa thông tin
                          </button>
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                          >
                            <Trash2 className="size-4" />
                            Xóa ảnh
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={handleClose}
                  className="size-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
                  aria-label="Đóng"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Card: full-screen mobile, centered card on desktop */}
            <div className="flex flex-col lg:flex-row w-full h-full lg:h-auto lg:max-w-6xl lg:max-h-[90vh] lg:rounded-2xl bg-stone-950 lg:overflow-hidden lg:shadow-2xl pt-12 lg:pt-0">

              {/* Image area */}
              <div
                ref={imgContainerRef}
                className={`flex-1 min-h-0 relative flex items-center justify-center bg-black/50 overflow-hidden select-none ${scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
              >
                {/* Prev button */}
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
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                    transition: "transform 0.05s ease",
                    touchAction: "none",
                  }}
                  draggable={false}
                />

                {/* Next button */}
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

                {/* Zoom controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 1}
                    className="size-7 flex items-center justify-center text-white disabled:opacity-30 hover:text-stone-200 transition-colors"
                    aria-label="Thu nhỏ"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="text-white/70 text-xs font-medium tabular-nums w-10 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 4}
                    className="size-7 flex items-center justify-center text-white disabled:opacity-30 hover:text-stone-200 transition-colors"
                    aria-label="Phóng to"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile info strip — collapsible bottom bar */}
              <div className="lg:hidden bg-stone-900/95 backdrop-blur-sm shrink-0">
                <button
                  onClick={() => setInfoExpanded((v) => !v)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-semibold text-sm leading-tight truncate">
                      {selectedItem.title}
                    </h2>
                    {selectedItem.event_date && (
                      <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1">
                        <CalendarDays className="size-3 shrink-0" />
                        {dayjs(selectedItem.event_date).format("DD/MM/YYYY")}
                      </p>
                    )}
                  </div>
                  {infoExpanded ? (
                    <ChevronDown className="size-4 text-white/50 shrink-0" />
                  ) : (
                    <ChevronUp className="size-4 text-white/50 shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {infoExpanded && (
                    <motion.div
                      key="mobile-info"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-white/10">
                        {selectedItem.description ? (
                          <p className="text-white/70 text-sm leading-relaxed mt-3 whitespace-pre-wrap">
                            {selectedItem.description}
                          </p>
                        ) : (
                          <p className="text-white/30 italic text-sm mt-3">
                            Không có nội dung mô tả.
                          </p>
                        )}
                        <p className="text-white/30 text-xs mt-3">
                          Đã thêm vào{" "}
                          {dayjs(selectedItem.created_at).format("DD/MM/YYYY")}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop info panel */}
              <div className="hidden lg:flex lg:w-96 bg-white flex-col shrink-0 overflow-y-auto">
                <div className="p-8 flex-1">
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
                      <p className="whitespace-pre-wrap leading-relaxed text-base">
                        {selectedItem.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-stone-400 italic text-sm">
                      Không có nội dung mô tả.
                    </p>
                  )}
                </div>

                <div className="p-6 bg-stone-50 border-t border-stone-100 text-xs text-stone-400 font-medium shrink-0">
                  Đã thêm vào{" "}
                  {dayjs(selectedItem.created_at).format("DD/MM/YYYY")}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {confirmDeleteOpen && selectedItem && (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">
                  Xóa hình ảnh?
                </h3>
              </div>
              <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                Hình ảnh{" "}
                <span className="font-medium text-stone-700">
                  &ldquo;{selectedItem.title}&rdquo;
                </span>{" "}
                sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
