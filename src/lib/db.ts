import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 取得绑定的 D1 数据库（`DB` -> asc-notification）。
 * 用 async 形式的 getCloudflareContext，使其在严格请求作用域外也可用；
 * wrangler.jsonc 中 `remote: true` 令 dev 也直连远端 D1。
 */
export async function getDb(): Promise<D1Database> {
	const { env } = await getCloudflareContext({ async: true });
	return env.DB;
}

/** 执行查询并返回全部行（无结果返回空数组）。 */
export async function queryAll<T = Record<string, unknown>>(
	db: D1Database,
	sql: string,
	params: unknown[] = [],
): Promise<T[]> {
	const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
	const { results } = await stmt.all<T>();
	return results ?? [];
}

/** 执行预期单行的查询（无则返回 null）。 */
export async function queryFirst<T = Record<string, unknown>>(
	db: D1Database,
	sql: string,
	params: unknown[] = [],
): Promise<T | null> {
	const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
	return (await stmt.first<T>()) ?? null;
}
