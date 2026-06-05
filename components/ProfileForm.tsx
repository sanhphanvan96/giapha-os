"use client";

import { linkMyPerson, updateMyAvatar, updateMyEmail } from "@/app/actions/user";
import PersonSelector from "@/components/PersonSelector";
import { Person } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Camera, KeyRound, Mail, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/utils/imageCompressor";

interface ProfileFormProps {
  userId: string;
  email: string;
  currentAvatarUrl: string | null;
  currentPersonId: string | null;
  persons: Person[];
}

type Status = { type: "success" | "error"; message: string } | null;

export default function ProfileForm({
  userId,
  email,
  currentAvatarUrl,
  currentPersonId,
  persons,
}: ProfileFormProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [personId, setPersonId] = useState<string | null>(currentPersonId);
  const [avatarStatus, setAvatarStatus] = useState<Status>(null);
  const [personStatus, setPersonStatus] = useState<Status>(null);
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLinkingPerson, setIsLinkingPerson] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync avatar from server prop (e.g. after router.refresh() causes remount).
  // Skipped while uploading so the local blob preview is not clobbered.
  useEffect(() => {
    if (!isUploadingAvatar) setAvatarUrl(currentAvatarUrl);
  }, [currentAvatarUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    // Validate size and file type first
    if (!originalFile.type.startsWith("image/")) {
      setAvatarStatus({ type: "error", message: "Định dạng file không hợp lệ. Vui lòng chọn ảnh." });
      return;
    }
    if (originalFile.size > 10 * 1024 * 1024) {
      setAvatarStatus({ type: "error", message: "Kích thước ảnh gốc phải nhỏ hơn 10MB." });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarStatus(null);

    try {
      const supabase = createClient();
      
      // Compress the image before uploading
      const compressedFile = await compressImage(originalFile, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        outputType: "image/webp",
      });

      // Local preview immediately using compressed version
      const objectUrl = URL.createObjectURL(compressedFile);
      setAvatarUrl(objectUrl);

      const filePath = `profile_${userId}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const result = await updateMyAvatar(publicUrl);
      if ("error" in result) throw new Error(result.error);

      setAvatarUrl(publicUrl);
      setAvatarStatus({ type: "success", message: "Đã cập nhật ảnh đại diện." });
      router.refresh();
    } catch (err) {
      setAvatarStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi khi tải ảnh lên.",
      });
      // Restore avatar URL in case of error
      setAvatarUrl(currentAvatarUrl);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── Person link ────────────────────────────────────────────────────────────
  const handlePersonLink = async (selectedId: string | null) => {
    setPersonId(selectedId);
    setIsLinkingPerson(true);
    setPersonStatus(null);

    const result = await linkMyPerson(selectedId);
    setIsLinkingPerson(false);

    if ("error" in result) {
      setPersonStatus({ type: "error", message: result.error ?? "Lỗi không xác định." });
      return;
    }
    setPersonStatus({
      type: "success",
      message: selectedId ? "Đã gắn thành viên." : "Đã bỏ liên kết.",
    });
    router.refresh();
  };

  // ── Email update ───────────────────────────────────────────────────────────
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === email) return;
    setIsUpdatingEmail(true);
    setEmailStatus(null);

    const result = await updateMyEmail(newEmail);
    setIsUpdatingEmail(false);

    if ("error" in result) {
      setEmailStatus({ type: "error", message: result.error ?? "Lỗi khi đổi email." });
      return;
    }
    setEmailStatus({ type: "success", message: "Đã đổi email thành công." });
    router.refresh();
  };

  // ── Password update ────────────────────────────────────────────────────────
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Mật khẩu xác nhận không khớp." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "Mật khẩu phải ít nhất 6 ký tự." });
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({ type: "success", message: "Đã đổi mật khẩu thành công." });
    } catch (err) {
      setPasswordStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi khi đổi mật khẩu.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Avatar ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <Camera className="size-4 text-amber-600" />
          Ảnh đại diện
        </h2>
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full overflow-hidden bg-gradient-to-br from-amber-200 to-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xl shadow-sm ring-2 ring-amber-300/50 shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{email.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="btn-amber text-sm"
              >
                {isUploadingAvatar ? "Đang tải lên..." : "Đổi ảnh"}
              </button>
              {/* Show "Remove" only when user has a custom uploaded avatar (not gravatar) */}
              {currentAvatarUrl && !currentAvatarUrl.includes("gravatar.com") && (
                <button
                  onClick={async () => {
                    const result = await updateMyAvatar(null);
                    if (!("error" in result)) {
                      setAvatarUrl(null);
                      setAvatarStatus({ type: "success", message: "Đã xóa ảnh đại diện." });
                      router.refresh();
                    }
                  }}
                  disabled={isUploadingAvatar}
                  className="btn text-sm text-stone-500"
                >
                  Xóa ảnh
                </button>
              )}
            </div>
            {avatarStatus && (
              <p
                className={`mt-2 text-sm ${avatarStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}
              >
                {avatarStatus.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Person link ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-1 flex items-center gap-2">
          <UserCheck className="size-4 text-amber-600" />
          Đây là tôi trong gia phả
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Chọn thành viên bạn muốn đại diện. Khi mở cây gia phả, danh xưng sẽ
          được tính từ góc nhìn của bạn.
        </p>
        <PersonSelector
          persons={persons}
          selectedId={personId}
          onSelect={handlePersonLink}
          placeholder="Chọn thành viên..."
          label=""
          className="w-full sm:w-80"
          showAllOption
          allOptionLabel="Bỏ liên kết"
        />
        {isLinkingPerson && (
          <p className="mt-2 text-sm text-stone-500">Đang lưu...</p>
        )}
        {personStatus && (
          <p
            className={`mt-2 text-sm ${personStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}
          >
            {personStatus.message}
          </p>
        )}
      </section>

      {/* ── Email ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <Mail className="size-4 text-amber-600" />
          Đổi email
        </h2>
        <form onSubmit={handleEmailUpdate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email mới
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              placeholder="email@example.com"
            />
          </div>
          {emailStatus && (
            <p
              className={`text-sm ${emailStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}
            >
              {emailStatus.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isUpdatingEmail || !newEmail || newEmail === email}
            className="btn-amber text-sm"
          >
            {isUpdatingEmail ? "Đang lưu..." : "Lưu email"}
          </button>
        </form>
      </section>

      {/* ── Password ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <KeyRound className="size-4 text-amber-600" />
          Đổi mật khẩu
        </h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
              className="w-full px-3 py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              placeholder="Ít nhất 6 ký tự"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              placeholder="Nhập lại mật khẩu"
            />
          </div>
          {passwordStatus && (
            <p
              className={`text-sm ${passwordStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}
            >
              {passwordStatus.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword}
            className="btn-amber text-sm"
          >
            {isUpdatingPassword ? "Đang lưu..." : "Đổi mật khẩu"}
          </button>
        </form>
      </section>
    </div>
  );
}
