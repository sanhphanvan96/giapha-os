"use server";

import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

export interface ShareView {
  viewed_at: string;
  ip: string | null;
  user_agent: string | null;
  city: string | null;
  referrer: string | null;
  device_type: string | null;
}

export interface ShareViewStat {
  token: string;
  total_views: number;
  last_viewed: string | null;
}

/**
 * Tạo một liên kết chia sẻ mới dạng giapha-xxxxxx
 */
export async function createShareLink(expiryDays: number, settings: Record<string, unknown> = {}) {
  const profile = await getProfile();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: "Từ chối truy cập. Chỉ Admin hoặc Editor mới có quyền tạo liên kết chia sẻ." };
  }

  const supabase = await getSupabase();

  // Sinh chuỗi ngẫu nhiên 6 ký tự gồm chữ/số
  const randomChars = Math.random().toString(36).substring(2, 8);
  const token = `giapha-${randomChars}`;

  // Tính ngày hết hạn
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { error } = await supabase
    .from("shared_links")
    .insert({
      token,
      expires_at: expiresAt.toISOString(),
      created_by: profile.id,
      settings
    });

  if (error) {
    console.error("Error creating share link:", error);
    return { error: "Không thể tạo liên kết chia sẻ. Vui lòng thử lại." };
  }

  revalidatePath("/dashboard/members");
  return { success: true, token };
}

/**
 * Lấy danh sách các liên kết chia sẻ đang có
 */
export async function getShareLinks() {
  const profile = await getProfile();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: "Từ chối truy cập." };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("shared_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching share links:", error);
    return { error: "Không thể tải danh sách liên kết." };
  }

  return { success: true, links: data || [] };
}

/**
 * Lấy tổng hợp lượt xem theo từng token (chỉ admin, guard trong RPC)
 */
export async function getShareViewStats(): Promise<{ data?: ShareViewStat[]; error?: string }> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_share_view_stats");

  if (error) {
    console.error("Error fetching share view stats:", error);
    return { error: error.message };
  }

  return { data: (data as ShareViewStat[]) || [] };
}

/**
 * Lấy nhật ký lượt xem chi tiết của 1 link (chỉ admin, guard trong RPC)
 */
export async function getShareViews(
  token: string,
  limit = 100
): Promise<{ data?: ShareView[]; error?: string }> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_share_views", {
    p_token: token,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching share views:", error);
    return { error: error.message };
  }

  return { data: (data as ShareView[]) || [] };
}

/**
 * Thu hồi/Xóa một liên kết chia sẻ
 */
export async function deleteShareLink(token: string) {
  const profile = await getProfile();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: "Từ chối truy cập." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase
    .from("shared_links")
    .delete()
    .eq("token", token);

  if (error) {
    console.error("Error deleting share link:", error);
    return { error: "Không thể thu hồi liên kết." };
  }

  revalidatePath("/dashboard/members");
  return { success: true };
}
