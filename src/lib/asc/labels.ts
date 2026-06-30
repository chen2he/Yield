import type { BadgeTone } from "@/components/admin/badge";
import { NotificationType, Subtype } from "@/lib/asc/types";

// 通知类型 -> 徽章色调（与 i18n 文案解耦，纯展示）。
export function notificationTone(type: string): BadgeTone {
	if (type === "REFUND_DECLINED" || type === "REFUND_REVERSED") return "info";
	if (
		type.startsWith("REFUND") ||
		type === "REVOKE" ||
		type === "EXPIRED" ||
		type === "DID_FAIL_TO_RENEW"
	) {
		return "negative";
	}
	if (type === "SUBSCRIBED" || type === "DID_RENEW" || type === "ONE_TIME_CHARGE") return "positive";
	return "info";
}

// 交易 type 原值含空格，映射到安全的 i18n key（txType.*）。
export const TX_TYPE_KEY: Record<string, string> = {
	"Non-Consumable": "nonConsumable",
	Consumable: "consumable",
	"Auto-Renewable Subscription": "autoRenewable",
	"Non-Renewing Subscription": "nonRenewing",
};

// 交易类型全集（Apple `Type` 枚举，4 种）——筛选下拉用固定全集，不依赖现有数据。
export const TRANSACTION_TYPES = [
	"Auto-Renewable Subscription",
	"Non-Consumable",
	"Consumable",
	"Non-Renewing Subscription",
] as const;

// 环境全集（App Store Server 仅 Production / Sandbox 两种）。
export const ENVIRONMENTS = ["Production", "Sandbox"] as const;

// ───────────────────────── 状态 ─────────────────────────

// 单笔订单（交易）状态。Apple 无交易级状态枚举，按 revocation 派生：
//   未撤销 = paid；REFUND 撤销 = refunded；REVOKE（如家庭共享收回）= revoked。
export type OrderStatus = "paid" | "refunded" | "revoked";
export const ORDER_STATUSES = ["paid", "refunded", "revoked"] as const;

export function orderStatusOf(
	revocationDate: number | null | undefined,
	notificationType: string | null | undefined,
): OrderStatus {
	if (revocationDate == null) return "paid";
	return notificationType === "REVOKE" ? "revoked" : "refunded";
}

export function orderStatusTone(s: OrderStatus): BadgeTone {
	return s === "paid" ? "positive" : "negative";
}

// 订阅生命周期状态（Apple status 1-5：active/expired/billing_retry/grace/revoked；
// 另含 refunded —— 退款导致的撤销，与一般 revoked 区分）。
export const SUBSCRIPTION_STATUSES = [
	"active",
	"expired",
	"billing_retry",
	"grace",
	"refunded",
	"revoked",
] as const;

export function subStatusTone(s: string): BadgeTone {
	if (s === "active") return "positive";
	if (s === "expired") return "muted";
	if (s === "refunded" || s === "revoked") return "negative";
	return "info"; // grace / billing_retry
}

// 通知类型 / 子类型全集（通知页筛选用，取自 Apple 完整枚举）。
export const NOTIFICATION_TYPES: readonly string[] = Object.values(NotificationType);
export const SUBTYPES: readonly string[] = Object.values(Subtype);

/** 取产品 id 末两段做短标签（jiamin.chen.orange_cloud.pro.lifetime -> pro.lifetime）。 */
export function shortProduct(id: string | null | undefined): string {
	if (!id) return "—";
	const parts = id.split(".");
	return parts.length <= 2 ? id : parts.slice(-2).join(".");
}

/** 优先用用户自定义 label，否则回退到短标签。 */
export function productLabel(id: string | null | undefined, map: Map<string, string>): string {
	if (!id) return "—";
	return map.get(id) ?? shortProduct(id);
}
