"use client";

import {
  approveContribution,
  rejectContribution,
  updateContributionPayload,
} from "@/app/actions/contribution";
import { ContributionEdit, ContributionNewPerson, ContributionPayload, PendingContribution, Person } from "@/types";
import { formatFieldValue, isEmptyValue, NUMBER_FIELDS } from "@/utils/contributionHelpers";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Save,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";

interface Props {
  contributions: PendingContribution[];
  persons: Person[];
}

const statusConfig = {
  pending: { label: "Chờ duyệt", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "Đã duyệt", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Đã từ chối", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
};

function PersonName({
  personId,
  persons,
}: {
  personId: string;
  persons: Person[];
}) {
  const p = persons.find((p) => p.id === personId);
  if (!p) return <span className="text-stone-400 italic">id: {personId.slice(0, 8)}…</span>;
  return (
    <span className="font-medium text-stone-800">
      {p.full_name}
      {p.birth_year && <span className="text-stone-400 font-normal ml-1">({p.birth_year})</span>}
    </span>
  );
}

function FieldDiff({
  label,
  before,
  after,
  fieldKey,
}: {
  label: string;
  before: unknown;
  after: unknown;
  fieldKey: string;
}) {
  const beforeStr = formatFieldValue(fieldKey, before);
  const afterStr = formatFieldValue(fieldKey, after);
  const beforeEmpty = isEmptyValue(before) && fieldKey !== "is_deceased";
  const afterEmpty = isEmptyValue(after) && fieldKey !== "is_deceased";

  // Không đổi gì → bỏ qua
  if (beforeEmpty && afterEmpty) return null;
  if (beforeStr === afterStr) return null;

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-stone-400 w-28 shrink-0 pt-0.5">{label}:</span>
      <div className="flex flex-col gap-0.5">
        {/* Giá trị cũ gạch đỏ (nếu có) */}
        {!beforeEmpty && (
          <span className="line-through text-red-500">{beforeStr}</span>
        )}
        {/* Giá trị mới hoặc nhãn "(đã xóa)" */}
        {afterEmpty ? (
          <span className="text-red-600 font-medium text-xs">(đã xóa)</span>
        ) : (
          <span className="text-emerald-700 font-medium">{afterStr}</span>
        )}
      </div>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Họ và tên", other_names: "Tên khác", gender: "Giới tính",
  birth_year: "Năm sinh DL", birth_month: "Tháng sinh DL", birth_day: "Ngày sinh DL",
  birth_lunar_year: "Năm sinh AL", birth_lunar_month: "Tháng sinh AL", birth_lunar_day: "Ngày sinh AL",
  death_year: "Năm mất DL", death_month: "Tháng mất DL", death_day: "Ngày mất DL",
  death_lunar_year: "Năm mất AL", death_lunar_month: "Tháng mất AL", death_lunar_day: "Ngày mất AL",
  anniversary_lunar_year: "Năm giỗ AL", anniversary_lunar_month: "Tháng giỗ AL", anniversary_lunar_day: "Ngày giỗ AL",
  is_deceased: "Đã mất", note: "Ghi chú",
};

function EditField({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (fieldKey === "is_deceased") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-stone-300 accent-amber-600"
      />
    );
  }
  if (fieldKey === "gender") {
    return (
      <select
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="input-base py-1.5 text-xs"
      >
        <option value="">— chưa rõ —</option>
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
        <option value="other">Khác</option>
      </select>
    );
  }
  if (fieldKey === "note") {
    return (
      <textarea
        rows={2}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="input-base py-1.5 text-xs w-full resize-none"
      />
    );
  }
  if (NUMBER_FIELDS.has(fieldKey)) {
    return (
      <input
        type="number"
        value={(value as number) ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="input-base py-1.5 text-xs w-24"
      />
    );
  }
  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="input-base py-1.5 text-xs w-full"
    />
  );
}

