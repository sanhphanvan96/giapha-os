"use client";

import { submitContribution, uploadContributionImage } from "@/app/actions/contribution";
import {
  ContributionContext,
  ContributionEdit,
  ContributionNewPerson,
  ContributionPayload,
  Gender,
  Person,
} from "@/types";
import { compressImage } from "@/utils/imageCompressor";
import { solarToLunarParts, lunarToSolarParts } from "@/utils/dateHelpers";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import PersonSelector from "./PersonSelector";

interface Props {
  token: string;
  context: ContributionContext;
}

// ── Nhỏ: trường số năm/tháng/ngày ────────────────────────────────────────────
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-stone-500">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value === "" ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? "" : Number(v));
        }}
        placeholder={placeholder ?? "—"}
        className="input-base w-full"
      />
    </div>
  );
}

// ── Nhỏ: gender select ────────────────────────────────────────────────────────
function GenderSelect({
  value,
  onChange,
}: {
  value: Gender | "";
  onChange: (v: Gender | "") => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-stone-500">Giới tính</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Gender | "")}
        className="input-base w-full"
      >
        <option value="">— chưa rõ —</option>
        <option value="male">Nam</option>
        <option value="female">Nữ</option>
        <option value="other">Khác</option>
      </select>
    </div>
  );
}

