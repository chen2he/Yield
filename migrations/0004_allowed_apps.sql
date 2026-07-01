-- App ID 过滤白名单：按 App Store Connect 的 app_apple_id 过滤入站通知。
-- 为空表示不过滤（接收所有应用的通知）。
CREATE TABLE IF NOT EXISTS allowed_apps (
	app_apple_id INTEGER PRIMARY KEY,
	created_at   INTEGER NOT NULL
);
