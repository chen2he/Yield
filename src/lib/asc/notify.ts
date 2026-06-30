// 把一条 App Store Server Notification 转成推送，发到 Bark 和 / 或 Orange Cloud。
// 两者都是 Bark V2 协议（POST {server}/push，body 带 device_key），仅 server 不同。
// fire-and-forget：失败仅记日志，不影响 webhook 主流程。

import { getCloudflareContext } from "@opennextjs/cloudflare";
import en from "@/messages/en.json";
import zhHans from "@/messages/zh-Hans.json";
import { getDb, queryAll } from "@/lib/db";
import type { AppSettings } from "./settings";
import type { DecodedNotification } from "./types";
import { type PushSubscriptionRecord, sendWebPush } from "./web-push";

const BARK_SERVER = "https://api.day.app";
const OC_SERVER = "https://push.o-c.do";

export interface BarkPush {
	title?: string;
	subtitle?: string;
	body: string;
	group?: string;
	sound?: string;
	level?: "critical" | "active" | "timeSensitive" | "passive";
	icon?: string;
}

async function sendBark(deviceKey: string, push: BarkPush, server: string): Promise<void> {
	const res = await fetch(`${server.replace(/\/+$/, "")}/push`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ device_key: deviceKey, ...push }),
		signal: AbortSignal.timeout(8000),
	});
	if (!res.ok) throw new Error(`push failed: HTTP ${res.status}`);
}

// 「入账」类型：真正有钱进账（新订阅 / 续期 / 买断 / 优惠兑换）；金额>0 时才穿透专注模式。
const REVENUE_TYPES = new Set<string>(["SUBSCRIBED", "DID_RENEW", "ONE_TIME_CHARGE", "OFFER_REDEEMED"]);

// 类型 → emoji（与语言无关）；文案复用 notifType i18n 词条，标题 = emoji + 本地化类型名。
const EMOJI: Record<string, string> = {
	SUBSCRIBED: "🎉",
	DID_RENEW: "🔁",
	DID_CHANGE_RENEWAL_STATUS: "⚙️",
	DID_CHANGE_RENEWAL_PREF: "🔀",
	DID_FAIL_TO_RENEW: "⚠️",
	EXPIRED: "📕",
	GRACE_PERIOD_EXPIRED: "⌛",
	OFFER_REDEEMED: "🎟️",
	PRICE_INCREASE: "💱",
	PRICE_CHANGE: "💱",
	REFUND: "↩️",
	REFUND_DECLINED: "🚫",
	REFUND_REVERSED: "↪️",
	CONSUMPTION_REQUEST: "📨",
	RENEWAL_EXTENDED: "📅",
	RENEWAL_EXTENSION: "📅",
	REVOKE: "🔕",
	ONE_TIME_CHARGE: "💰",
	EXTERNAL_PURCHASE_TOKEN: "🔗",
	RESCIND_CONSENT: "🙅",
	METADATA_UPDATE: "📝",
	MIGRATION: "📦",
	TEST: "🧪",
};

// 推送文案 i18n：直接读消息目录（webhook 在 Worker 中执行，无 React / 请求上下文）。
type Catalog = Record<string, Record<string, string | undefined>>;
const CATALOG: Record<string, Catalog> = {
	en: en as unknown as Catalog,
	"zh-Hans": zhHans as unknown as Catalog,
};
function tr(locale: string, ns: string, key: string): string | undefined {
	return CATALOG[locale]?.[ns]?.[key] ?? CATALOG.en[ns]?.[key];
}

function formatPrice(price?: number, currency?: string): string | null {
	if (typeof price !== "number" || !currency) return null;
	return `${(price / 1000).toFixed(2)} ${currency}`;
}

// app Apple ID → 应用展示名：调 iTunes Lookup API（公开、无需鉴权），结果内存缓存 24h。
const APP_NAME_CACHE = new Map<number, { name: string; ts: number }>();
const APP_NAME_TTL = 24 * 60 * 60 * 1000;

