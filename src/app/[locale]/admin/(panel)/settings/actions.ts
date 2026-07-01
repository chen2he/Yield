"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { getDb } from "@/lib/db";

type SettingsActionState = { ok: boolean } | null;

// 设置页是 force-dynamic，但 server action 后需显式 revalidate 才会就地刷新。
const SETTINGS_PATH = "/[locale]/admin/settings";

/** 保存偏好设置：货币 + Bark / Orange Cloud device id。 */
export async function saveSettings(
	_prev: SettingsActionState,
	formData: FormData,
): Promise<SettingsActionState> {
	const db = await getDb();
	const currency = (String(formData.get("currency") ?? "").trim() || "USD").toUpperCase();
	const bark = String(formData.get("bark_device_id") ?? "").trim();
	const oc = String(formData.get("oc_device_id") ?? "").trim();
	const pushLocaleRaw = String(formData.get("push_locale") ?? "").trim();
	const pushLocale = (routing.locales as readonly string[]).includes(pushLocaleRaw)
		? pushLocaleRaw
		: routing.defaultLocale;
	const upsert = (key: string, value: string) =>
		db
			.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
			.bind(key, value);
	await db.batch([
		upsert("currency", currency),
		upsert("bark_device_id", bark),
		upsert("oc_device_id", oc),
		upsert("push_locale", pushLocale),
	]);
	revalidatePath(SETTINGS_PATH, "page");
	return { ok: true };
}

/** 新增 / 更新一个自定义商品（product_id -> label）。 */
export async function addProduct(
	_prev: SettingsActionState,
	formData: FormData,
): Promise<SettingsActionState> {
	const productId = String(formData.get("product_id") ?? "").trim();
	const label = String(formData.get("label") ?? "").trim();
	if (!productId || !label) return { ok: false };
	const db = await getDb();
	await db
		.prepare(
			`INSERT INTO products (product_id, label, created_at) VALUES (?, ?, ?)
			 ON CONFLICT(product_id) DO UPDATE SET label = excluded.label`,
		)
		.bind(productId, label, Date.now())
		.run();
	revalidatePath(SETTINGS_PATH, "page");
	return { ok: true };
}

/** 删除一个自定义商品。 */
export async function deleteProduct(
	_prev: SettingsActionState,
	formData: FormData,
): Promise<SettingsActionState> {
	const productId = String(formData.get("product_id") ?? "").trim();
	if (!productId) return { ok: false };
	const db = await getDb();
	await db.prepare(`DELETE FROM products WHERE product_id = ?`).bind(productId).run();
	revalidatePath(SETTINGS_PATH, "page");
	return { ok: true };
}

/** 新增一个允许接收推送的 App（按 app_apple_id 过滤）。 */
export async function addAllowedApp(
	_prev: SettingsActionState,
	formData: FormData,
): Promise<SettingsActionState> {
	const appAppleId = Number.parseInt(String(formData.get("app_apple_id") ?? "").trim(), 10);
	if (!Number.isInteger(appAppleId) || appAppleId <= 0) return { ok: false };
	const db = await getDb();
	await db
		.prepare(`INSERT INTO allowed_apps (app_apple_id, created_at) VALUES (?, ?) ON CONFLICT(app_apple_id) DO NOTHING`)
		.bind(appAppleId, Date.now())
		.run();
	revalidatePath(SETTINGS_PATH, "page");
	return { ok: true };
}

/** 删除一个允许接收推送的 App。 */
export async function deleteAllowedApp(
	_prev: SettingsActionState,
	formData: FormData,
): Promise<SettingsActionState> {
	const appAppleId = Number.parseInt(String(formData.get("app_apple_id") ?? "").trim(), 10);
	if (!Number.isInteger(appAppleId)) return { ok: false };
	const db = await getDb();
	await db.prepare(`DELETE FROM allowed_apps WHERE app_apple_id = ?`).bind(appAppleId).run();
	revalidatePath(SETTINGS_PATH, "page");
	return { ok: true };
}
