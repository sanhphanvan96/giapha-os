"use client";

import {
  createContributionLink,
  getContributionLinks,
  revokeContributionLink,
} from "@/app/actions/contribution";
import { ContributionLink, Person } from "@/types";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Plus,
  Users,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import PersonSelector from "./PersonSelector";

interface Props {
  initialLinks: ContributionLink[];
  persons: Pick<Person, "id" | "full_name" | "other_names" | "gender" | "birth_year">[];
}

function formatExpiry(expiresAt: string) {
  const date = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Hết hạn", expired: true };
  if (daysLeft === 0) return { label: "Hết hạn hôm nay", expired: false };
  return { label: `Còn ${daysLeft} ngày`, expired: false };
}

export default function ContributionLinkManager({ initialLinks, persons }: Props) {
  const [links, setLinks] = useState<ContributionLink[]>(initialLinks);
  const [showCreate, setShowCreate] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [allowEdit, setAllowEdit] = useState(true);
  const [allowAdd, setAllowAdd] = useState(false);
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);

  const addPersonToScope = (id: string | null) => {
    if (!id || selectedPersonIds.includes(id)) return;
    setSelectedPersonIds((prev) => [...prev, id]);
    setSelectedPersonId(null);
  };

  const removePersonFromScope = (id: string) => {
    setSelectedPersonIds((prev) => prev.filter((p) => p !== id));
  };

  const handleCreate = () => {
    if (selectedPersonIds.length === 0) {
      setError("Chọn ít nhất 1 người trong phạm vi.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createContributionLink(
        selectedPersonIds,
        allowEdit,
        allowAdd,
        note,
        expiryDays,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      // Refresh list
      const updated = await getContributionLinks();
      setLinks(updated);
      // Reset form
      setShowCreate(false);
      setSelectedPersonIds([]);
      setNote("");
      setAllowEdit(true);
      setAllowAdd(false);
    });
  };

  const handleRevoke = (token: string) => {
    if (!window.confirm("Thu hồi link này? Người đang mở link sẽ không gửi được nữa.")) return;
    startTransition(async () => {
      await revokeContributionLink(token);
      setLinks((prev) =>
        prev.map((l) => (l.token === token ? { ...l, revoked: true } : l)),
      );
    });
  };

  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/donggop/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      //
    }
  };

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const revokedCount = links.filter((l) => l.revoked).length;
  const visibleLinks = showRevoked ? links : links.filter((l) => !l.revoked);

  return (
    <div className="space-y-4">
      {/* Nút tạo */}
      {!showCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" />
          Tạo link đóng góp
        </button>
      )}

      {/* Form tạo link */}
      {showCreate && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-stone-800">Tạo link đóng góp mới</h3>

          {/* Scope — chọn người */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-2 block">
              Phạm vi — người được phép đóng góp thông tin <span className="text-red-500">*</span>
            </label>
            <PersonSelector
              persons={persons as Person[]}
              selectedId={selectedPersonId}
              onSelect={addPersonToScope}
              placeholder="+ Thêm người vào phạm vi..."
              label=""
              className="w-full"
            />
            {selectedPersonIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedPersonIds.map((id) => {
                  const p = personsMap.get(id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium"
                    >
                      {p?.full_name ?? id.slice(0, 8)}
                      <button
                        type="button"
                        onClick={() => removePersonFromScope(id)}
                        className="text-amber-400 hover:text-amber-700"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quyền */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEdit}
                onChange={(e) => setAllowEdit(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-stone-700">Cho sửa thông tin</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAdd}
                onChange={(e) => setAllowAdd(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-stone-700">Cho thêm người mới</span>
            </label>
          </div>

          {/* Hết hạn */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Hạn sử dụng</label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              className="input-base w-full sm:w-48"
            >
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
            </select>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">
              Ghi chú (hiển thị cho người đóng góp)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Vd: Bổ sung thông tin chi 3, nhờ ghi ngày sinh các cụ..."
              className="input-base w-full"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="flex items-center gap-2 px-4 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Tạo link
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setError(null); }}
              className="px-4 h-9 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Danh sách link */}
      {visibleLinks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-stone-200 rounded-2xl">
          <LinkIcon className="size-8 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-400 text-sm">
            {revokedCount > 0 && !showRevoked
              ? "Không có link đang hoạt động."
              : "Chưa có link đóng góp nào."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLinks.map((link) => {
            const { label: expiryLabel, expired } = formatExpiry(link.expires_at);
            const url = `/donggop/${link.token}`;
            const scopeNames = link.scope_person_ids
              .slice(0, 3)
              .map((id) => personsMap.get(id)?.full_name ?? "…")
              .join(", ");
            const extra = link.scope_person_ids.length > 3 ? ` +${link.scope_person_ids.length - 3}` : "";

            return (
              <div
                key={link.token}
                className={`bg-white border rounded-2xl p-4 ${link.revoked || expired ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Phạm vi */}
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone-800 mb-1">
                      <Users className="size-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{scopeNames}{extra}</span>
                    </div>
                    {/* Flags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {link.allow_edit && (
                        <span className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-full">Sửa</span>
                      )}
                      {link.allow_add && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">Thêm người</span>
                      )}
                      {link.submission_count > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                          {link.submission_count} đề xuất
                        </span>
                      )}
                      {link.revoked ? (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full flex items-center gap-1">
                          <XCircle className="size-3" /> Đã thu hồi
                        </span>
                      ) : expired ? (
                        <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
                          Hết hạn
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-stone-50 text-stone-500 rounded-full flex items-center gap-1">
                          <Clock className="size-3" /> {expiryLabel}
                        </span>
                      )}
                    </div>
                    {link.note && (
                      <p className="text-xs text-stone-400 truncate">{link.note}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!link.revoked && !expired && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopy(link.token)}
                          title="Copy link"
                          className="size-8 flex items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-500 transition-colors"
                        >
                          {copiedToken === link.token ? (
                            <Check className="size-4 text-emerald-500" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Mở link"
                          className="size-8 flex items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-500 transition-colors"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRevoke(link.token)}
                          title="Thu hồi link"
                          className="size-8 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <XCircle className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {revokedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowRevoked((v) => !v)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          {showRevoked ? "Ẩn link đã thu hồi" : `Xem ${revokedCount} link đã thu hồi`}
        </button>
      )}
    </div>
  );
}
