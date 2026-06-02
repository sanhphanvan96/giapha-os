"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMemberListView } from "@/context/MemberListContext";
import ExportButton from "./ExportButton";

export interface BaseToolbarProps {
  hideDaughtersInLaw: boolean;
  setHideDaughtersInLaw: (val: boolean) => void;
  hideSonsInLaw: boolean;
  setHideSonsInLaw: (val: boolean) => void;
  hideDaughters: boolean;
  setHideDaughters: (val: boolean) => void;
  hideSons: boolean;
  setHideSons: (val: boolean) => void;
  hideMales: boolean;
  setHideMales: (val: boolean) => void;
  hideFemales: boolean;
  setHideFemales: (val: boolean) => void;
  hideExpandButtons?: boolean;
  setHideExpandButtons?: (val: boolean) => void;
  autoCollapseLevel?: number;
  setAutoCollapseLevel?: (val: number) => void;
  canEdit?: boolean;
  children?: React.ReactNode;
}

export default function BaseToolbar({
  hideDaughtersInLaw,
  setHideDaughtersInLaw,
  hideSonsInLaw,
  setHideSonsInLaw,
  hideDaughters,
  setHideDaughters,
  hideSons,
  setHideSons,
  hideMales,
  setHideMales,
  hideFemales,
  setHideFemales,
  hideExpandButtons,
  setHideExpandButtons,
  autoCollapseLevel,
  setAutoCollapseLevel,
  canEdit,
  children,
}: BaseToolbarProps) {
  const { showAvatar, setShowAvatar, showNameOnly, setShowNameOnly } = useMemberListView();
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // defer state init to avoid hydration mismatch checks with strict mode
    const timer = setTimeout(() => setMounted(true), 0);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!mounted) return null;

  const portalNode =
    typeof document !== "undefined"
      ? document.getElementById("tree-toolbar-portal")
      : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      className="flex flex-wrap justify-center items-center gap-2 w-max"
      ref={filtersRef}
    >
      {/* Custom Controls (Zoom or Expand/Collapse) */}
      {children}

      {/* Filters */}
      <div className="relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 h-10 rounded-full font-semibold text-sm shadow-sm border transition-all duration-300 ${
            showFilters
              ? "bg-amber-100/90 text-amber-800 border-amber-200"
              : "bg-white/80 text-stone-600 border-stone-200/60 hover:bg-white hover:text-stone-900 hover:shadow-md backdrop-blur-md"
          }`}
        >
          <Filter className="size-4" />
          <span className="hidden sm:inline">Hiển thị</span>
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full right-0 mt-2 w-48 bg-surface/95 backdrop-blur-xl shadow-soft border border-border rounded-3xl p-4 flex flex-col gap-3 z-50"
            >
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                HIỂN THỊ
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={!showAvatar}
                  onChange={(e) => setShowAvatar(!e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Tối giản
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={showNameOnly}
                  onChange={(e) => setShowNameOnly(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Chỉ hiện tên
              </label>
              {setHideExpandButtons && (
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={!!hideExpandButtons}
                    onChange={(e) => setHideExpandButtons(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                  />
                  Ẩn nút đóng/mở
                </label>
              )}
              {setAutoCollapseLevel && (
                <div className="flex items-center justify-between gap-2 text-sm text-stone-600 select-none">
                  <span>Số thế hệ</span>
                  <div className="flex items-center gap-1.5">
                    {(autoCollapseLevel ?? 0) > 0 && (
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={autoCollapseLevel ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setAutoCollapseLevel(isNaN(val) || val < 1 ? 1 : val);
                        }}
                        className="w-12 px-2 py-1 text-center text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    )}
                    <button
                      onClick={() => setAutoCollapseLevel((autoCollapseLevel ?? 0) > 0 ? 0 : 2)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                        (autoCollapseLevel ?? 0) === 0
                          ? "bg-amber-100 text-amber-700 border-amber-300"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      Tất cả
                    </button>
                  </div>
                </div>
              )}

              <div className="h-px w-full bg-stone-100 my-1 font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2"></div>
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                LỌC DỮ LIỆU
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={hideDaughtersInLaw}
                  onChange={(e) => setHideDaughtersInLaw(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Ẩn dâu
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={hideSonsInLaw}
                  onChange={(e) => setHideSonsInLaw(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Ẩn rể
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={hideDaughters}
                  onChange={(e) => setHideDaughters(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Ẩn con gái
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={hideSons}
                  onChange={(e) => setHideSons(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Ẩn con trai
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={hideMales}
                  onChange={(e) => setHideMales(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Ẩn nam
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={hideFemales}
                  onChange={(e) => setHideFemales(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer size-4"
                />
                Ẩn nữ
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Button */}
      {canEdit && <ExportButton />}
    </div>,
    portalNode,
  );
}
