import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Client dùng service_role, bypass RLS — chỉ gọi từ server, không bao giờ
 * import vào client component. Dùng cho các tác vụ chạy trong context anon
 * (vd submitContribution) cần đọc dữ liệu mà RLS của user hiện tại không cho phép.
 */
export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
