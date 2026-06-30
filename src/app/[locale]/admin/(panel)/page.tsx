import { getTranslations } from "next-intl/server";
import { CategoryDonut, CurrencyBar, OrdersTrendChart } from "@/components/admin/overview-charts";
import { PageHeader } from "@/components/admin/page-header";
import { Segmented } from "@/components/admin/segmented";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/asc/format";
import { productLabel } from "@/lib/asc/labels";
import { fetchOverview } from "@/lib/asc/queries";
import { getProductLabelMap, getSettings } from "@/lib/asc/settings";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function str(sp: SearchParams, key: string): string | null {
	const v = sp[key];
	return typeof v === "string" && v ? v : null;
}

export default async function OverviewPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const sp = await searchParams;
	const envRaw = str(sp, "env");
	const env = envRaw === "Production" || envRaw === "Sandbox" ? envRaw : null;
	const trendDays = str(sp, "range") === "7" ? 7 : 30;

	const [t, tSub, settings, productMap] = await Promise.all([
		getTranslations("overview"),
		getTranslations("subStatus"),
		getSettings(),
		getProductLabelMap(),
	]);
	const ov = await fetchOverview({ env, trendDays, currency: settings.currency });

	const currentParams: Record<string, string> = {};
	for (const [k, v] of Object.entries(sp)) if (typeof v === "string") currentParams[k] = v;

	const kpis = [
		{
			label: t("kpi.orders"),
			value: formatNumber(ov.totalOrders),
			hint: t("kpi.ordersHint", { paid: ov.paidOrders, refunded: ov.refundedOrders }),
		},
		{
			label: t("kpi.amount"),
			value: ov.totalAmount != null ? formatCurrency(ov.totalAmount, ov.baseCurrency) : "—",
			hint: ov.totalAmount != null ? t("kpi.amountHint", { base: ov.baseCurrency }) : t("fxUnavailable"),
		},
		{
			label: t("kpi.activeSubs"),
			value: formatNumber(ov.activeSubs),
			hint: t("kpi.activeSubsHint", { lifetime: ov.lifetimeActive, recurring: ov.recurringActive }),
		},
		{
			label: t("kpi.refunds"),
			value: formatNumber(ov.refundedOrders),
			hint: t("kpi.refundsHint", { rate: formatPercent(ov.refundRate) }),
		},
	];

	const productData = ov.ordersByProduct.map((p) => ({ label: productLabel(p.name, productMap), value: p.count }));
	const subStatusData = ov.subscriptionStatus.map((s) => ({
		label: tSub.has(s.name) ? tSub(s.name) : s.name,
		value: s.count,
	}));
	const currencyData = ov.revenueByCurrency.map((c) => ({ currency: c.currency, orders: c.orders }));

	const envSwitcher = (
		<Segmented
			paramKey="env"
			value={env ?? ""}
			defaultValue=""
			options={[
				{ value: "", label: t("env.all") },
				{ value: "Production", label: t("env.production") },
				{ value: "Sandbox", label: t("env.sandbox") },
			]}
			current={currentParams}
		/>
	);
	const rangeSwitcher = (
		<Segmented
			paramKey="range"
			value={String(trendDays)}
			defaultValue="30"
			options={[
				{ value: "7", label: t("range7") },
				{ value: "30", label: t("range30") },
			]}
			current={currentParams}
		/>
	);

	const card = "rounded-xl border border-border bg-card";
	const head = "border-b border-border px-4 py-3 text-sm font-semibold";

	return (
		<div className="flex flex-col gap-4">
			<PageHeader title={t("title")} description={t("description")} right={envSwitcher} />

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{kpis.map((k) => (
					<div key={k.label} className={`${card} p-4`}>
						<p className="text-xs text-muted-foreground">{k.label}</p>
						<p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
						<p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
					</div>
				))}
			</div>

			<section className={card}>
				<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
					<h2 className="text-sm font-semibold">{t("trendTitle")}</h2>
					{rangeSwitcher}
				</div>
				<div className="p-3">
					<OrdersTrendChart
						data={ov.ordersOverTime}
						countLabel={t("kpi.orders")}
						amountLabel={t("amountSeries", { base: ov.baseCurrency })}
						baseCurrency={ov.baseCurrency}
						showAmount={ov.fxAvailable}
					/>
				</div>
			</section>

			<div className="grid gap-4 md:grid-cols-2">
				<section className={card}>
					<h2 className={head}>{t("productTitle")}</h2>
					<div className="p-3">
						<CategoryDonut data={productData} />
					</div>
				</section>
				<section className={card}>
					<h2 className={head}>{t("subStatusTitle")}</h2>
					<div className="p-3">
						<CategoryDonut data={subStatusData} />
					</div>
				</section>
			</div>

			<section className={card}>
				<h2 className={head}>{t("currencyTitle")}</h2>
				<div className="p-3">
					<CurrencyBar data={currencyData} label={t("kpi.orders")} />
				</div>
			</section>
		</div>
	);
}
