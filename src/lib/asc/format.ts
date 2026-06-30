// 展示层格式化。DB 时间戳为毫秒 epoch（UTC）；price_millis 为货币主单位 ×1000
// （49990 USD = $49.99，68000 CNY = ¥68）。Intl 固定用 en 系 locale，避免 Workers
// 运行时 ICU 受限，也避免 SSR 受宿主时区影响导致 hydration 漂移。

export function formatNumber(n: number): string {
	return new Intl.NumberFormat("en-US").format(n);
}

/** 比例 -> 百分比串，如 0.027 -> "2.7%"。 */
export function formatPercent(ratio: number, digits = 1): string {
	if (!Number.isFinite(ratio)) return "—";
	return `${(ratio * 100).toFixed(digits)}%`;
}

/** 主单位金额（非 millis）格式化为货币串，如 (1234, "USD") -> "$1,234"。 */
export function formatCurrency(amount: number, currency: string, maximumFractionDigits = 0): string {
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits }).format(amount);
	} catch {
		return `${formatNumber(amount)} ${currency}`;
	}
}

/** 把 price_millis + 货币码格式化为金额串；货币缺失时退化为纯数字。 */
export function formatMoney(priceMillis: number | null | undefined, currency: string | null): string {
	const amount = (priceMillis ?? 0) / 1000;
	if (!currency) return formatNumber(amount);
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			maximumFractionDigits: 2,
		}).format(amount);
	} catch {
		return `${formatNumber(amount)} ${currency}`;
	}
}

// 固定 UTC 输出，保证服务端渲染稳定。
const DATE_TIME_FMT = new Intl.DateTimeFormat("en-CA", {
	timeZone: "UTC",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

/** "2026-06-22 16:07" (UTC)，空值为 "—"。 */
export function formatTimestamp(ms: number | null | undefined): string {
	if (!ms) return "—";
	return DATE_TIME_FMT.format(new Date(ms)).replace(",", "");
}