function ContributionCard({
  contribution,
  persons,
  onDone,
}: {
  contribution: PendingContribution;
  persons: Props["persons"];
  onDone: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionDone, setActionDone] = useState<"approved" | "rejected" | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draftPayload, setDraftPayload] = useState<ContributionPayload>(contribution.payload);

  const status = actionDone ?? contribution.status;
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;

  const setEditField = (editIdx: number, key: string, value: unknown) => {
    setDraftPayload((prev) => {
      const edits = prev.edits.map((e, i) =>
        i === editIdx ? { ...e, fields: { ...e.fields, [key]: value } } : e,
      );
      return { ...prev, edits };
    });
  };

  const setNewPersonField = (npIdx: number, key: string, value: unknown) => {
    setDraftPayload((prev) => {
      const new_persons = prev.new_persons.map((np, i) =>
        i === npIdx ? { ...np, fields: { ...np.fields, [key]: value } } : np,
      );
      return { ...prev, new_persons };
    });
  };

  const saveEdit = () => {
    startTransition(async () => {
      const result = await updateContributionPayload(contribution.id, draftPayload);
      if (result.error) { alert(result.error); return; }
      setEditMode(false);
    });
  };

  const handle = (action: "approve" | "reject") => {
    startTransition(async () => {
      const fn = action === "approve" ? approveContribution : rejectContribution;
      const result = await fn(contribution.id, reviewNote || undefined);
      if (result.error) {
        alert(result.error);
        return;
      }
      setActionDone(action === "approve" ? "approved" : "rejected");
      onDone();
    });
  };

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${status !== "pending" ? "opacity-60" : ""}`}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-start justify-between px-4 py-3 hover:bg-stone-50 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-stone-800">{contribution.contributor_name}</span>
            {contribution.contributor_note && (
              <span className="text-xs text-stone-400">({contribution.contributor_note})</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color} flex items-center gap-1`}>
              <StatusIcon className="size-3" />
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
            <span>{new Date(contribution.created_at).toLocaleString("vi-VN")}</span>
            <span>
              {contribution.payload.edits.length > 0 && `${contribution.payload.edits.length} chỉnh sửa`}
              {contribution.payload.edits.length > 0 && contribution.payload.new_persons.length > 0 && " · "}
              {contribution.payload.new_persons.length > 0 && `${contribution.payload.new_persons.length} người mới`}
            </span>
            {contribution.link_note && (
              <span className="text-stone-300">Link: {contribution.link_note}</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-stone-400 shrink-0 mt-1" />
        ) : (
          <ChevronDown className="size-4 text-stone-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-4 py-4 space-y-4">
          {/* Edits */}
          {draftPayload.edits.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Chỉnh sửa</p>
                {status === "pending" && !editMode && (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Pencil className="size-3" />
                    Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {draftPayload.edits.map((edit, editIdx) => {
                  const person = persons.find((p) => p.id === edit.person_id);
                  const fields = Object.entries(edit.fields) as [string, unknown][];
                  if (fields.length === 0) return null;
                  return (
                    <div key={edit.person_id} className="bg-stone-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="size-3.5 text-stone-400" />
                        <PersonName personId={edit.person_id} persons={persons} />
                      </div>
                      {editMode ? (
                        <div className="space-y-2">
                          {fields.map(([key]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-stone-400 w-28 shrink-0">
                                {FIELD_LABELS[key] ?? key.replace(/_/g, " ")}:
                              </span>
                              <EditField
                                fieldKey={key}
                                value={(edit.fields as Record<string, unknown>)[key]}
                                onChange={(v) => setEditField(editIdx, key, v)}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        fields.map(([key, after]) => {
                          const beforeVal = person ? (person as unknown as Record<string, unknown>)[key] : undefined;
                          return (
                            <FieldDiff
                              key={key}
                              fieldKey={key}
                              label={FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
                              before={beforeVal}
                              after={after}
                            />
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New persons */}
          {draftPayload.new_persons.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Thêm thành viên mới</p>
                {status === "pending" && !editMode && draftPayload.edits.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Pencil className="size-3" />
                    Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {draftPayload.new_persons.map((np, npIdx) => (
                  <div key={np.tempId} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Plus className="size-3.5 text-emerald-500" />
                      <span className="font-semibold text-stone-800">{np.fields.full_name ?? "(Chưa đặt tên)"}</span>
                    </div>
                    {editMode ? (
                      <div className="space-y-2">
                        {(Object.keys(np.fields) as (keyof typeof np.fields)[]).map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-stone-400 w-28 shrink-0">
                              {FIELD_LABELS[key] ?? key.replace(/_/g, " ")}:
                            </span>
                            <EditField
                              fieldKey={key}
                              value={(np.fields as Record<string, unknown>)[key]}
                              onChange={(v) => setNewPersonField(npIdx, key, v)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {np.fields.gender && <p className="text-stone-500">Giới tính: {formatFieldValue("gender", np.fields.gender)}</p>}
                        {np.fields.birth_year && <p className="text-stone-500">Năm sinh: {np.fields.birth_year}</p>}
                        <p className="text-stone-500">
                          Cha/mẹ: <PersonName personId={np.parent_person_id} persons={persons} />
                          {" "}({np.relation_type === "biological_child" ? "con ruột" : "con nuôi"})
                        </p>
                        {np.fields.note && <p className="text-stone-500">Ghi chú: {np.fields.note}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save edit bar */}
          {editMode && (
            <div className="flex gap-2 border-t border-amber-100 pt-3">
              <button
                type="button"
                onClick={saveEdit}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Lưu chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => { setDraftPayload(contribution.payload); setEditMode(false); }}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-60 text-stone-600 text-sm font-medium transition-colors"
              >
                <X className="size-4" />
                Hủy
              </button>
            </div>
          )}

          {/* Actions (chỉ khi pending) */}
          {status === "pending" && !editMode && (
            <div className="border-t border-stone-100 pt-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-500">Ghi chú khi duyệt/từ chối (tùy chọn)</label>
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Lý do hoặc ghi chú..."
                  className="input-base w-full"
                  disabled={isPending}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handle("approve")}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="size-4" />
                  )}
                  Duyệt
                </button>
                <button
                  type="button"
                  onClick={() => handle("reject")}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-60 text-red-700 text-sm font-semibold transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ThumbsDown className="size-4" />
                  )}
                  Từ chối
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContributionReview({ contributions, persons }: Props) {
  const [list, setList] = useState(contributions);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const pendingCount = list.filter((c) => c.status === "pending").length;

  const filtered = filter === "all" ? list : list.filter((c) => c.status === filter);

  if (list.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-stone-100 mb-4">
          <CheckCircle2 className="size-8 text-stone-400" />
        </div>
        <h3 className="text-lg font-semibold text-stone-600 mb-1">Chưa có đề xuất nào</h3>
        <p className="text-stone-400 text-sm">
          Tạo link đóng góp và gửi cho người thân để nhận đề xuất bổ sung thông tin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {f === "pending" ? `Chờ duyệt (${pendingCount})` : f === "approved" ? "Đã duyệt" : f === "rejected" ? "Từ chối" : "Tất cả"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-stone-400 text-sm py-8">Không có đề xuất nào.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ContributionCard
              key={c.id}
              contribution={c}
              persons={persons}
              onDone={() => {
                // Refresh list status locally (page re-fetch on next nav)
                setList((prev) => prev.map((item) => item.id === c.id ? { ...item } : item));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