// ── AvatarUploadField — upload ảnh tạm (litterbox, best-effort) ─────────────
function AvatarUploadField({
  avatarUrl,
  currentAvatarUrl,
  onUpload,
  onRemove,
}: {
  avatarUrl: string | null | undefined;
  currentAvatarUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.7,
        outputType: "image/webp",
      });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      const result = await uploadContributionImage(dataUrl);
      if (result.error) {
        setUploadError(result.error);
      } else if (result.url) {
        onUpload(result.url);
      }
    } catch {
      setUploadError("Lỗi khi xử lý ảnh. Thử lại.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-stone-500">
        Ảnh đại diện{" "}
        <span className="text-stone-400 font-normal">(tùy chọn — không bắt buộc)</span>
      </label>
      {avatarUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="Ảnh đề xuất"
            className="size-16 rounded-xl object-cover border border-stone-200"
          />
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="size-3" />
            Xóa ảnh
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {currentAvatarUrl && (
            <div className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentAvatarUrl}
                alt="Ảnh hiện tại"
                className="size-16 rounded-xl object-cover border border-stone-200"
              />
              <span className="text-[10px] text-stone-400 text-center">Ảnh hiện tại</span>
            </div>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-3 h-9 rounded-xl border border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50 disabled:opacity-60 text-sm text-stone-500 transition-colors w-fit"
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <Camera className="size-4" />
                {currentAvatarUrl ? "Đổi ảnh" : "Chọn ảnh"}
              </>
            )}
          </button>
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── EditPersonPanel — form sửa 1 người có sẵn ────────────────────────────────
function EditPersonPanel({
  person,
  edit,
  onChange,
  onAvatarChange,
  onRemove,
}: {
  person: Person;
  edit: ContributionEdit;
  onChange: (fields: ContributionEdit["fields"]) => void;
  onAvatarChange: (url: string | null) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isDeceased, setIsDeceased] = useState(
    edit.fields.is_deceased ?? person.is_deceased ?? false,
  );
  const [hasDifferentLegalBirth, setHasDifferentLegalBirth] = useState(
    !!(edit.fields.legal_birth_year ?? person.legal_birth_year),
  );
  const [hasDifferentAnniversary, setHasDifferentAnniversary] = useState(
    !!(edit.fields.anniversary_lunar_month ?? person.anniversary_lunar_month),
  );
  const f = edit.fields;

  const patch = (updates: ContributionEdit["fields"]) => onChange({ ...f, ...updates });

  // Lấy giá trị số hợp lệ từ nhiều nguồn (null/undefined/"" → undefined)
  const nv = (v: number | "" | null | undefined): number | undefined =>
    typeof v === "number" ? v : undefined;

  // Auto-convert: ngày sinh dương → âm
  const handleSolarBirthChange = (
    key: "birth_year" | "birth_month" | "birth_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "birth_year" ? numVal : nv(f.birth_year ?? person.birth_year);
    const m = key === "birth_month" ? numVal : nv(f.birth_month ?? person.birth_month);
    const d = key === "birth_day" ? numVal : nv(f.birth_day ?? person.birth_day);
    const updates: ContributionEdit["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const lunar = solarToLunarParts(y, m, d);
      if (lunar) {
        updates.birth_lunar_year = lunar.year;
        updates.birth_lunar_month = lunar.month;
        updates.birth_lunar_day = lunar.day;
      }
    }
    onChange(updates);
  };

  // Auto-convert: ngày sinh âm → dương
  const handleLunarBirthChange = (
    key: "birth_lunar_year" | "birth_lunar_month" | "birth_lunar_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "birth_lunar_year" ? numVal : nv(f.birth_lunar_year ?? person.birth_lunar_year);
    const m = key === "birth_lunar_month" ? numVal : nv(f.birth_lunar_month ?? person.birth_lunar_month);
    const d = key === "birth_lunar_day" ? numVal : nv(f.birth_lunar_day ?? person.birth_lunar_day);
    const updates: ContributionEdit["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const solar = lunarToSolarParts(y, m, d);
      if (solar) {
        updates.birth_year = solar.year;
        updates.birth_month = solar.month;
        updates.birth_day = solar.day;
      }
    }
    onChange(updates);
  };

  // Auto-convert: ngày mất âm → dương
  const handleLunarDeathChange = (
    key: "death_lunar_year" | "death_lunar_month" | "death_lunar_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "death_lunar_year" ? numVal : nv(f.death_lunar_year ?? person.death_lunar_year);
    const m = key === "death_lunar_month" ? numVal : nv(f.death_lunar_month ?? person.death_lunar_month);
    const d = key === "death_lunar_day" ? numVal : nv(f.death_lunar_day ?? person.death_lunar_day);
    const updates: ContributionEdit["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const solar = lunarToSolarParts(y, m, d);
      if (solar) {
        updates.death_year = solar.year;
        updates.death_month = solar.month;
        updates.death_day = solar.day;
      }
    }
    onChange(updates);
  };

  // Auto-convert: ngày mất dương → âm
  const handleSolarDeathChange = (
    key: "death_year" | "death_month" | "death_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "death_year" ? numVal : nv(f.death_year ?? person.death_year);
    const m = key === "death_month" ? numVal : nv(f.death_month ?? person.death_month);
    const d = key === "death_day" ? numVal : nv(f.death_day ?? person.death_day);
    const updates: ContributionEdit["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const lunar = solarToLunarParts(y, m, d);
      if (lunar) {
        updates.death_lunar_year = lunar.year;
        updates.death_lunar_month = lunar.month;
        updates.death_lunar_day = lunar.day;
      }
    }
    onChange(updates);
  };

  const toggleDeceased = (checked: boolean) => {
    setIsDeceased(checked);
    onChange({ ...f, is_deceased: checked });
  };

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setExpanded((v) => !v) : undefined}
      >
        <div className="flex items-center gap-2">
          <User className="size-4 text-stone-400" />
          <span className="font-medium text-stone-800">{person.full_name}</span>
          {person.birth_year && (
            <span className="text-xs text-stone-400">({person.birth_year})</span>
          )}
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Đang sửa
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-stone-400 hover:text-red-500 transition-colors p-1"
            title="Xóa bỏ chỉnh sửa này"
          >
            <Trash2 className="size-4" />
          </button>
          {expanded ? (
            <ChevronUp className="size-4 text-stone-400" />
          ) : (
            <ChevronDown className="size-4 text-stone-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Họ tên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500">Họ và tên</label>
              <input
                type="text"
                value={f.full_name ?? person.full_name ?? ""}
                onChange={(e) => patch({ full_name: e.target.value })}
                placeholder={person.full_name}
                className="input-base w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500">Tên khác / biệt danh</label>
              <input
                type="text"
                value={f.other_names ?? person.other_names ?? ""}
                onChange={(e) => patch({ other_names: e.target.value })}
                placeholder={person.other_names ?? ""}
                className="input-base w-full"
              />
            </div>
          </div>

          <GenderSelect
            value={(f.gender ?? person.gender) || ""}
            onChange={(v) => patch({ gender: v || undefined })}
          />

          {/* Ngày sinh dương */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
              Ngày sinh (dương lịch)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="Năm" value={f.birth_year ?? person.birth_year ?? ""} onChange={(v) => handleSolarBirthChange("birth_year", v)} min={1800} max={2100} />
              <NumberInput label="Tháng" value={f.birth_month ?? person.birth_month ?? ""} onChange={(v) => handleSolarBirthChange("birth_month", v)} min={1} max={12} />
              <NumberInput label="Ngày" value={f.birth_day ?? person.birth_day ?? ""} onChange={(v) => handleSolarBirthChange("birth_day", v)} min={1} max={31} />
            </div>
          </div>

          {/* Ngày sinh âm */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
              Ngày sinh (âm lịch)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="Năm AL" value={f.birth_lunar_year ?? person.birth_lunar_year ?? ""} onChange={(v) => handleLunarBirthChange("birth_lunar_year", v)} min={1800} max={2100} />
              <NumberInput label="Tháng AL" value={f.birth_lunar_month ?? person.birth_lunar_month ?? ""} onChange={(v) => handleLunarBirthChange("birth_lunar_month", v)} min={1} max={12} />
              <NumberInput label="Ngày AL" value={f.birth_lunar_day ?? person.birth_lunar_day ?? ""} onChange={(v) => handleLunarBirthChange("birth_lunar_day", v)} min={1} max={30} />
            </div>
          </div>

          {/* Ngày sinh trên giấy tờ */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasDifferentLegalBirth}
                onChange={(e) => {
                  setHasDifferentLegalBirth(e.target.checked);
                  if (!e.target.checked) {
                    patch({ legal_birth_year: undefined, legal_birth_month: undefined, legal_birth_day: undefined });
                  }
                }}
                className="size-4 rounded border-stone-300 accent-amber-600"
              />
              <span className="text-sm text-stone-600">Khác ngày sinh trên giấy tờ</span>
            </label>
            {hasDifferentLegalBirth && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                  Ngày sinh trên giấy tờ (dương lịch)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput label="Năm" value={f.legal_birth_year ?? person.legal_birth_year ?? ""} onChange={(v) => patch({ legal_birth_year: v === "" ? undefined : (v as number) })} min={1800} max={2100} />
                  <NumberInput label="Tháng" value={f.legal_birth_month ?? person.legal_birth_month ?? ""} onChange={(v) => patch({ legal_birth_month: v === "" ? undefined : (v as number) })} min={1} max={12} />
                  <NumberInput label="Ngày" value={f.legal_birth_day ?? person.legal_birth_day ?? ""} onChange={(v) => patch({ legal_birth_day: v === "" ? undefined : (v as number) })} min={1} max={31} />
                </div>
              </div>
            )}
          </div>

          {/* Số điện thoại */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">
              Số điện thoại{" "}
              <span className="text-stone-400 font-normal">(tùy chọn — chỉ admin xem)</span>
            </label>
            <input
              type="tel"
              value={f.phone_number ?? ""}
              onChange={(e) => patch({ phone_number: e.target.value || undefined })}
              placeholder="0912 345 678"
              className="input-base w-full"
            />
          </div>

          {/* Đã mất toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => toggleDeceased(e.target.checked)}
              className="size-4 rounded border-stone-300 accent-amber-600"
            />
            <span className="text-sm font-medium text-stone-700">Đã mất</span>
          </label>

          {/* Ngày mất */}
          {isDeceased && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                  Ngày mất (âm lịch)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput label="Năm AL" value={f.death_lunar_year ?? person.death_lunar_year ?? ""} onChange={(v) => handleLunarDeathChange("death_lunar_year", v)} min={1800} max={2100} />
                  <NumberInput label="Tháng AL" value={f.death_lunar_month ?? person.death_lunar_month ?? ""} onChange={(v) => handleLunarDeathChange("death_lunar_month", v)} min={1} max={12} />
                  <NumberInput label="Ngày AL" value={f.death_lunar_day ?? person.death_lunar_day ?? ""} onChange={(v) => handleLunarDeathChange("death_lunar_day", v)} min={1} max={30} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                  Ngày mất (dương lịch)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput label="Năm" value={f.death_year ?? person.death_year ?? ""} onChange={(v) => handleSolarDeathChange("death_year", v)} min={1800} max={2100} />
                  <NumberInput label="Tháng" value={f.death_month ?? person.death_month ?? ""} onChange={(v) => handleSolarDeathChange("death_month", v)} min={1} max={12} />
                  <NumberInput label="Ngày" value={f.death_day ?? person.death_day ?? ""} onChange={(v) => handleSolarDeathChange("death_day", v)} min={1} max={31} />
                </div>
              </div>

              {/* Ngày giỗ */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasDifferentAnniversary}
                    onChange={(e) => {
                      setHasDifferentAnniversary(e.target.checked);
                      if (!e.target.checked) {
                        patch({ anniversary_lunar_year: undefined, anniversary_lunar_month: undefined, anniversary_lunar_day: undefined });
                      }
                    }}
                    className="size-4 rounded border-stone-300 accent-amber-600"
                  />
                  <span className="text-sm text-stone-600">Ngày giỗ khác ngày mất</span>
                </label>
                {hasDifferentAnniversary && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                      Ngày giỗ (âm lịch)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <NumberInput label="Năm AL" value={f.anniversary_lunar_year ?? person.anniversary_lunar_year ?? ""} onChange={(v) => patch({ anniversary_lunar_year: v === "" ? undefined : (v as number) })} min={1800} max={2100} />
                      <NumberInput label="Tháng AL" value={f.anniversary_lunar_month ?? person.anniversary_lunar_month ?? ""} onChange={(v) => patch({ anniversary_lunar_month: v === "" ? undefined : (v as number) })} min={1} max={12} />
                      <NumberInput label="Ngày AL" value={f.anniversary_lunar_day ?? person.anniversary_lunar_day ?? ""} onChange={(v) => patch({ anniversary_lunar_day: v === "" ? undefined : (v as number) })} min={1} max={30} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ảnh đại diện */}
          <AvatarUploadField
            avatarUrl={edit.avatar_temp_url}
            currentAvatarUrl={person.avatar_url}
            onUpload={onAvatarChange}
            onRemove={() => onAvatarChange(null)}
          />

          {/* Ghi chú */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">Ghi chú</label>
            <textarea
              rows={2}
              value={f.note ?? person.note ?? ""}
              onChange={(e) => patch({ note: e.target.value })}
              className="input-base w-full resize-none"
              placeholder="Thông tin bổ sung..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── NewPersonPanel — form thêm người mới ─────────────────────────────────────
function NewPersonPanel({
  np,
  scopePersons,
  onChange,
  onRemove,
  index,
}: {
  np: ContributionNewPerson;
  scopePersons: Person[];
  onChange: (updated: ContributionNewPerson) => void;
  onRemove: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isDeceased, setIsDeceased] = useState(np.fields.is_deceased ?? false);
  const [hasDifferentLegalBirth, setHasDifferentLegalBirth] = useState(
    !!np.fields.legal_birth_year,
  );
  const [hasDifferentAnniversary, setHasDifferentAnniversary] = useState(
    !!np.fields.anniversary_lunar_month,
  );
  const f = np.fields;

  const patch = (updates: ContributionNewPerson["fields"]) =>
    onChange({ ...np, fields: { ...f, ...updates } });

  // Lấy giá trị số hợp lệ (null/undefined/"" → undefined)
  const nv = (v: number | "" | null | undefined): number | undefined =>
    typeof v === "number" ? v : undefined;

  // Auto-convert: ngày sinh dương → âm
  const handleSolarBirthChange = (
    key: "birth_year" | "birth_month" | "birth_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "birth_year" ? numVal : nv(f.birth_year);
    const m = key === "birth_month" ? numVal : nv(f.birth_month);
    const d = key === "birth_day" ? numVal : nv(f.birth_day);
    const newFields: ContributionNewPerson["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const lunar = solarToLunarParts(y, m, d);
      if (lunar) {
        newFields.birth_lunar_year = lunar.year;
        newFields.birth_lunar_month = lunar.month;
        newFields.birth_lunar_day = lunar.day;
      }
    }
    onChange({ ...np, fields: newFields });
  };

  // Auto-convert: ngày sinh âm → dương
  const handleLunarBirthChange = (
    key: "birth_lunar_year" | "birth_lunar_month" | "birth_lunar_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "birth_lunar_year" ? numVal : nv(f.birth_lunar_year);
    const m = key === "birth_lunar_month" ? numVal : nv(f.birth_lunar_month);
    const d = key === "birth_lunar_day" ? numVal : nv(f.birth_lunar_day);
    const newFields: ContributionNewPerson["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const solar = lunarToSolarParts(y, m, d);
      if (solar) {
        newFields.birth_year = solar.year;
        newFields.birth_month = solar.month;
        newFields.birth_day = solar.day;
      }
    }
    onChange({ ...np, fields: newFields });
  };

  // Auto-convert: ngày mất âm → dương
  const handleLunarDeathChange = (
    key: "death_lunar_year" | "death_lunar_month" | "death_lunar_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "death_lunar_year" ? numVal : nv(f.death_lunar_year);
    const m = key === "death_lunar_month" ? numVal : nv(f.death_lunar_month);
    const d = key === "death_lunar_day" ? numVal : nv(f.death_lunar_day);
    const newFields: ContributionNewPerson["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const solar = lunarToSolarParts(y, m, d);
      if (solar) {
        newFields.death_year = solar.year;
        newFields.death_month = solar.month;
        newFields.death_day = solar.day;
      }
    }
    onChange({ ...np, fields: newFields });
  };

  // Auto-convert: ngày mất dương → âm
  const handleSolarDeathChange = (
    key: "death_year" | "death_month" | "death_day",
    value: number | "",
  ) => {
    const numVal = value === "" ? undefined : (value as number);
    const y = key === "death_year" ? numVal : nv(f.death_year);
    const m = key === "death_month" ? numVal : nv(f.death_month);
    const d = key === "death_day" ? numVal : nv(f.death_day);
    const newFields: ContributionNewPerson["fields"] = { ...f, [key]: numVal };
    if (y !== undefined && m !== undefined && d !== undefined && y > 100) {
      const lunar = solarToLunarParts(y, m, d);
      if (lunar) {
        newFields.death_lunar_year = lunar.year;
        newFields.death_lunar_month = lunar.month;
        newFields.death_lunar_day = lunar.day;
      }
    }
    onChange({ ...np, fields: newFields });
  };

  const toggleDeceased = (checked: boolean) => {
    setIsDeceased(checked);
    onChange({ ...np, fields: { ...f, is_deceased: checked } });
  };

  return (
    <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-white">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setExpanded((v) => !v) : undefined}
      >
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-emerald-500" />
          <span className="font-medium text-stone-800">
            {f.full_name || `Người mới #${index + 1}`}
          </span>
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Thêm mới
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-stone-400 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="size-4" />
          </button>
          {expanded ? (
            <ChevronUp className="size-4 text-stone-400" />
          ) : (
            <ChevronDown className="size-4 text-stone-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Họ tên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500">Họ và tên *</label>
              <input
                type="text"
                value={f.full_name ?? ""}
                onChange={(e) => patch({ full_name: e.target.value })}
                placeholder="Nhập tên..."
                className="input-base w-full"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500">Tên khác / biệt danh</label>
              <input
                type="text"
                value={f.other_names ?? ""}
                onChange={(e) => patch({ other_names: e.target.value })}
                placeholder=""
                className="input-base w-full"
              />
            </div>
          </div>

          <GenderSelect
            value={f.gender || ""}
            onChange={(v) => patch({ gender: v || undefined })}
          />

          {/* Cha/mẹ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">Cha / mẹ *</label>
            <PersonSelector
              persons={scopePersons}
              selectedId={np.parent_person_id || null}
              onSelect={(id) => onChange({ ...np, parent_person_id: id ?? "" })}
              placeholder="Chọn cha hoặc mẹ..."
              label=""
              className="w-full"
            />
          </div>

          {/* Loại quan hệ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">Loại con</label>
            <select
              value={np.relation_type}
              onChange={(e) =>
                onChange({ ...np, relation_type: e.target.value as ContributionNewPerson["relation_type"] })
              }
              className="input-base w-full"
            >
              <option value="biological_child">Con ruột</option>
              <option value="adopted_child">Con nuôi</option>
            </select>
          </div>

          {/* Ngày sinh dương */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Ngày sinh (dương lịch)</p>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="Năm" value={f.birth_year ?? ""} onChange={(v) => handleSolarBirthChange("birth_year", v)} min={1800} max={2100} />
              <NumberInput label="Tháng" value={f.birth_month ?? ""} onChange={(v) => handleSolarBirthChange("birth_month", v)} min={1} max={12} />
              <NumberInput label="Ngày" value={f.birth_day ?? ""} onChange={(v) => handleSolarBirthChange("birth_day", v)} min={1} max={31} />
            </div>
          </div>

          {/* Ngày sinh âm */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Ngày sinh (âm lịch)</p>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="Năm AL" value={f.birth_lunar_year ?? ""} onChange={(v) => handleLunarBirthChange("birth_lunar_year", v)} min={1800} max={2100} />
              <NumberInput label="Tháng AL" value={f.birth_lunar_month ?? ""} onChange={(v) => handleLunarBirthChange("birth_lunar_month", v)} min={1} max={12} />
              <NumberInput label="Ngày AL" value={f.birth_lunar_day ?? ""} onChange={(v) => handleLunarBirthChange("birth_lunar_day", v)} min={1} max={30} />
            </div>
          </div>

          {/* Ngày sinh trên giấy tờ */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasDifferentLegalBirth}
                onChange={(e) => {
                  setHasDifferentLegalBirth(e.target.checked);
                  if (!e.target.checked) {
                    patch({ legal_birth_year: undefined, legal_birth_month: undefined, legal_birth_day: undefined });
                  }
                }}
                className="size-4 rounded border-stone-300 accent-amber-600"
              />
              <span className="text-sm text-stone-600">Khác ngày sinh trên giấy tờ</span>
            </label>
            {hasDifferentLegalBirth && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                  Ngày sinh trên giấy tờ (dương lịch)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput label="Năm" value={f.legal_birth_year ?? ""} onChange={(v) => patch({ legal_birth_year: v === "" ? undefined : (v as number) })} min={1800} max={2100} />
                  <NumberInput label="Tháng" value={f.legal_birth_month ?? ""} onChange={(v) => patch({ legal_birth_month: v === "" ? undefined : (v as number) })} min={1} max={12} />
                  <NumberInput label="Ngày" value={f.legal_birth_day ?? ""} onChange={(v) => patch({ legal_birth_day: v === "" ? undefined : (v as number) })} min={1} max={31} />
                </div>
              </div>
            )}
          </div>

          {/* Số điện thoại */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">
              Số điện thoại{" "}
              <span className="text-stone-400 font-normal">(tùy chọn — chỉ admin xem)</span>
            </label>
            <input
              type="tel"
              value={f.phone_number ?? ""}
              onChange={(e) => patch({ phone_number: e.target.value || undefined })}
              placeholder="0912 345 678"
              className="input-base w-full"
            />
          </div>

          {/* Đã mất toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => toggleDeceased(e.target.checked)}
              className="size-4 rounded border-stone-300 accent-amber-600"
            />
            <span className="text-sm font-medium text-stone-700">Đã mất</span>
          </label>

          {/* Ngày mất */}
          {isDeceased && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Ngày mất (âm lịch)</p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput label="Năm AL" value={f.death_lunar_year ?? ""} onChange={(v) => handleLunarDeathChange("death_lunar_year", v)} min={1800} max={2100} />
                  <NumberInput label="Tháng AL" value={f.death_lunar_month ?? ""} onChange={(v) => handleLunarDeathChange("death_lunar_month", v)} min={1} max={12} />
                  <NumberInput label="Ngày AL" value={f.death_lunar_day ?? ""} onChange={(v) => handleLunarDeathChange("death_lunar_day", v)} min={1} max={30} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Ngày mất (dương lịch)</p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberInput label="Năm" value={f.death_year ?? ""} onChange={(v) => handleSolarDeathChange("death_year", v)} min={1800} max={2100} />
                  <NumberInput label="Tháng" value={f.death_month ?? ""} onChange={(v) => handleSolarDeathChange("death_month", v)} min={1} max={12} />
                  <NumberInput label="Ngày" value={f.death_day ?? ""} onChange={(v) => handleSolarDeathChange("death_day", v)} min={1} max={31} />
                </div>
              </div>

              {/* Ngày giỗ */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasDifferentAnniversary}
                    onChange={(e) => {
                      setHasDifferentAnniversary(e.target.checked);
                      if (!e.target.checked) {
                        patch({ anniversary_lunar_year: undefined, anniversary_lunar_month: undefined, anniversary_lunar_day: undefined });
                      }
                    }}
                    className="size-4 rounded border-stone-300 accent-amber-600"
                  />
                  <span className="text-sm text-stone-600">Ngày giỗ khác ngày mất</span>
                </label>
                {hasDifferentAnniversary && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                      Ngày giỗ (âm lịch)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <NumberInput label="Năm AL" value={f.anniversary_lunar_year ?? ""} onChange={(v) => patch({ anniversary_lunar_year: v === "" ? undefined : (v as number) })} min={1800} max={2100} />
                      <NumberInput label="Tháng AL" value={f.anniversary_lunar_month ?? ""} onChange={(v) => patch({ anniversary_lunar_month: v === "" ? undefined : (v as number) })} min={1} max={12} />
                      <NumberInput label="Ngày AL" value={f.anniversary_lunar_day ?? ""} onChange={(v) => patch({ anniversary_lunar_day: v === "" ? undefined : (v as number) })} min={1} max={30} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ảnh đại diện */}
          <AvatarUploadField
            avatarUrl={np.avatar_temp_url}
            onUpload={(url) => onChange({ ...np, avatar_temp_url: url })}
            onRemove={() => onChange({ ...np, avatar_temp_url: null })}
          />

          {/* Ghi chú */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">Ghi chú</label>
            <textarea
              rows={2}
              value={f.note ?? ""}
              onChange={(e) => patch({ note: e.target.value })}
              className="input-base w-full resize-none"
              placeholder="Thông tin bổ sung..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── ContributeForm chính ──────────────────────────────────────────────────────
export default function ContributeForm({ token, context }: Props) {
  const persons: Person[] = (context.persons ?? []) as Person[];
  const [edits, setEdits] = useState<ContributionEdit[]>(() =>
    context.allow_edit && persons.length === 1
      ? [{ person_id: persons[0].id, fields: {} }]
      : [],
  );
  const [newPersons, setNewPersons] = useState<ContributionNewPerson[]>([]);
  const [contributorName, setContributorName] = useState("");
  const [contributorNote, setContributorNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Chọn người cần sửa từ dropdown
  const [selectedEditPersonId, setSelectedEditPersonId] = useState<string | null>(null);

  const addEdit = useCallback(
    (personId: string) => {
      if (edits.some((e) => e.person_id === personId)) return;
      setEdits((prev) => [...prev, { person_id: personId, fields: {} }]);
      setSelectedEditPersonId(null);
    },
    [edits],
  );

  const updateEdit = useCallback(
    (personId: string, fields: ContributionEdit["fields"]) => {
      setEdits((prev) =>
        prev.map((e) => (e.person_id === personId ? { ...e, fields } : e)),
      );
    },
    [],
  );

  const updateEditAvatar = useCallback(
    (personId: string, url: string | null) => {
      setEdits((prev) =>
        prev.map((e) => (e.person_id === personId ? { ...e, avatar_temp_url: url } : e)),
      );
    },
    [],
  );

  const removeEdit = useCallback((personId: string) => {
    setEdits((prev) => prev.filter((e) => e.person_id !== personId));
  }, []);

  const addNewPerson = useCallback(() => {
    setNewPersons((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}`,
        fields: {},
        parent_person_id: "",
        relation_type: "biological_child",
      },
    ]);
  }, []);

  const updateNewPerson = useCallback(
    (tempId: string, updated: ContributionNewPerson) => {
      setNewPersons((prev) =>
        prev.map((np) => (np.tempId === tempId ? updated : np)),
      );
    },
    [],
  );

  const removeNewPerson = useCallback((tempId: string) => {
    setNewPersons((prev) => prev.filter((np) => np.tempId !== tempId));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!contributorName.trim()) {
      setError("Vui lòng nhập tên của bạn.");
      return;
    }

    // Validate new persons
    for (const np of newPersons) {
      if (!np.fields.full_name?.trim()) {
        setError("Người mới cần có họ tên.");
        return;
      }
      if (!np.parent_person_id) {
        setError(`Người "${np.fields.full_name}" chưa chọn cha/mẹ.`);
        return;
      }
    }

    const payload: ContributionPayload = {
      edits: edits.filter((e) => Object.keys(e.fields).length > 0 || !!e.avatar_temp_url),
      new_persons: newPersons,
    };

    if (payload.edits.length === 0 && payload.new_persons.length === 0) {
      setError("Chưa có thay đổi nào. Hãy chỉnh sửa ít nhất 1 thông tin.");
      return;
    }

    setLoading(true);
    const result = await submitContribution(
      token,
      contributorName,
      contributorNote,
      payload,
    );
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSubmitted(true);
  };

  // ── Màn cảm ơn ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-emerald-50 mb-4">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">Cảm ơn bạn!</h3>
        <p className="text-stone-500 text-sm max-w-sm mx-auto">
          Đề xuất của bạn đã được ghi nhận. Quản trị viên sẽ xét duyệt
          và cập nhật thông tin vào gia phả.
        </p>
      </div>
    );
  }

  // Người chưa có trong danh sách edits
  const personsNotEditing = persons.filter(
    (p) => !edits.some((e) => e.person_id === p.id),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Sửa người có sẵn ── */}
      {context.allow_edit && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-700">Chỉnh sửa thông tin</h3>
            <span className="text-xs text-stone-400">{persons.length} người trong phạm vi</span>
          </div>

          {edits.length === 0 && (
            <p className="text-sm text-stone-400 mb-3">
              Chọn người cần bổ sung thông tin:
            </p>
          )}

          <div className="space-y-3">
            {edits.map((edit) => {
              const person = persons.find((p) => p.id === edit.person_id);
              if (!person) return null;
              return (
                <EditPersonPanel
                  key={edit.person_id}
                  person={person}
                  edit={edit}
                  onChange={(fields) => updateEdit(edit.person_id, fields)}
                  onAvatarChange={(url) => updateEditAvatar(edit.person_id, url)}
                  onRemove={() => removeEdit(edit.person_id)}
                />
              );
            })}
          </div>

          {personsNotEditing.length > 0 && (
            <div className="mt-3">
              <PersonSelector
                persons={personsNotEditing}
                selectedId={selectedEditPersonId}
                onSelect={(id) => {
                  if (id) addEdit(id);
                }}
                placeholder="+ Chọn người để chỉnh sửa..."
                label=""
                className="w-full"
              />
            </div>
          )}
        </section>
      )}

      {/* ── Thêm người mới ── */}
      {context.allow_add && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-700">Thêm thành viên mới</h3>
          </div>

          <div className="space-y-3">
            {newPersons.map((np, i) => (
              <NewPersonPanel
                key={np.tempId}
                np={np}
                scopePersons={persons}
                onChange={(updated) => updateNewPerson(np.tempId, updated)}
                onRemove={() => removeNewPerson(np.tempId)}
                index={i}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addNewPerson}
            className="mt-3 flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            <Plus className="size-4" />
            Thêm thành viên mới
          </button>
        </section>
      )}

      {/* ── Thông tin người đóng góp ── */}
      <section className="border-t border-stone-100 pt-6 space-y-3">
        <h3 className="font-semibold text-stone-700">Thông tin người đóng góp</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">
              Tên của bạn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              placeholder="Họ và tên..."
              className="input-base w-full"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500">
              Quan hệ / ghi chú thêm
            </label>
            <input
              type="text"
              value={contributorNote}
              onChange={(e) => setContributorNote(e.target.value)}
              placeholder="Vd: Con cháu chi 3, cháu của cụ X..."
              className="input-base w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Lỗi + Submit ── */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Đang gửi...
          </>
        ) : (
          "Gửi đề xuất"
        )}
      </button>

      <p className="text-center text-xs text-stone-400">
        Mọi thay đổi sẽ được quản trị viên xét duyệt trước khi lưu vào gia phả.
      </p>
    </form>
  );
}
