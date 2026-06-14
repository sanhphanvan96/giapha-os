"use server";

import { getProfile, getSupabase } from "@/utils/supabase/queries";
import {
  ContributionContext,
  ContributionLink,
  ContributionPayload,
  PendingContribution,
} from "@/types";
import { isAllowedTempImageUrl } from "@/utils/contributionHelpers";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPushToSubscriptions } from "@/utils/push";
import { revalidatePath } from "next/cache";

// ── Helper: copy ảnh từ URL tạm về Supabase bucket avatars (best-effort) ──────

type ServerSupabase = Awaited<ReturnType<typeof getSupabase>>;

async function copyAvatarFromTemp(
  supabase: ServerSupabase,
  personId: string,
  tempUrl: string,
): Promise<void> {
  try {
    // Guard SSRF: chỉ chấp nhận ảnh tạm từ litterbox qua HTTPS
    if (!isAllowedTempImageUrl(tempUrl)) {
      console.error("copyAvatarFromTemp: URL/host không cho phép", tempUrl);
      return;
    }

    const resp = await fetch(tempUrl);
    if (!resp.ok) {
      console.error(`copyAvatarFromTemp: fetch ${tempUrl} → ${resp.status}`);
      return;
    }
    const arrayBuffer = await (await resp.blob()).arrayBuffer();
    const fileName = `${personId}_contrib.webp`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, arrayBuffer, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      console.error("copyAvatarFromTemp: upload error", uploadError);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("persons")
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
      .eq("id", personId);

    if (updateError) {
      console.error("copyAvatarFromTemp: update person error", updateError);
    }
  } catch (err) {
    console.error("copyAvatarFromTemp: unexpected error", err);
  }
}

// Báo cho admin đã subscribe push khi có đề xuất mới — best-effort, không throw.
async function notifyAdminsNewContribution(contributorName: string): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;

    const { data, error } = await admin.rpc("get_push_subscriptions_for", {
      p_role: "admin",
      p_pref_key: "new_contribution",
    });

    if (error) {
      console.error("notifyAdminsNewContribution: RPC error", error);
      return;
    }

    await sendPushToSubscriptions(data ?? [], {
      title: "Đề xuất mới",
      body: `${contributorName} vừa gửi một đề xuất bổ sung gia phả.`,
      url: "/dashboard/contributions",
      tag: "contribution",
    });
  } catch (err) {
    console.error("notifyAdminsNewContribution: unexpected error", err);
  }
}

// ── Admin: tạo link đóng góp ──────────────────────────────────

export async function createContributionLink(
  scope: string[],
  allowEdit: boolean,
  allowAdd: boolean,
  note: string,
  expiryDays: number,
): Promise<{ success?: true; token?: string; error?: string }> {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Chỉ Admin mới có thể tạo link đóng góp." };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("admin_create_contribution_link", {
    p_scope: scope,
    p_allow_edit: allowEdit,
    p_allow_add: allowAdd,
    p_note: note || null,
    p_expiry_days: expiryDays,
  });

  if (error) {
    console.error("Failed to create contribution link:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/sharing");
  return { success: true, token: data as string };
}

// ── Admin: lấy danh sách link ────────────────────────────────

export async function getContributionLinks(): Promise<ContributionLink[]> {
  const profile = await getProfile();
  if (profile?.role !== "admin") return [];

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_contribution_links");

  if (error) {
    // PGRST202 = function not found (migration chưa áp lên production)
    if ((error as { code?: string }).code !== "PGRST202") {
      console.error("Failed to get contribution links:", error.message, error.details);
    }
    return [];
  }

  return (data as ContributionLink[]) ?? [];
}

// ── Admin: thu hồi link ──────────────────────────────────────

export async function revokeContributionLink(
  token: string,
): Promise<{ success?: true; error?: string }> {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Chỉ Admin mới có thể thu hồi link." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("revoke_contribution_link", {
    p_token: token,
  });

  if (error) {
    console.error("Failed to revoke contribution link:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/sharing");
  return { success: true };
}

// ── Public: upload ảnh tạm qua server-proxy (không cần login) ───────────────
// Ảnh được upload lên litterbox (72h), không ghi vào Supabase Storage.
// Khi admin duyệt đề xuất, app sẽ kéo ảnh về bucket avatars.

export async function uploadContributionImage(
  dataUrl: string,
): Promise<{ url?: string; error?: string }> {
  if (!dataUrl.startsWith("data:image/")) {
    return { error: "File không hợp lệ." };
  }

  const [header, base64Data] = dataUrl.split(",");
  if (!base64Data) return { error: "Dữ liệu ảnh không hợp lệ." };

  const mimeMatch = header.match(/data:([^;]+);/);
  const mimeType = mimeMatch?.[1] ?? "image/webp";

  const buffer = Buffer.from(base64Data, "base64");
  // Sau nén client-side (512×512, q0.7) kích thước thường ~50–200KB; giới hạn 4MB
  if (buffer.byteLength > 4 * 1024 * 1024) {
    return { error: "Ảnh quá lớn (tối đa 4MB)." };
  }

  const ext = mimeType.split("/")[1] ?? "webp";
  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("time", "72h");
  formData.append(
    "fileToUpload",
    new Blob([buffer], { type: mimeType }),
    `avatar.${ext}`,
  );

  let resp: Response;
  try {
    resp = await fetch(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      { method: "POST", body: formData },
    );
  } catch (err) {
    console.error("uploadContributionImage: network error", err);
    return { error: "Không thể kết nối đến máy chủ ảnh. Thử lại sau." };
  }

  if (!resp.ok) {
    console.error("uploadContributionImage: resp not ok", resp.status);
    return { error: "Upload ảnh thất bại. Thử lại sau." };
  }

  const url = (await resp.text()).trim();
  if (!url.startsWith("https://")) {
    console.error("uploadContributionImage: unexpected response", url);
    return { error: "Upload ảnh thất bại. Thử lại sau." };
  }

  return { url };
}

