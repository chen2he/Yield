import { cache } from "react";
import { routing } from "@/i18n/routing";
import { getDb, queryAll } from "@/lib/db";

export interface AppSettings {
	/** 展示金额时折算到的货币（总览基准币种）。 */
	currency: string;
	barkDeviceId: string;
	ocDeviceId: string;
	/** 推送通知使用的语言；独立于界面语言，因为 webhook 触发时无界面上下文。 */
	pushLocale: string;
	/** 首次部署引导流程是否已完成。 */
	onboardingCompleted: boolean;
}

/** 读取标量设置（按请求缓存）。 */
export const getSettings = cache(async (): Promise<AppSettings> => {
	const db = await getDb();
	const rows = await queryAll<{ key: string; value: string | null }>(db, `SELECT key, value FROM settings`);
	const m = new Map(rows.map((r) => [r.key, r.value ?? ""]));
	const pushLocaleRaw = m.get("push_locale") || "";
	const pushLocale = (routing.locales as readonly string[]).includes(pushLocaleRaw)
		? pushLocaleRaw
		: routing.defaultLocale;
	return {
		currency: m.get("currency") || "USD",
		barkDeviceId: m.get("bark_device_id") || "",
		ocDeviceId: m.get("oc_device_id") || "",
		pushLocale,
		onboardingCompleted: m.get("onboarding_completed") === "1",
	};
});

export interface ProductLabel {
	product_id: string;
	label: string;
}

/** 自定义商品列表（按请求缓存）。 */
export const getProducts = cache(async (): Promise<ProductLabel[]> => {
	const db = await getDb();
	return queryAll<ProductLabel>(db, `SELECT product_id, label FROM products ORDER BY created_at DESC`);
});

/** product_id -> label 映射（展示用，按请求缓存）。 */
export const getProductLabelMap = cache(async (): Promise<Map<string, string>> => {
	const products = await getProducts();
	return new Map(products.map((p) => [p.product_id, p.label]));
});

/** 数据中出现过的币种（货币选择器候选）。 */
export const getDataCurrencies = cache(async (): Promise<string[]> => {
	const db = await getDb();
	const rows = await queryAll<{ currency: string }>(
		db,
		`SELECT DISTINCT currency FROM transactions WHERE currency IS NOT NULL ORDER BY currency`,
	);
	return rows.map((r) => r.currency);
});

/** 允许接收推送的 App（按 app_apple_id 过滤，按请求缓存）。为空表示不过滤。 */
export const getAllowedAppIds = cache(async (): Promise<number[]> => {
	const db = await getDb();
	const rows = await queryAll<{ app_apple_id: number }>(
		db,
		`SELECT app_apple_id FROM allowed_apps ORDER BY created_at DESC`,
	);
	return rows.map((r) => r.app_apple_id);
});
