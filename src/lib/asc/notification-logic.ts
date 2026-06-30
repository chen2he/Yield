// 把一条解码后的通知映射成「订阅当前状态」。
//
// 状态判定优先级：
//   1) 通知类型里明确的生命周期事件（过期 / 退款 / 撤销 / 续订失败）直接定性；
//   2) 否则看 renewalInfo 的提示（计费重试 / 宽限期）；
//   3) 再否则视为 active（首购 / 续订 / 兑换优惠 / 改续订偏好 / 涨价告知 / 买断）。
// 配合 store 层按 signedDate 的乱序保护，过期后到达的旧事件不会把状态写回 active。

import {
	type DecodedNotification,
	NotificationType,
	type SubscriptionStatus,
	Subtype,
} from "./types";

export interface DerivedSubscription {
	originalTransactionId: string;
	productId?: string;
	status: SubscriptionStatus;
	autoRenewStatus?: number;
	autoRenewProductId?: string;
	environment?: string;
	purchaseDate?: number;
	expiresDate?: number;
	isLifetime: boolean;
	priceMillis?: number;
	currency?: string;
	offerType?: number;
}

function deriveStatus(n: DecodedNotification): SubscriptionStatus {
	const type = n.payload.notificationType;
	const subtype = n.payload.subtype;
	const renewal = n.renewal;

	switch (type) {
		case NotificationType.expired:
		case NotificationType.gracePeriodExpired:
			return "expired";
		case NotificationType.revoke:
			return "revoked";
		case NotificationType.refund:
			return "refunded";
		case NotificationType.didFailToRenew:
			return subtype === Subtype.gracePeriod ? "grace" : "billing_retry";
	}

	// 无明确终态：参考续订信息的实时提示
	if (renewal) {
		if (renewal.isInBillingRetryPeriod) return "billing_retry";
		const graceUntil = renewal.gracePeriodExpiresDate;
		const at = renewal.signedDate ?? n.payload.signedDate ?? Date.now();
		if (typeof graceUntil === "number" && graceUntil > at) return "grace";
	}

	return "active";
}

/** 计算订阅当前状态；若通知不含可入账的交易（如 TEST），返回 null。 */
export function deriveSubscription(n: DecodedNotification): DerivedSubscription | null {
	const tx = n.transaction;
	const renewal = n.renewal;
	const originalTransactionId = tx?.originalTransactionId ?? renewal?.originalTransactionId;
	if (!originalTransactionId) return null;

	const isLifetime = tx?.type === "Non-Consumable";

	return {
		originalTransactionId,
		productId: tx?.productId ?? renewal?.productId ?? renewal?.autoRenewProductId,
		status: deriveStatus(n),
		autoRenewStatus: renewal?.autoRenewStatus,
		autoRenewProductId: renewal?.autoRenewProductId,
		environment: tx?.environment ?? n.payload.data?.environment ?? renewal?.environment,
		purchaseDate: tx?.originalPurchaseDate ?? tx?.purchaseDate,
		expiresDate: isLifetime ? undefined : tx?.expiresDate,
		isLifetime,
		priceMillis: tx?.price ?? renewal?.renewalPrice,
		currency: tx?.currency ?? renewal?.currency,
		offerType: tx?.offerType,
	};
}
