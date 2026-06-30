"use client";

import { useEffect } from "react";

/** 注册 PWA service worker（/sw.js，作用域 /）。 */
export function PwaRegister() {
	useEffect(() => {
		if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
		navigator.serviceWorker
			.register("/sw.js")
			.catch((e) => console.error("[pwa] service worker registration failed", e));
	}, []);
	return null;
}
