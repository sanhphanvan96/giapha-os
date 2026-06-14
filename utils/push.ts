import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Gửi push tới danh sách subscription, best-effort. Subscription đã hết hạn
 * (404/410) bị xóa khỏi push_subscriptions.
 */
export async function sendPushToSubscriptions(
  subs: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<void> {
  if (subs.length === 0) return;
  if (!ensureConfigured()) {
    console.warn("sendPushToSubscriptions: VAPID keys chưa cấu hình, bỏ qua.");
    return;
  }

  const admin = createAdminClient();
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if ((statusCode === 404 || statusCode === 410) && admin) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          console.error("sendPushToSubscriptions: gửi thất bại", err);
        }
      }
    }),
  );
}
