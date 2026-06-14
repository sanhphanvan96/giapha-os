"use server";

import { UserRole } from "@/types";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

export async function changeUserRole(userId: string, newRole: UserRole) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to change user role:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_user", {
    target_user_id: userId,
  });

  if (error) {
    console.error("Failed to delete user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function adminCreateUser(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString() || "member";

  if (role !== "admin" && role !== "editor" && role !== "member") {
    return { error: "Vai trò không hợp lệ." };
  }

  const isActiveStr = formData.get("is_active")?.toString();
  const isActive = isActiveStr === "false" ? false : true;

  if (!email || !password) {
    return { error: "Email và mật khẩu là bắt buộc." };
  }

  const supabase = await getSupabase();

  const { error } = await supabase.rpc("admin_create_user", {
    new_email: email,
    new_password: password,
    new_role: role,
    new_active: isActive,
  });

  if (error) {
    console.error("Failed to create user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string, newStatus: boolean) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_active_status", {
    target_user_id: userId,
    new_status: newStatus,
  });

  if (error) {
    console.error("Failed to change user status:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

// Link / unlink the currently logged-in user to a person ("Đây là tôi").
// Does NOT accept a userId param — always updates auth.uid() via SECURITY DEFINER RPC.
export async function linkMyPerson(personId: string | null) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_my_person", {
    target_person_id: personId,
  });

  if (error) {
    console.error("Failed to link person:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// Admin assigns a person to any user.
// Access is enforced by the SECURITY DEFINER RPC (raises 'Access denied.' for non-admins).
export async function adminSetUserPerson(
  userId: string,
  personId: string | null,
) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("admin_set_user_person", {
    target_user_id: userId,
    target_person_id: personId,
  });

  if (error) {
    console.error("Failed to admin-set user person:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

// Change own email without triggering Supabase's "Secure email change" confirmation.
// Uses a SECURITY DEFINER RPC that writes directly to auth.users (same pattern as admin_create_user).
export async function updateMyEmail(newEmail: string) {
  const email = newEmail.trim().toLowerCase();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email)) {
    return { error: "Email không hợp lệ." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("update_my_email", {
    new_email: email,
  });

  if (error) {
    console.error("Failed to update email:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// Update the avatar_url of the currently logged-in user's profile.
// Uses SECURITY DEFINER RPC to bypass missing UPDATE RLS on profiles table.
export async function updateMyAvatar(avatarUrl: string | null) {
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.rpc("update_my_avatar", {
    new_avatar_url: avatarUrl,
  });

  if (error) {
    console.error("Failed to update avatar:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
