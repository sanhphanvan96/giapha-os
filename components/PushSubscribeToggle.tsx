"use client";

import { subscribeToPush, unsubscribeFromPush } from "@/app/actions/push";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// VAPID public key dạng base64url → Uint8Array, theo yêu cầu của pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "loading" | "subscribed" | "unsubscribed";

export default function PushSubscribeToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  const handleSubscribe = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert("Chưa cấu hình VAPID key.");
      return;
    }

    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Bạn cần cho phép thông báo trong trình duyệt.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const json = sub.toJSON();
      const result = await subscribeToPush({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      setStatus("subscribed");
    } catch (err) {
      console.error("PushSubscribeToggle: subscribe error", err);
      alert("Không thể bật thông báo. Thử lại sau.");
    } finally {
      setPending(false);
    }
  };

  const handleUnsubscribe = async () => {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (err) {
      console.error("PushSubscribeToggle: unsubscribe error", err);
      alert("Không thể tắt thông báo. Thử lại sau.");
    } finally {
      setPending(false);
    }
  };

  if (status === "unsupported" || status === "loading") return null;

  if (status === "subscribed") {
    return (
      <button
        type="button"
        onClick={handleUnsubscribe}
        disabled={pending}
        className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-700 text-sm font-medium transition-colors"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
        Đã bật thông báo
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-60 text-stone-600 text-sm font-medium transition-colors"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Bell className="size-4" />
      )}
      Bật thông báo
    </button>
  );
}