// ── Public: lấy context từ token (không cần login) ──────────

export async function getContributionContext(
  token: string,
): Promise<ContributionContext> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_contribution_context", {
    p_token: token,
  });

  if (error) {
    console.error("Failed to get contribution context:", error);
    return { valid: false, reason: "not_found" };
  }

  return (data as ContributionContext) ?? { valid: false, reason: "not_found" };
}

// ── Public: gửi đề xuất (không cần login) ───────────────────

export async function submitContribution(
  token: string,
  name: string,
  note: string,
  payload: ContributionPayload,
): Promise<{ success?: true; contributionId?: string; error?: string }> {
  if (!name.trim()) {
    return { error: "Vui lòng nhập tên của bạn." };
  }

  if (
    payload.edits.length === 0 &&
    payload.new_persons.length === 0
  ) {
    return { error: "Chưa có thay đổi nào để gửi." };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("submit_contribution", {
    p_token: token,
    p_name: name.trim(),
    p_note: note.trim() || null,
    p_payload: payload,
  });

  if (error) {
    console.error("Failed to submit contribution:", error);
    return { error: error.message };
  }

  // await để đảm bảo chạy xong trước khi serverless function bị đóng (Vercel);
  // hàm tự catch lỗi nên không ảnh hưởng kết quả trả về cho người gửi.
  await notifyAdminsNewContribution(name.trim());

  return { success: true, contributionId: data as string };
}

// ── Admin: lấy danh sách đề xuất ────────────────────────────

export async function getPendingContributions(): Promise<PendingContribution[]> {
  const profile = await getProfile();
  if (profile?.role !== "admin") return [];

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_pending_contributions");

  if (error) {
    if ((error as { code?: string }).code !== "PGRST202") {
      console.error("Failed to get pending contributions:", error.message, error.details);
    }
    return [];
  }

  return (data as PendingContribution[]) ?? [];
}

// ── Admin: duyệt đề xuất ─────────────────────────────────────

export async function approveContribution(
  id: string,
  reviewNote?: string,
): Promise<{ success?: true; error?: string }> {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Chỉ Admin mới có thể duyệt đề xuất." };
  }

  const supabase = await getSupabase();

  // Đọc payload trước khi gọi RPC để lấy avatar_temp_url (best-effort)
  const { data: contribRow } = await supabase
    .from("contributions")
    .select("payload")
    .eq("id", id)
    .single<{ payload: ContributionPayload }>();

  // RPC trả { new_person_ids: { tempId: uuid } } từ migration 20260608120000
  const { data: rpcResult, error } = await supabase.rpc("approve_contribution", {
    p_id: id,
    p_review_note: reviewNote ?? null,
  });

  if (error) {
    console.error("Failed to approve contribution:", error);
    return { error: error.message };
  }

  // Copy avatar từ URL tạm vào bucket avatars (best-effort — lỗi không block approve)
  if (contribRow?.payload) {
    const payload = contribRow.payload;
    const newPersonIds =
      (rpcResult as { new_person_ids?: Record<string, string> } | null)
        ?.new_person_ids ?? {};

    const tasks: Promise<void>[] = [];

    for (const edit of payload.edits ?? []) {
      if (edit.avatar_temp_url) {
        tasks.push(copyAvatarFromTemp(supabase, edit.person_id, edit.avatar_temp_url));
      }
    }
    for (const np of payload.new_persons ?? []) {
      const newId = newPersonIds[np.tempId];
      if (np.avatar_temp_url && newId) {
        tasks.push(copyAvatarFromTemp(supabase, newId, np.avatar_temp_url));
      }
    }

    await Promise.allSettled(tasks);
  }

  revalidatePath("/dashboard/contributions");
  revalidatePath("/dashboard/members");
  return { success: true };
}

// ── Admin: chỉnh sửa payload trước khi duyệt ────────────────

export async function updateContributionPayload(
  id: string,
  payload: ContributionPayload,
): Promise<{ success?: true; error?: string }> {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Chỉ Admin mới có thể chỉnh sửa đề xuất." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase
    .from("contributions")
    .update({ payload })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("Failed to update contribution payload:", error);
    return { error: error.message };
  }

  return { success: true };
}

// ── Admin: từ chối đề xuất ───────────────────────────────────

export async function rejectContribution(
  id: string,
  reviewNote?: string,
): Promise<{ success?: true; error?: string }> {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Chỉ Admin mới có thể từ chối đề xuất." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("reject_contribution", {
    p_id: id,
    p_review_note: reviewNote ?? null,
  });

  if (error) {
    console.error("Failed to reject contribution:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/contributions");
  return { success: true };
}
