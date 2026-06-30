// Yield PWA service worker — lifecycle + Web Push.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// 无操作 fetch 监听：满足部分浏览器的「可安装」启发式，不改变网络行为。
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch {
		data = { body: event.data ? event.data.text() : "" };
	}
	const title = data.title || "Yield";
	const options = {
		body: data.body || "",
		icon: data.icon || "/icons/icon-192.png",
		badge: data.badge || "/icons/icon-192.png",
		tag: data.tag || undefined,
		data: { url: data.url || "/admin" },
	};
	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = (event.notification.data && event.notification.data.url) || "/admin";
	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ("focus" in client) {
					client.navigate(url);
					return client.focus();
				}
			}
			return self.clients.openWindow(url);
		}),
	);
});