async function lookupAppName(appAppleId: number): Promise<string | null> {
	const cached = APP_NAME_CACHE.get(appAppleId);
	if (cached && Date.now() - cached.ts < APP_NAME_TTL) return cached.name;
	try {
		const res = await fetch(`https://itunes.apple.com/lookup?id=${appAppleId}`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const json = (await res.json()) as { results?: { trackName?: string }[] };
		const name = json.results?.[0]?.trackName;
		if (!name) return null;
		APP_NAME_CACHE.set(appAppleId, { name, ts: Date.now() });
		return name;
	} catch (e) {
		console.error("[push] app name lookup failed", appAppleId, e);
		return null;
	}
}

/** 分组名：用 app Apple ID 调 Apple 查应用展示名；缺失或失败回退 "App Store"。 */
export async function resolveAppName(appAppleId: number | undefined): Promise<string> {
	if (!appAppleId) return "App Store";
	return (await lookupAppName(appAppleId)) ?? "App Store";
}

/** 解码后的通知 → Bark 推送体（标题 / 子类型按 locale 本地化，product label 用用户自定义映射）。 */
export function buildPush(
	decoded: DecodedNotification,
	productMap: Map<string, string>,
	locale: string,
	appName: string,
): BarkPush {
	const { payload, transaction } = decoded;
	const type = payload.notificationType;
	const environment = payload.data?.environment ?? transaction?.environment ?? "Production";
	const isSandbox = environment === "Sandbox";

	const label = `${EMOJI[type] ?? "📣"} ${tr(locale, "notifType", type) ?? type}`;
	const title = isSandbox ? `🧪 ${label}` : label;

	const parts: string[] = [];
	if (payload.subtype) parts.push(tr(locale, "subtype", payload.subtype) ?? payload.subtype);
	if (transaction?.productId) parts.push(productMap.get(transaction.productId) ?? transaction.productId);
	const price = formatPrice(transaction?.price, transaction?.currency);
	if (price) parts.push(price);
	if (transaction?.storefront) parts.push(transaction.storefront);
	parts.push(environment);
	if (transaction?.offerIdentifier) parts.push(transaction.offerIdentifier);

	// 入账且金额>0 → timeSensitive 穿透专注模式 + 响声；其余生产事件 active；沙盒一律 passive。
	const isPaidRevenue =
		REVENUE_TYPES.has(type) && typeof transaction?.price === "number" && transaction.price > 0;
	const level: BarkPush["level"] = isSandbox ? "passive" : isPaidRevenue ? "timeSensitive" : "active";

	return {
		title,
		body: parts.join(" · "),
		group: isSandbox ? `[🧪] ${appName}` : appName,
		level,
		...(level === "timeSensitive" ? { sound: "paymentsuccess" } : {}),
	};
}

/** 向所有 Web Push 订阅推送（VAPID 未配置或无订阅则跳过；失效订阅 404/410 自动删除）。 */
async function sendWebPushAll(title: string, body: string): Promise<void> {
	const { env } = await getCloudflareContext({ async: true });
	const publicKey = env.VAPID_PUBLIC_KEY;
	const privateKey = env.VAPID_PRIVATE_KEY;
	if (!publicKey || !privateKey) return;
	const db = await getDb();
	const subs = await queryAll<PushSubscriptionRecord>(db, `SELECT endpoint, p256dh, auth FROM push_subscriptions`);
	if (subs.length === 0) return;
	const vapid = { publicKey, privateKey, subject: env.VAPID_SUBJECT || "mailto:admin@yield.app" };
	const payload = JSON.stringify({ title, body, url: "/admin/notifications" });
	await Promise.all(
		subs.map(async (sub) => {
			try {
				const r = await sendWebPush(sub, payload, vapid);
				if (r.statusCode === 404 || r.statusCode === 410) {
					await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(sub.endpoint).run();
				}
			} catch (e) {
				console.error("[push] web push failed", e);
			}
		}),
	);
}

/** 推送到 Bark + Orange Cloud + Web Push（按配置；fire-and-forget，失败仅记日志）。 */
export async function notifyEvent(
	decoded: DecodedNotification,
	settings: AppSettings,
	productMap: Map<string, string>,
): Promise<void> {
	const appAppleId = decoded.payload.data?.appAppleId ?? decoded.payload.summary?.appAppleId;
	const appName = await resolveAppName(appAppleId);
	const push = buildPush(decoded, productMap, settings.pushLocale, appName);
	const tasks: Promise<void>[] = [];
	if (settings.barkDeviceId) {
		tasks.push(sendBark(settings.barkDeviceId, push, BARK_SERVER).catch((e) => console.error("[push] bark failed", e)));
	}
	if (settings.ocDeviceId) {
		tasks.push(sendBark(settings.ocDeviceId, push, OC_SERVER).catch((e) => console.error("[push] oc failed", e)));
	}
	tasks.push(sendWebPushAll(push.title ?? "Yield", push.body));
	await Promise.all(tasks);
}
