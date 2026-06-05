"use client";

import {
  adminCreateUser,
  adminSetUserPerson,
  changeUserRole,
  deleteUser,
  toggleUserStatus,
} from "@/app/actions/user";
import config from "@/app/config";
import { AdminUserData, UserRole } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Shield, Trash, UserCheck, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { removeDiacritics } from "@/utils/stringHelpers";

interface AdminUserListProps {
  initialUsers: AdminUserData[];
  currentUserId: string;
  persons: { id: string; full_name: string; other_names?: string | null }[];
}

interface PersonSearchSelectorProps {
  userId: string;
  currentPersonId: string | null;
  currentPersonName: string | null;
  persons: { id: string; full_name: string; other_names?: string | null }[];
  onChange: (userId: string, personId: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

function PersonSearchSelector({
  userId,
  currentPersonId,
  currentPersonName,
  persons,
  onChange,
  disabled,
  compact = false,
}: PersonSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute coords synchronously in the click handler to avoid jump on first render
  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(true);
  };

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  const filteredPersons = persons.filter((p) => {
    const term = removeDiacritics(search);
    const nameClean = removeDiacritics(p.full_name);
    const aliasClean = p.other_names ? removeDiacritics(p.other_names) : "";
    return nameClean.includes(term) || aliasClean.includes(term);
  });

  const btnCls = compact
    ? "w-full text-left bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 hover:border-stone-300 transition-all disabled:opacity-50 outline-none flex justify-between items-center cursor-pointer"
    : "w-full text-left bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 text-sm rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 hover:border-stone-300 transition-all disabled:opacity-50 outline-none flex justify-between items-center cursor-pointer";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className={btnCls}
        title={currentPersonName ?? "Chưa gắn thành viên"}
      >
        <span className="truncate flex-1 pr-1 font-medium">
          {currentPersonName ?? "— Chưa gắn —"}
        </span>
        <svg
          className={`size-3 text-stone-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: "240px",
            maxWidth: "calc(100vw - 16px)",
          }}
          className="bg-white rounded-xl shadow-lg border border-stone-200 p-2 z-[9999] flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <input
            type="text"
            placeholder="Tìm thành viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none placeholder-stone-400"
          />
          <div className="max-h-[180px] overflow-y-auto custom-scrollbar mt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                onChange(userId, null);
                setIsOpen(false);
                setSearch("");
              }}
              className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors cursor-pointer hover:bg-stone-50 block ${
                !currentPersonId ? "bg-amber-50 text-amber-800 font-semibold" : "text-stone-500"
              }`}
            >
              — Chưa gắn —
            </button>
            {filteredPersons.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(userId, p.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors cursor-pointer hover:bg-stone-50 block truncate ${
                  currentPersonId === p.id ? "bg-amber-50 text-amber-800 font-semibold" : "text-stone-700"
                }`}
              >
                {p.full_name}
              </button>
            ))}
            {filteredPersons.length === 0 && (
              <div className="px-2.5 py-3 text-center text-xs text-stone-400 italic">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

interface Notification {
  message: string;
  type: "success" | "error" | "info";
}

// ── Role badge helper ─────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-amber-100 text-amber-800 border-amber-200",
    editor: "bg-sky-100 text-sky-800 border-sky-200",
    member: "bg-stone-100 text-stone-600 border-stone-200",
  };
  const label: Record<string, string> = { admin: "Admin", editor: "Editor", member: "Viewer" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${map[role] ?? map.member}`}>
      {label[role] ?? role}
    </span>
  );
}

export default function AdminUserList({
  initialUsers,
  currentUserId,
  persons,
}: AdminUserListProps) {
  const [users, setUsers] = useState<AdminUserData[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDemo(window.location.hostname === config.demoDomain);
    }
  }, []);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }
    try {
      setLoadingId(userId);
      const result = await changeUserRole(userId, newRole);
      if (result?.error) { showNotification(result.error, "error"); return; }
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showNotification("Đã cập nhật vai trò người dùng thành công.", "success");
    } catch (error: unknown) {
      showNotification(error instanceof Error ? error.message : "Lỗi không xác định khi đổi quyền", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }
    try {
      setLoadingId(userId);
      const result = await toggleUserStatus(userId, newStatus);
      if (result?.error) { showNotification(result.error, "error"); return; }
      setUsers(users.map((u) => u.id === userId ? { ...u, is_active: newStatus } : u));
      showNotification(`Đã ${newStatus ? "duyệt" : "khoá"} người dùng thành công.`, "success");
    } catch (error: unknown) {
      showNotification(error instanceof Error ? error.message : "Lỗi không xác định khi đổi trạng thái", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa user này khỏi hệ thống vĩnh viễn không?")) return;
    try {
      setLoadingId(userId);
      const result = await deleteUser(userId);
      if (result?.error) { showNotification(result.error, "error"); return; }
      setUsers(users.filter((u) => u.id !== userId));
      showNotification("Đã xóa người dùng thành công.", "success");
    } catch (error: unknown) {
      showNotification(error instanceof Error ? error.message : "Lỗi không xác định khi xoá user", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDemo) {
      showNotification("Đây là trang demo, chức năng tạo người dùng bị hạn chế.", "info");
      setIsCreateModalOpen(false);
      return;
    }
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await adminCreateUser(formData);
      if (result?.error) { showNotification(result.error, "error"); return; }
      showNotification("Tạo người dùng thành công! Họ có thể đăng nhập ngay bây giờ.", "success");
      setIsCreateModalOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: unknown) {
      showNotification(error instanceof Error ? error.message : "Lỗi không xác định khi tạo user", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePersonChange = async (userId: string, personId: string | null) => {
    try {
      setLoadingId(userId);
      const result = await adminSetUserPerson(userId, personId);
      if (result?.error) { showNotification(result.error, "error"); return; }
      const person = persons.find((p) => p.id === personId) ?? null;
      setUsers(users.map((u) =>
        u.id === userId ? { ...u, person_id: personId, person_full_name: person?.full_name ?? null } : u,
      ));
      showNotification(
        personId ? "Đã gắn thành viên cho người dùng." : "Đã bỏ gắn thành viên.",
        "success",
      );
    } catch (error: unknown) {
      showNotification(error instanceof Error ? error.message : "Lỗi không xác định", "error");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-1/2 left-1/2 z-100 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 min-w-[320px] max-w-[90vw] ${
              notification.type === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                : notification.type === "error"
                  ? "bg-red-50/90 border-red-200 text-red-800"
                  : "bg-amber-50/90 border-amber-200 text-amber-800"
            }`}
          >
            {notification.type === "success" && (
              <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {notification.type === "error" && (
              <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {notification.type === "info" && (
              <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action bar */}
      <div className="flex justify-end">
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm người dùng
        </button>
      </div>

      {/* ── Mobile: Card list (hidden on lg+) ────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {users.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 italic">
            Không tìm thấy người dùng nào.
          </div>
        )}
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isLoading = loadingId === user.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 transition-all ${
                isSelf ? "border-amber-200/70 bg-amber-50/20" : "border-stone-200"
              }`}
            >
              {/* Row 1: Email + Ngày tạo */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{user.email}</p>
                  {isSelf && (
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                      Tài khoản của bạn
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs font-medium text-stone-500 flex items-center gap-1">
                  <CalendarDays className="size-3 text-stone-400" />
                  {new Date(user.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>

              {/* Row 2: Thành viên — full width */}
              <div>
                <p className="font-bold text-stone-400 uppercase tracking-wider text-[10px] mb-1.5">Thành viên</p>
                <PersonSearchSelector
                  userId={user.id}
                  currentPersonId={user.person_id}
                  currentPersonName={user.person_full_name}
                  persons={persons}
                  onChange={handlePersonChange}
                  disabled={isLoading}
                />
              </div>

              {/* Row 3: Actions (non-self only) */}
              {!isSelf && (
                <div className="flex items-stretch gap-2">
                  {/* Role — compact auto-width */}
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={isLoading}
                    className="shrink-0 bg-stone-50 text-stone-700 border border-stone-200 text-sm font-medium rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 px-3 py-2.5 hover:bg-stone-100 hover:border-stone-300 transition-all disabled:opacity-50 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="member">Viewer</option>
                  </select>

                  {/* Status toggle — flex-1 */}
                  <button
                    disabled={isLoading}
                    onClick={() => handleStatusChange(user.id, !user.is_active)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                      user.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                    }`}
                  >
                    {user.is_active ? (
                      <><UserCheck className="size-4 shrink-0" /> Đã duyệt</>
                    ) : (
                      <><UserX className="size-4 shrink-0" /> Chờ duyệt</>
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    title="Xoá người dùng"
                    disabled={isLoading}
                    onClick={() => handleDelete(user.id)}
                    className="flex items-center justify-center px-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-stone-200 hover:border-red-200 transition-colors disabled:opacity-50"
                  >
                    <Trash className="size-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: Table (shown on lg+) ────────────────────────────────── */}
      <div className="hidden lg:block bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-stone-200/60 bg-stone-50/50">
              <tr>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Email</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Vai trò</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Trạng thái</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Thành viên</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Ngày tạo</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-stone-900">{user.email}</td>
                  <td className="px-6 py-4">
                    {user.id === currentUserId ? (
                      <RoleBadge role={user.role} />
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={loadingId === user.id}
                        className="bg-stone-50 text-stone-700 border border-stone-200 text-xs rounded-md focus:ring-amber-500 focus:border-amber-500 px-2 py-1 hover:border-stone-300 transition-colors disabled:opacity-50 outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="member">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      disabled={loadingId === user.id || user.id === currentUserId}
                      onClick={() => handleStatusChange(user.id, !user.is_active)}
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        user.is_active
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-stone-100 text-stone-800 border border-stone-200"
                      } ${
                        user.id !== currentUserId
                          ? "hover:opacity-80 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      } disabled:opacity-50`}
                      title={
                        user.id !== currentUserId
                          ? user.is_active ? "Nhấn để khoá" : "Nhấn để duyệt"
                          : "Không thể thay đổi trạng thái của chính bạn"
                      }
                    >
                      {user.is_active ? "Đã duyệt" : "Chờ duyệt"}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-[180px]">
                      <PersonSearchSelector
                        userId={user.id}
                        currentPersonId={user.person_id}
                        currentPersonName={user.person_full_name}
                        persons={persons}
                        onChange={handlePersonChange}
                        disabled={loadingId === user.id}
                        compact
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-500">
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.id !== currentUserId && (
                      <div className="flex justify-end items-center gap-2">
                        <button
                          title="Xoá người dùng"
                          disabled={loadingId === user.id}
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                    )}
                    {user.id === currentUserId && (
                      <span className="text-stone-400 italic text-xs">Bạn</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create User Modal ────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-stone-200/60 w-full sm:max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-5 border-b border-stone-100/80 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-xl font-serif font-bold text-stone-800">
                Tạo Người Dùng Mới
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors size-8 flex items-center justify-center hover:bg-stone-100 rounded-full"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Ít nhất 6 ký tự"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Vai trò
                  </label>
                  <select
                    name="role"
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    defaultValue="member"
                  >
                    <option value="member">Người xem (Viewer)</option>
                    <option value="editor">Biên tập (Editor)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="is_active"
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    defaultValue="true"
                  >
                    <option value="true">Đã duyệt (Active)</option>
                    <option value="false">Chờ duyệt (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn">
                  Hủy
                </button>
                <button type="submit" disabled={isCreating} className="btn-primary">
                  {isCreating ? "Đang tạo..." : "Tạo người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
