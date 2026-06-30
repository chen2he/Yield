-- 用户设置（KV）与自定义商品标签。

-- 标量设置：currency / bark_device_id / oc_device_id 等，按 key 取值。
CREATE TABLE IF NOT EXISTS settings (
	key   TEXT PRIMARY KEY,
	value TEXT
);

-- 自定义商品：完整 product_id -> 展示用 label。
CREATE TABLE IF NOT EXISTS products (
	product_id TEXT PRIMARY KEY,
	label      TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
