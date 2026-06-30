// ASC 数据结构的 TypeScript 对应：
//   1) D1 行类型（与 migrations/0001_init.sql 的列一一对应）
//   2) App Store Server Notifications V2 解码后的 wire 类型（供后续 webhook 解码 / 落库用）
// 字段口径见 Apple 文档：App Store Server Notifications V2 / In-App Purchase
// （JWSTransaction / JWSRenewalInfo）。时间戳为 ms epoch，金额为货币 milliunits。

// ───────────────────────── D1 行类型 ─────────────────────────

export type SubscriptionStatus =
	| "active"
	| "expired"
	| "grace"
	| "billing_retry"
	| "refunded"
	| "revoked";

/** notifications 表：原始通知审计 + 幂等去重。 */
export interface NotificationRow {
	notification_uuid: string;
	notification_type: string;
	subtype: string | null;
	original_transaction_id: string | null;
	transaction_id: string | null;
	bundle_id: string | null;
	environment: string | null;
	signed_date: number | null;
	app_apple_id: number | null;
	received_at: number;
	raw_payload: string;
}

/** subscriptions 表：每个订阅 / 买断的当前状态。 */
export interface SubscriptionRow {
	original_transaction_id: string;
	product_id: string | null;
	status: SubscriptionStatus | null;
	auto_renew_status: number | null;
	auto_renew_product_id: string | null;
	environment: string | null;
	purchase_date: number | null;
	expires_date: number | null;
	is_lifetime: number;
	last_notification_type: string | null;
	last_subtype: string | null;
	price_millis: number | null;
	currency: string | null;
	offer_type: number | null;
	last_signed_date: number;
	updated_at: number;
}

/** transactions 表：财务流水（订单），每笔交易一行。 */
export interface TransactionRow {
	transaction_id: string;
	original_transaction_id: string;
	product_id: string | null;
	type: string | null;
	purchase_date: number | null;
	expires_date: number | null;
	price_millis: number | null;
	currency: string | null;
	in_app_ownership_type: string | null;
	offer_type: number | null;
	offer_identifier: string | null;
	storefront: string | null;
	revocation_date: number | null;
	revocation_reason: number | null;
	environment: string | null;
	notification_type: string | null;
	notification_subtype: string | null;
	signed_date: number | null;
	created_at: number;
	updated_at: number;
}

// ─────────────── App Store Server Notifications V2 wire 类型 ───────────────

export type Environment = "Sandbox" | "Production";

/** responseBodyV2DecodedPayload —— 外层通知体（已验签解码） */
export interface DecodedNotificationPayload {
	notificationType: string;
	subtype?: string;
	notificationUUID: string;
	version?: string;
	signedDate?: number;
	data?: NotificationData;
	summary?: NotificationSummary;
	[key: string]: unknown;
}

export interface NotificationData {
	appAppleId?: number;
	bundleId?: string;
	bundleVersion?: string;
	environment?: Environment;
	/** 订阅状态码：1 active / 2 expired / 3 billing retry / 4 grace / 5 revoked */
	status?: number;
	signedTransactionInfo?: string; // 内层 JWS
	signedRenewalInfo?: string; // 内层 JWS
	[key: string]: unknown;
}

/** RENEWAL_EXTENSION 等类型用 summary 而非 data */
export interface NotificationSummary {
	requestIdentifier?: string;
	environment?: Environment;
	appAppleId?: number;
	bundleId?: string;
	productId?: string;
	[key: string]: unknown;
}

/** JWSTransactionDecodedPayload —— 单笔交易 */
export interface TransactionInfo {
	transactionId: string;
	originalTransactionId: string;
	bundleId?: string;
	productId?: string;
	subscriptionGroupIdentifier?: string;
	purchaseDate?: number;
	originalPurchaseDate?: number;
	expiresDate?: number;
	quantity?: number;
	type?: string;
	inAppOwnershipType?: string;
	signedDate?: number;
	environment?: Environment;
	offerType?: number;
	offerIdentifier?: string;
	revocationDate?: number;
	revocationReason?: number;
	isUpgraded?: boolean;
	price?: number; // milliunits
	currency?: string; // ISO 4217
	storefront?: string; // ISO 3166-1 alpha-3
	storefrontId?: string;
	appAccountToken?: string;
	[key: string]: unknown;
}

/** JWSRenewalInfoDecodedPayload —— 自动续订状态 */
export interface RenewalInfo {
	originalTransactionId?: string;
	autoRenewProductId?: string;
	productId?: string;
	autoRenewStatus?: number; // 0 关 / 1 开
	expirationIntent?: number;
	gracePeriodExpiresDate?: number;
	isInBillingRetryPeriod?: boolean;
	offerType?: number;
	offerIdentifier?: string;
	signedDate?: number;
	environment?: Environment;
	renewalPrice?: number; // milliunits
	currency?: string;
	[key: string]: unknown;
}

/** 一条通知完整解码结果（外层 + 内层都已验签解出） */
export interface DecodedNotification {
	payload: DecodedNotificationPayload;
	transaction?: TransactionInfo;
	renewal?: RenewalInfo;
}

// ─────────────── 枚举（仅列本服务关心的取值） ───────────────

// notificationType 全集（App Store Server Notifications V2，23 项）。
export const NotificationType = {
	subscribed: "SUBSCRIBED",
	didRenew: "DID_RENEW",
	didChangeRenewalStatus: "DID_CHANGE_RENEWAL_STATUS",
	didChangeRenewalPref: "DID_CHANGE_RENEWAL_PREF",
	didFailToRenew: "DID_FAIL_TO_RENEW",
	expired: "EXPIRED",
	gracePeriodExpired: "GRACE_PERIOD_EXPIRED",
	offerRedeemed: "OFFER_REDEEMED",
	priceIncrease: "PRICE_INCREASE",
	priceChange: "PRICE_CHANGE",
	refund: "REFUND",
	refundDeclined: "REFUND_DECLINED",
	refundReversed: "REFUND_REVERSED",
	consumptionRequest: "CONSUMPTION_REQUEST",
	renewalExtended: "RENEWAL_EXTENDED",
	renewalExtension: "RENEWAL_EXTENSION",
	revoke: "REVOKE",
	oneTimeCharge: "ONE_TIME_CHARGE",
	externalPurchaseToken: "EXTERNAL_PURCHASE_TOKEN",
	rescindConsent: "RESCIND_CONSENT",
	metadataUpdate: "METADATA_UPDATE",
	migration: "MIGRATION",
	test: "TEST",
} as const;

// subtype 全集（19 项）。
export const Subtype = {
	initialBuy: "INITIAL_BUY",
	resubscribe: "RESUBSCRIBE",
	upgrade: "UPGRADE",
	downgrade: "DOWNGRADE",
	autoRenewEnabled: "AUTO_RENEW_ENABLED",
	autoRenewDisabled: "AUTO_RENEW_DISABLED",
	voluntary: "VOLUNTARY",
	billingRetry: "BILLING_RETRY",
	billingRecovery: "BILLING_RECOVERY",
	gracePeriod: "GRACE_PERIOD",
	priceIncrease: "PRICE_INCREASE",
	pending: "PENDING",
	accepted: "ACCEPTED",
	productNotForSale: "PRODUCT_NOT_FOR_SALE",
	summary: "SUMMARY",
	failure: "FAILURE",
	unreported: "UNREPORTED",
	activeTokenReminder: "ACTIVE_TOKEN_REMINDER",
	created: "CREATED",
} as const;
