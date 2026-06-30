import { convertMillis, getUsdRates } from "@/lib/asc/fx";
import type { OrderStatus } from "@/lib/asc/labels";
import { getDb, queryAll, queryFirst } from "@/lib/db";

/** 列表每页行数：可选集合与默认值。 */
export const PAGE_SIZES = [5, 10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** 把 size 参数夹到允许集合，非法回退默认。 */
export function parsePageSize(v: string | null): number {
	const n = Number(v);
	return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export interface Page<T> {
	rows: T[];
	total: number;
	page: number;
	totalPages: number;
}

/** 把请求页号夹到合法区间并算出 SQL offset。 */
function paginate(total: number, page: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const clamped = Math.min(Math.max(1, page), totalPages);
	return { page: clamped, totalPages, offset: (clamped - 1) * pageSize };
}

// ───────────────────────── 订单（transactions） ─────────────────────────

export interface OrderRow {
	transaction_id: string;
	original_transaction_id: string;
	product_id: string | null;
	type: string | null;
	price_millis: number | null;
	currency: string | null;
	storefront: string | null;
	offer_type: number | null;
	offer_identifier: string | null;
	purchase_date: number | null;
	revocation_date: number | null;
	revocation_reason: number | null;
	notification_type: string | null;
	environment: string | null;
	/** 关联订阅的当前状态（一次性购买为 NULL）。 */
	sub_status: string | null;
}

export type OrderSort = "amount" | "date";
export type SortDir = "asc" | "desc";

export interface OrderQuery {
	page: number;
	pageSize: number;
	sort: OrderSort;
	dir: SortDir;
	type: string | null;
	region: string | null;
	/** 交易状态（按 revocation 派生）。 */
	status: OrderStatus | null;
	/** 订阅生命周期状态（subscriptions.status）。 */
	subStatus: string | null;
	env: string | null;
}

// 排序列白名单（避免把用户输入拼进 ORDER BY）。
const SORT_COLUMN: Record<OrderSort, string> = {
	amount: "t.price_millis",
	date: "t.purchase_date",
};

// 关联订阅，拿到订阅生命周期状态；订阅按 originalTransactionId 唯一，不会放大行数。
const ORDER_FROM = "transactions t LEFT JOIN subscriptions s ON s.original_transaction_id = t.original_transaction_id";
const ORDER_SELECT = `t.transaction_id, t.original_transaction_id, t.product_id, t.type, t.price_millis, t.currency,
        t.storefront, t.offer_type, t.offer_identifier, t.purchase_date, t.revocation_date, t.revocation_reason,
        t.notification_type, t.environment, s.status AS sub_status`;

function buildWhere(q: OrderQuery): { sql: string; params: unknown[] } {
	const clauses: string[] = [];
	const params: unknown[] = [];
	if (q.type) {
		clauses.push("t.type = ?");
		params.push(q.type);
	}
	if (q.region) {
		clauses.push("t.storefront = ?");
		params.push(q.region);
	}
	if (q.env) {
		clauses.push("t.environment = ?");
		params.push(q.env);
	}
	// 交易状态：未撤销=paid；REVOKE 撤销=revoked；其余撤销=refunded。
	if (q.status === "paid") clauses.push("t.revocation_date IS NULL");
	else if (q.status === "revoked")
		clauses.push("t.revocation_date IS NOT NULL AND t.notification_type = 'REVOKE'");
	else if (q.status === "refunded")
		clauses.push("t.revocation_date IS NOT NULL AND (t.notification_type IS NULL OR t.notification_type != 'REVOKE')");
	if (q.subStatus) {
		// 订阅状态只对自动续订订阅有意义（一次性 / 买断不参与，避免与徽章不一致）。
		clauses.push("s.status = ? AND t.type = 'Auto-Renewable Subscription'");
		params.push(q.subStatus);
	}
	return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function fetchOrders(q: OrderQuery): Promise<Page<OrderRow>> {
	const db = await getDb();
	const where = buildWhere(q);
	const totalRow = await queryFirst<{ c: number }>(
		db,
		`SELECT COUNT(*) c FROM ${ORDER_FROM}${where.sql}`,
		where.params,
	);
	const total = totalRow?.c ?? 0;
	const { page, totalPages, offset } = paginate(total, q.page, q.pageSize);
	const col = SORT_COLUMN[q.sort];
	const dir = q.dir === "asc" ? "ASC" : "DESC";
	const rows = await queryAll<OrderRow>(
		db,
		`SELECT ${ORDER_SELECT}
		 FROM ${ORDER_FROM}${where.sql}
		 ORDER BY ${col} ${dir}, t.created_at DESC
		 LIMIT ? OFFSET ?`,
		[...where.params, q.pageSize, offset],
	);
	return { rows, total, page, totalPages };
}

// 筛选下拉的取值不再从数据 DISTINCT，而用 Apple 全集固定枚举
// （类型/环境/状态见 lib/asc/labels.ts，storefront 见 lib/asc/storefronts.ts）。

// ───────────────────────── 通知（notifications） ─────────────────────────

export interface NotificationRow {
	notification_uuid: string;
	notification_type: string;
	subtype: string | null;
	environment: string | null;
	received_at: number;
	transaction_id: string | null;
	t_product_id: string | null;
	t_price_millis: number | null;
	t_currency: string | null;
}

const NOTIF_SELECT = `n.notification_uuid, n.notification_type, n.subtype, n.environment, n.received_at,
        n.transaction_id, t.product_id AS t_product_id, t.price_millis AS t_price_millis, t.currency AS t_currency`;
const NOTIF_FROM = "notifications n LEFT JOIN transactions t ON t.transaction_id = n.transaction_id";

export interface NotificationQuery {
	page: number;
	pageSize: number;
	/** 仅按接收时间排序，dir 切换升降。 */
	dir: SortDir;
	type: string | null; // notification_type
	subtype: string | null;
	env: string | null;
}

function buildNotifWhere(q: NotificationQuery): { sql: string; params: unknown[] } {
	const clauses: string[] = [];
	const params: unknown[] = [];
	if (q.type) {
		clauses.push("n.notification_type = ?");
		params.push(q.type);
	}
	if (q.subtype) {
		clauses.push("n.subtype = ?");
		params.push(q.subtype);
	}
	if (q.env) {
		clauses.push("n.environment = ?");
		params.push(q.env);
	}
	return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function fetchNotifications(q: NotificationQuery): Promise<Page<NotificationRow>> {
	const db = await getDb();
	const where = buildNotifWhere(q);
	const totalRow = await queryFirst<{ c: number }>(
		db,
		`SELECT COUNT(*) c FROM notifications n${where.sql}`,
		where.params,
	);
	const total = totalRow?.c ?? 0;
	const { page, totalPages, offset } = paginate(total, q.page, q.pageSize);
	const dir = q.dir === "asc" ? "ASC" : "DESC";
	const rows = await queryAll<NotificationRow>(
		db,
		`SELECT ${NOTIF_SELECT}
		 FROM ${NOTIF_FROM}${where.sql}
		 ORDER BY n.received_at ${dir}
		 LIMIT ? OFFSET ?`,
		[...where.params, q.pageSize, offset],
	);
	return { rows, total, page, totalPages };
}

// ───────────────────────── 详情（订单 <-> 通知 关联） ─────────────────────────

export interface OrderDetail {
	order: OrderRow | null;
	/** 触达该交易的通知（按 transaction_id 关联）。 */
	notifications: NotificationRow[];
}

/** 订单详情：该订单 + 与之关联的通知。 */
export async function fetchOrderDetail(transactionId: string): Promise<OrderDetail> {
	const db = await getDb();
	const order = await queryFirst<OrderRow>(
		db,
		`SELECT ${ORDER_SELECT} FROM ${ORDER_FROM} WHERE t.transaction_id = ?`,
		[transactionId],
	);
	const notifications = await queryAll<NotificationRow>(
		db,
		`SELECT ${NOTIF_SELECT} FROM ${NOTIF_FROM} WHERE n.transaction_id = ? ORDER BY n.received_at DESC`,
		[transactionId],
	);
	return { order, notifications };
}

export interface NotificationDetailRow {
	notification_uuid: string;
	notification_type: string;
	subtype: string | null;
	environment: string | null;
	received_at: number;
	signed_date: number | null;
	transaction_id: string | null;
	original_transaction_id: string | null;
	bundle_id: string | null;
}

export interface NotificationDetail {
	notification: NotificationDetailRow | null;
	/** 该通知引用的订单（按 transaction_id 关联，可能为空）。 */
	order: OrderRow | null;
}

/** 通知详情：该通知 + 与之关联的订单。 */
export async function fetchNotificationDetail(uuid: string): Promise<NotificationDetail> {
	const db = await getDb();
	const notification = await queryFirst<NotificationDetailRow>(
		db,
		`SELECT notification_uuid, notification_type, subtype, environment, received_at, signed_date,
		        transaction_id, original_transaction_id, bundle_id
		 FROM notifications WHERE notification_uuid = ?`,
		[uuid],
	);
	const order = notification?.transaction_id
		? await queryFirst<OrderRow>(
				db,
				`SELECT ${ORDER_SELECT} FROM ${ORDER_FROM} WHERE t.transaction_id = ?`,
				[notification.transaction_id],
			)
		: null;
	return { notification, order };
}

// ───────────────────────── 总览（聚合） ─────────────────────────

export interface CurrencyRevenue {
	currency: string;
	orders: number;
	sumMillis: number;
}

export interface NameCount {
	name: string;
	count: number;
}

export interface TrendPoint {
	date: string;
	count: number;
	/** 当日订单金额合计（折算为 baseCurrency 主单位；FX 不可用时为 0）。 */
	amount: number;
}

export interface Overview {
	totalOrders: number;
	paidOrders: number;
	refundedOrders: number;
	refundRate: number;
	totalSubscriptions: number;
	activeSubs: number;
	lifetimeActive: number;
	recurringActive: number;
	/** 订单金额合计（折算为 baseCurrency）；FX 不可用时为 null。 */
	totalAmount: number | null;
	baseCurrency: string;
	fxAvailable: boolean;
	revenueByCurrency: CurrencyRevenue[];
	ordersByProduct: NameCount[];
	subscriptionStatus: NameCount[];
	ordersOverTime: TrendPoint[];
}

export interface OverviewQuery {
	/** 环境过滤：null=全部 / "Production" / "Sandbox"。 */
	env: string | null;
	/** 趋势图时间窗（天）。 */
	trendDays: number;
	/** 展示金额折算到的基准币种。 */
	currency: string;
}

const BASE_CURRENCY = "USD";

export async function fetchOverview(q: OverviewQuery): Promise<Overview> {
	const db = await getDb();
	const envWhere = q.env ? "WHERE environment = ?" : "";
	const envAnd = q.env ? " AND environment = ?" : "";
	const envP: unknown[] = q.env ? [q.env] : [];
	const since = Date.now() - q.trendDays * 86_400_000;

	const [txRow, subRow, revenueRows, productRows, statusRows, trendRows, fx] = await Promise.all([
		queryFirst<{ total: number; paid: number; refunded: number }>(
			db,
			`SELECT COUNT(*) total,
			        SUM(CASE WHEN revocation_date IS NULL THEN 1 ELSE 0 END) paid,
			        SUM(CASE WHEN revocation_date IS NOT NULL THEN 1 ELSE 0 END) refunded
			 FROM transactions ${envWhere}`,
			envP,
		),
		queryFirst<{ total: number; active: number; lifetime_active: number; recurring_active: number }>(
			db,
			`SELECT COUNT(*) total,
			        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) active,
			        SUM(CASE WHEN status = 'active' AND is_lifetime = 1 THEN 1 ELSE 0 END) lifetime_active,
			        SUM(CASE WHEN status = 'active' AND is_lifetime = 0 THEN 1 ELSE 0 END) recurring_active
			 FROM subscriptions ${envWhere}`,
			envP,
		),
		queryAll<{ currency: string | null; orders: number; sum_millis: number }>(
			db,
			`SELECT currency, COUNT(*) orders, SUM(price_millis) sum_millis
			 FROM transactions WHERE price_millis IS NOT NULL${envAnd}
			 GROUP BY currency ORDER BY orders DESC`,
			envP,
		),
		queryAll<{ product_id: string | null; count: number }>(
			db,
			`SELECT product_id, COUNT(*) count FROM transactions ${envWhere} GROUP BY product_id ORDER BY count DESC LIMIT 10`,
			envP,
		),
		queryAll<{ status: string | null; count: number }>(
			db,
			`SELECT status, COUNT(*) count FROM subscriptions ${envWhere} GROUP BY status ORDER BY count DESC`,
			envP,
		),
		queryAll<{ d: string; currency: string | null; c: number; sum_millis: number }>(
			db,
			`SELECT date(purchase_date / 1000, 'unixepoch') d, currency, COUNT(*) c, SUM(price_millis) sum_millis
			 FROM transactions
			 WHERE purchase_date IS NOT NULL AND purchase_date >= ?${envAnd}
			 GROUP BY d, currency ORDER BY d`,
			[since, ...envP],
		),
		getUsdRates(),
	]);

	const rates = fx?.rates ?? null;
	const base = q.currency || BASE_CURRENCY;
	const toBase = (millis: number, ccy: string | null): number | null =>
		rates && ccy ? convertMillis(millis, ccy, base, rates) : null;

	// 订单金额合计（折算 baseCurrency）。
	let totalAmount: number | null = rates ? 0 : null;
	if (rates && totalAmount != null) {
		for (const r of revenueRows) {
			const v = toBase(r.sum_millis ?? 0, r.currency);
			if (v != null) totalAmount += v;
		}
	}

	// 按天汇总：订单数 + 折算后的金额。
	const byDate = new Map<string, { count: number; amount: number }>();
	for (const r of trendRows) {
		const e = byDate.get(r.d) ?? { count: 0, amount: 0 };
		e.count += r.c;
		const v = toBase(r.sum_millis ?? 0, r.currency);
		if (v != null) e.amount += v;
		byDate.set(r.d, e);
	}
	const ordersOverTime: TrendPoint[] = [...byDate.entries()]
		.sort((a, b) => (a[0] < b[0] ? -1 : 1))
		.map(([date, v]) => ({ date, count: v.count, amount: Math.round(v.amount) }));

	const total = txRow?.total ?? 0;
	const refunded = txRow?.refunded ?? 0;
	return {
		totalOrders: total,
		paidOrders: txRow?.paid ?? 0,
		refundedOrders: refunded,
		refundRate: total ? refunded / total : 0,
		totalSubscriptions: subRow?.total ?? 0,
		activeSubs: subRow?.active ?? 0,
		lifetimeActive: subRow?.lifetime_active ?? 0,
		recurringActive: subRow?.recurring_active ?? 0,
		totalAmount: totalAmount != null ? Math.round(totalAmount) : null,
		baseCurrency: base,
		fxAvailable: rates != null,
		revenueByCurrency: revenueRows.map((r) => ({
			currency: r.currency ?? "—",
			orders: r.orders,
			sumMillis: r.sum_millis ?? 0,
		})),
		ordersByProduct: productRows.map((r) => ({ name: r.product_id ?? "—", count: r.count })),
		subscriptionStatus: statusRows.map((r) => ({ name: r.status ?? "unknown", count: r.count })),
		ordersOverTime,
	};
}
