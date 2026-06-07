"use client";

import { deleteShareLink, getShareLinks, ShareViewStat } from "@/app/actions/share";
import ShareTreeModal from "@/components/modal/ShareTreeModal";
import ShareViewsModal from "@/components/modal/ShareViewsModal";
import { BarChart2, Calendar, Check, Copy, ExternalLink, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface AdminSharingListProps {
  initialLinks: any[];
  viewStats?: ShareViewStat[];
  isAdmin?: boolean;
}

export default function AdminSharingList({
  initialLinks,
  viewStats = [],
  isAdmin = false,
}: AdminSharingListProps) {
  const [links, setLinks] = useState<any[]>(initialLinks);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [viewsToken, setViewsToken] = useState<string | null>(null);

  // Map token → stats để tra nhanh O(1)
  const statsMap = new Map<string, ShareViewStat>(viewStats.map((s) => [s.token, s]));

  const fetchLinks = async () => {
    const result = await getShareLinks();
    if ("links" in result && Array.isArray(result.links)) {
      setLinks(result.links);
    }
  };

  const handleCopy = async (token: string) => {
    const fullUrl = `${window.location.origin}/chiase/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };

  const handleDelete = async (token: string) => {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn thu hồi liên kết này không? Mọi người dùng đang xem qua liên kết này sẽ bị ngắt kết nối lập tức."
    );
    if (!confirmDelete) return;

    const result = await deleteShareLink(token);
    if ("success" in result) {
      fetchLinks();
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200">
        <div>
          <h3 className="font-serif font-bold text-stone-850 text-lg">Hành động</h3>
          <p className="text-xs text-stone-500 font-medium">Tạo liên kết chia sẻ cho dòng họ</p>
        </div>
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="btn-amber text-sm font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Tạo liên kết mới
        </button>
      </div>

      {/* Empty state */}
      {links.length === 0 && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-10 text-center text-stone-400 font-semibold italic">
          Chưa có liên kết chia sẻ nào được tạo. Hãy nhấn &quot;Tạo liên kết mới&quot; để bắt đầu.
        </div>
      )}

      {/* Mobile: Card list */}
      {links.length > 0 && (
        <>
          {/* Mobile cards (hidden on md+) */}
          <div className="md:hidden space-y-3">
            {links.map((link) => {
              const sharePath = `/chiase/${link.token}`;
              const isExpired = new Date(link.expires_at) < new Date();
              const settings = link.settings || {};

              return (
                <div
                  key={link.token}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3"
                >
                  {/* Link row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="size-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <a
                        href={sharePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-amber-700 hover:underline truncate"
                      >
                        /chiase/{link.token}
                      </a>
                    </div>
                    {isExpired ? (
                      <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 border border-red-200 text-red-700">
                        Hết hạn
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        Đang hoạt động
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
                    <div>
                      <p className="font-bold text-stone-400 uppercase tracking-wider text-[10px] mb-0.5">Chế độ xem</p>
                      <p className="font-semibold text-stone-700 capitalize">
                        {settings.view || "tree"}
                        {settings.rootId && <span className="text-stone-400 font-normal"> · Custom Root</span>}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-stone-400 uppercase tracking-wider text-[10px] mb-0.5">Ngày tạo</p>
                      <p className="font-medium text-stone-600">
                        {new Date(link.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-bold text-stone-400 uppercase tracking-wider text-[10px] mb-0.5">Hết hạn lúc</p>
                      <p className={`font-medium ${isExpired ? "text-red-600" : "text-stone-600"}`}>
                        {new Date(link.expires_at).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Lượt xem badge (chỉ admin) */}
                  {isAdmin && (() => {
                    const stat = statsMap.get(link.token);
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                          <BarChart2 className="size-3" />
                          {stat ? `${stat.total_views} lượt xem` : "0 lượt xem"}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                    <button
                      onClick={() => handleCopy(link.token)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 text-xs font-medium transition-colors"
                    >
                      {copiedToken === link.token ? (
                        <><Check className="size-3.5 text-emerald-500" /> Đã sao chép</>
                      ) : (
                        <><Copy className="size-3.5" /> Sao chép link</>
                      )}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setViewsToken(link.token)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-50 hover:bg-blue-50 border border-stone-200 hover:border-blue-200 text-stone-500 hover:text-blue-600 text-xs font-medium transition-colors"
                        title="Xem lượt truy cập"
                      >
                        <BarChart2 className="size-3.5" />
                      </button>
                    )}
                    <a
                      href={sharePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 text-stone-600 hover:text-amber-700 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                    <button
                      onClick={() => handleDelete(link.token)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-50 hover:bg-red-50 border border-stone-200 hover:border-red-200 text-stone-500 hover:text-red-600 text-xs font-medium transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table (shown on md+) */}
          <div className="hidden md:block bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider">
                    <th className="p-4 sm:p-5">Đường dẫn liên kết</th>
                    <th className="p-4 sm:p-5">Cấu hình xem</th>
                    <th className="p-4 sm:p-5">Ngày tạo</th>
                    <th className="p-4 sm:p-5">Ngày hết hạn</th>
                    <th className="p-4 sm:p-5">Trạng thái</th>
                    {isAdmin && <th className="p-4 sm:p-5">Lượt xem</th>}
                    <th className="p-4 sm:p-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {links.map((link) => {
                    const sharePath = `/chiase/${link.token}`;
                    const isExpired = new Date(link.expires_at) < new Date();
                    const settings = link.settings || {};

                    return (
                      <tr key={link.token} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 sm:p-5 font-mono text-xs text-stone-800 font-semibold truncate max-w-xs">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="size-3.5 text-stone-400 shrink-0" />
                            <a
                              href={sharePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-amber-700"
                            >
                              /chiase/{link.token}
                            </a>
                          </div>
                        </td>
                        <td className="p-4 sm:p-5 text-xs text-stone-600 font-medium">
                          View: <span className="capitalize font-semibold">{settings.view || "tree"}</span>
                          {settings.rootId && " · Custom Root"}
                        </td>
                        <td className="p-4 sm:p-5 text-xs text-stone-500 font-medium">
                          {new Date(link.created_at).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-4 sm:p-5 text-xs text-stone-500 font-medium">
                          {new Date(link.expires_at).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-4 sm:p-5 text-xs">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-red-50 border border-red-200 text-red-700">
                              Đã hết hạn
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                              Đang hoạt động
                            </span>
                          )}
                        </td>
                        {isAdmin && (() => {
                          const stat = statsMap.get(link.token);
                          return (
                            <td className="p-4 sm:p-5 text-xs">
                              <button
                                onClick={() => setViewsToken(link.token)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                                title="Xem nhật ký truy cập"
                              >
                                <BarChart2 className="size-3" />
                                {stat ? stat.total_views : 0}
                              </button>
                            </td>
                          );
                        })()}
                        <td className="p-4 sm:p-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(link.token)}
                              className="size-8 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl flex items-center justify-center transition-colors"
                              title="Sao chép liên kết"
                            >
                              {copiedToken === link.token ? (
                                <Check className="size-4 text-emerald-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(link.token)}
                              className="size-8 bg-white hover:bg-red-50 border border-stone-200 text-stone-500 rounded-xl flex items-center justify-center hover:text-red-600 hover:border-red-200 transition-colors"
                              title="Thu hồi liên kết"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ShareTreeModal isOpen={isShareModalOpen} onClose={() => {
        setIsShareModalOpen(false);
        fetchLinks();
      }} />

      <ShareViewsModal token={viewsToken} onClose={() => setViewsToken(null)} />
    </div>
  );
}
