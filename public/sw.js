// Service worker cho Web Push notification (POC).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = { title: "Gia Phả Online", body: "", url: "/dashboard" };
  try {
    payload = event.data.json();
  } catch {
    // ignore — fallback dùng giá trị mặc định
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/android-chrome-192x192.png",
      data: { url: payload.url },
      tag: payload.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // Đã có tab đúng trang → focus thôi
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Có tab cùng app nhưng khác trang → điều hướng tới đúng URL rồi focus
      for (const client of clients) {
        if ("navigate" in client && "focus" in client) {
          const navigated = await client.navigate(url);
          return navigated.focus();
        }
      }
      // Không có tab nào → mở tab mới
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
