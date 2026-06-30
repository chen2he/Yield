-- App Store Server Notifications V2 —— ASC 订单 / 通知数据结构
-- 三张表：原始通知审计（幂等）/ 订阅当前状态 / 财务流水（订单）。
-- 时间戳一律存毫秒 epoch（与 Apple payload 的 *Date 字段口径一致）；
-- 金额存货币 milliunits（$19.99 -> 19990）。

-- 原始通知审计 + 幂等去重（Apple 会重发，notification_uuid 唯一）
CREATE TABLE IF NOT EXISTS notifications (
	notification_uuid       TEXT PRIMARY KEY,
	notification_type       TEXT NOT NULL,
	subtype                 TEXT,
	original_transaction_id TEXT,
	transaction_id          TEXT,
	bundle_id               TEXT,
	environment             TEXT,             -- Sandbox | Production
	signed_date             INTEGER,          -- payload.signedDate, ms epoch
	app_apple_id            INTEGER,
	received_at             INTEGER NOT NULL, -- 本服务收到时刻, ms epoch
	raw_payload             TEXT NOT NULL     -- 解码后的 JSON 存档（审计用）
);

CREATE INDEX IF NOT EXISTS idx_notifications_otid ON notifications (original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_received ON notifications (received_at);

-- 每个订阅 / 买断的当前状态（主键 originalTransactionId）
CREATE TABLE IF NOT EXISTS subscriptions (
	original_transaction_id TEXT PRIMARY KEY,
	product_id              TEXT,
	status                  TEXT,             -- active|expired|grace|billing_retry|refunded|revoked
	auto_renew_status       INTEGER,          -- 0 关 / 1 开
	auto_renew_product_id   TEXT,             -- 待生效的续订商品（升降级）
	environment             TEXT,
	purchase_date           INTEGER,
	expires_date            INTEGER,          -- 买断为 NULL
	is_lifetime             INTEGER NOT NULL DEFAULT 0,
	last_notification_type  TEXT,
	last_subtype            TEXT,
	price_millis            INTEGER,
	currency                TEXT,             -- ISO 4217
	offer_type              INTEGER,
	last_signed_date        INTEGER NOT NULL DEFAULT 0, -- 乱序保护：仅接受 >= 此值的更新
	updated_at              INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON subscriptions (product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions (expires_date);

-- 财务流水（订单）：每笔交易（首购 / 续订 / 退款）一行，按 transaction_id upsert
CREATE TABLE IF NOT EXISTS transactions (
	transaction_id          TEXT PRIMARY KEY,
	original_transaction_id TEXT NOT NULL,
	product_id              TEXT,
	type                    TEXT,             -- Auto-Renewable Subscription | Non-Consumable ...
	purchase_date           INTEGER,
	expires_date            INTEGER,
	price_millis            INTEGER,
	currency                TEXT,
	in_app_ownership_type   TEXT,
	offer_type              INTEGER,
	offer_identifier        TEXT,             -- 促销 / 兑换码标识，无则 NULL
	storefront              TEXT,             -- 商店地区 ISO 3166-1 alpha-3（USA / CHN），无则 NULL
	revocation_date         INTEGER,          -- 退款 / 撤销时写入
	revocation_reason       INTEGER,
	environment             TEXT,
	notification_type       TEXT,             -- 最近一次触达此交易的通知
	notification_subtype    TEXT,
	signed_date             INTEGER,
	created_at              INTEGER NOT NULL,
	updated_at              INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_otid ON transactions (original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions (product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_purchase ON transactions (purchase_date);
