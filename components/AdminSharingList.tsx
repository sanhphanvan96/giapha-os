"use client";

import { deleteShareLink, getShareLinks } from "@/app/actions/share";
import ShareTreeModal from "@/components/modal/ShareTreeModal";
import { Calendar, Check, Copy, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminSharingListProps {
  initialLinks: any[];
}

export default function AdminSharingList({ initialLinks }: AdminSharingListProps) {
  const [links, setLinks] = useState<any[]>(initialLinks);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Lấy gốc URL
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const fetchLinks = async () => {
    const result = await getShareLinks();
    if ("links" in result && Array.isArray(result.links)) {
      setLinks(result.links);
    }
  };

  const handleCopy = async (token: string) => {
    const fullUrl = `${origin}/chiase/${token}`;
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
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200">
        <div>
          <h3 className="font-serif font-bold text-stone-850 text-lg">Hành động</h3>
          <p className="text-xs text-stone-500 font-medium">Tạo liên kết chia sẻ cho dòng họ</p>
        </div>
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="btn-amber text-sm font-bold flex items-center gap-1.5"
        >
          <Plus className="size-4" />
          Tạo liên kết mới
        </button>
      </div>

      {/* Sharing Links Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider">
                <th className="p-4 sm:p-5">Đường dẫn liên kết</th>
                <th className="p-4 sm:p-5">Cấu hình xem</th>
                <th className="p-4 sm:p-5">Ngày tạo</th>
                <th className="p-4 sm:p-5">Ngày hết hạn</th>
                <th className="p-4 sm:p-5">Trạng thái</th>
                <th className="p-4 sm:p-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400 font-semibold italic">
                    Chưa có liên kết chia sẻ nào được tạo. Hãy nhấn "Tạo liên kết mới" để bắt đầu.
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  const fullUrl = `${origin}/chiase/${link.token}`;
                  const isExpired = new Date(link.expires_at) < new Date();
                  const settings = link.settings || {};

                  return (
                    <tr key={link.token} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-4 sm:p-5 font-mono text-xs text-stone-800 font-semibold truncate max-w-xs">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="size-3.5 text-stone-400 shrink-0" />
                          <a
                            href={fullUrl}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShareTreeModal isOpen={isShareModalOpen} onClose={() => {
        setIsShareModalOpen(false);
        fetchLinks();
      }} />
    </div>
  );
}
