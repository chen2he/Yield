"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
	const pad = "=".repeat((4 - (base64.length % 4)) % 4);
	const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(b64);
	const out = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

type Status = "loading" | "unsupported" | "blocked" | "subscribed" | "unsubscribed";

/** 浏览器 Web Push 订阅开关：请求权限 → pushManager.subscribe → 存到服务端。 */
export function PushManager({ vapidPublicKey, locale }: { vapidPublicKey: string; locale: string }) {
	const t = useTranslations("settings");
	const [status, setStatus] = useState<Status>("loading");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
			setStatus("unsupported");
			return;
		}
		if (Notification.permission === "denied") {
			setStatus("blocked");
			return;
		}
		navigator.serviceWorker.ready
			.then((reg) => reg.pushManager.getSubscription())
			.then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
			.catch(() => setStatus("unsubscribed"));
	}, []);

	const enable = useCallback(async () => {
		if (!vapidPublicKey) {
			toast.error(t("pushNoKey"));
			return;
		}
		setBusy(true);
		try {
			const perm = await Notification.requestPermission();
			if (perm !== "granted") {
				setStatus(perm === "denied" ? "blocked" : "unsubscribed");
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
			});
			const json = sub.toJSON();
			const res = await fetch("/api/push/subscribe", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ subscription: { endpoint: json.endpoint, keys: json.keys }, locale }),
			});
			if (!res.ok) throw new Error("subscribe failed");
			setStatus("subscribed");
			toast.success(t("toastPushEnabled"));
		} catch (e) {
			console.error(e);
			toast.error(t("pushError"));
		} finally {
			setBusy(false);
		}
	}, [vapidPublicKey, locale, t]);

	const disable = useCallback(async () => {
		setBusy(true);
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await fetch("/api/push/unsubscribe", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ endpoint: sub.endpoint }),
				});
				await sub.unsubscribe();
			}
			setStatus("unsubscribed");
			toast.success(t("toastPushDisabled"));
		} catch (e) {
			console.error(e);
			toast.error(t("pushError"));
		} finally {
			setBusy(false);
		}
	}, [t]);

	if (status === "loading") return <p className="text-sm text-muted-foreground">…</p>;
	if (status === "unsupported") return <p className="text-sm text-muted-foreground">{t("pushUnsupported")}</p>;
	if (status === "blocked") return <p className="text-sm text-destructive">{t("pushBlocked")}</p>;

	return (
		<div className="flex items-center gap-3">
			{status === "subscribed" ? (
				<>
					<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
						<span className="size-2 rounded-full bg-emerald-500" />
						{t("pushOn")}
					</span>
					<Button type="button" size="sm" variant="outline" disabled={busy} onClick={disable}>
						{t("pushDisable")}
					</Button>
				</>
			) : (
				<Button type="button" size="sm" disabled={busy} onClick={enable}>
					{t("pushEnable")}
				</Button>
			)}
		</div>
	);
}
