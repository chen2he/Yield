-- Web Push 订阅：每个浏览器 / 已安装 PWA 一条记录。
CREATE TABLE IF NOT EXISTS push_subscriptions (
	endpoint    TEXT PRIMARY KEY,
	p256dh      TEXT NOT NULL,
	auth        TEXT NOT NULL,
	locale      TEXT,
	created_at  INTEGER NOT NULL
);
