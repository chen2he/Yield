// 汇率：open.er-api.com（免费、无需 key，USD 基准，rates[X] = 1 USD 兑 X 个单位）。
// 进程内缓存，最多每小时刷新；拿不到时退回上次的值。参考 orange-cloud-dashboard 的处理。

const ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 60 * 60 * 1000;

export interface FxRates {
	rates: Record<string, number>;
	updatedAt: number;
}

let cache: (FxRates & { fetchedAt: number }) | null = null;

export async function getUsdRates(): Promise<FxRates | null> {
	if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
		return { rates: cache.rates, updatedAt: cache.updatedAt };
	}
	try {
		const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return cache ?? null;
		const data = (await res.json()) as {
			result?: string;
			rates?: Record<string, number>;
			time_last_update_unix?: number;
		};
		if (data.result !== "success" || !data.rates) return cache ?? null;
		cache = {
			rates: data.rates,
			updatedAt: (data.time_last_update_unix ?? Math.floor(Date.now() / 1000)) * 1000,
			fetchedAt: Date.now(),
		};
		return { rates: cache.rates, updatedAt: cache.updatedAt };
	} catch {
		return cache ?? null;
	}
}

/** price_millis（from 币种）-> to 币种的主单位金额（经 USD 中转）；缺率返回 null。 */
export function convertMillis(
	priceMillis: number,
	from: string,
	to: string,
	rates: Record<string, number>,
): number | null {
	const rateFrom = rates[from];
	const rateTo = rates[to];
	if (!rateFrom || !rateTo) return null;
	return (priceMillis / 1000 / rateFrom) * rateTo;
}
