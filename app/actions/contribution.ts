"use server";

import { getProfile, getSupabase } from "@/utils/supabase/queries";
import {
  ContributionContext,
  ContributionLink,
  ContributionPayload,
  PendingContribution,
} from "@/types";
import { revalidatePath } from "next/cache";

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
  const { error } = await supabase.rpc("approve_contribution", {
    p_id: id,
    p_review_note: reviewNote ?? null,
  });

  if (error) {
    console.error("Failed to approve contribution:", error);
    return { error: error.message };
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
