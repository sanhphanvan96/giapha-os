"use server";

import { getSupabase, getUser } from "@/utils/supabase/queries";

type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(sub: PushSubscriptionInput) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const supabase = await getSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth_key: sub.keys.auth,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    console.error("subscribeToPush:", error);
    return { error: error.message };
  }

  return { success: true as const };
}

export async function unsubscribeFromPush(endpoint: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const supabase = await getSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("unsubscribeFromPush:", error);
    return { error: error.message };
  }

  return { success: true as const };
}
