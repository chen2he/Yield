import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/admin/badge";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DetailSheet } from "@/components/admin/detail-sheet";
import { FilterToolbar, type FilterControl } from "@/components/admin/filter-toolbar";
import { OrderDetailPanel } from "@/components/admin/order-detail";
import { PageSizeSelect } from "@/components/admin/page-size-select";
import { Pagination } from "@/components/admin/pagination";
import { ClickableRow } from "@/components/admin/row-link";
import { SortHeader } from "@/components/admin/sort-header";
import { formatMoney, formatTimestamp } from "@/lib/asc/format";
import {
	ENVIRONMENTS,
	ORDER_STATUSES,
	type OrderStatus,
	orderStatusOf,
	orderStatusTone,
	productLabel,
	SUBSCRIPTION_STATUSES,
	subStatusTone,
	TRANSACTION_TYPES,
	TX_TYPE_KEY,
} from "@/lib/asc/labels";
import { getProductLabelMap } from "@/lib/asc/settings";
import { STOREFRONTS, storefrontName } from "@/lib/asc/storefronts";
import {
	DEFAULT_PAGE_SIZE,
	fetchOrderDetail,
	fetchOrders,
	type OrderSort,
	PAGE_SIZES,
	parsePageSize,
	type SortDir,
} from "@/lib/asc/queries";

export const dynamic = "force-dynamic";

const BASE = "/admin/orders";

type SearchParams = Record<string, string | string[] | undefined>;

function str(sp: SearchParams, key: string): string | null {
	const v = sp[key];
	return typeof v === "string" && v ? v : null;
}

function parsePage(v: string | null): number {
	const n = Number(v);
	return Number.isInteger(n) && n > 1 ? n : 1;
}

export default async function OrdersPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const sp = await searchParams;
	const page = parsePage(str(sp, "page"));
	const sort: OrderSort = sp.sort === "amount" ? "amount" : "date";
	const dir: SortDir = sp.dir === "asc" ? "asc" : "desc";
	const type = str(sp, "type");
	const region = str(sp, "region");
	const env = str(sp, "env");
	const statusRaw = str(sp, "status");
	const status = statusRaw && (ORDER_STATUSES as readonly string[]).includes(statusRaw)
		? (statusRaw as OrderStatus)
		: null;
	const subStatusRaw = str(sp, "substatus");
	const subStatus =
		subStatusRaw && (SUBSCRIPTION_STATUSES as readonly string[]).includes(subStatusRaw)
			? subStatusRaw
			: null;
	const pageSize = parsePageSize(str(sp, "size"));
	const detailId = str(sp, "detail");

	const [t, tType, tOffer, tStatus, tSubStatus, tReason, tFilter, tCommon, tDetail, locale, productMap, result, orderDetail] =
		await Promise.all([
			getTranslations("orders"),
			getTranslations("txType"),
			getTranslations("offerType"),
			getTranslations("orderStatus"),
			getTranslations("subStatus"),
			getTranslations("revReason"),
			getTranslations("orders.filters"),
			getTranslations("common"),
			getTranslations("detail"),
			getLocale(),
			getProductLabelMap(),
			fetchOrders({ page, pageSize, sort, dir, type, region, status, subStatus, env }),
			detailId ? fetchOrderDetail(detailId) : Promise.resolve(null),
		]);
	const { rows, total, page: current, totalPages } = result;

	const typeLabelFor = (raw: string) => {
		const key = TX_TYPE_KEY[raw];
		return key && tType.has(key) ? tType(key) : raw;
	};

	const controls: FilterControl[] = [
		{
			key: "type",
			label: tFilter("type"),
			allLabel: tFilter("allTypes"),
			value: type ?? "",
			options: TRANSACTION_TYPES.map((v) => ({ value: v, label: typeLabelFor(v) })),
		},
		{
			key: "region",
			label: tFilter("region"),
			allLabel: tFilter("allRegions"),
			value: region ?? "",
			options: STOREFRONTS.map((s) => ({ value: s.code, label: locale === "zh-Hans" ? s.zh : s.en })),
		},
		{
			key: "status",
			label: tFilter("status"),
			allLabel: tFilter("allStatuses"),
			value: status ?? "",
			options: ORDER_STATUSES.map((v) => ({ value: v, label: tStatus(v) })),
		},
		{
			key: "substatus",
			label: tFilter("subStatus"),
			allLabel: tFilter("allSubStatuses"),
			value: subStatus ?? "",
			options: SUBSCRIPTION_STATUSES.map((v) => ({
				value: v,
				label: tSubStatus.has(v) ? tSubStatus(v) : v,
			})),
		},
		{
			key: "env",
			label: tFilter("environment"),
			allLabel: tFilter("allEnvironments"),
			value: env ?? "",
			options: ENVIRONMENTS.map((v) => ({ value: v, label: v })),
		},
	];

	// 当前全部 query（给筛选栏保留其它参数用）。
	const currentParams: Record<string, string> = {};
	for (const [k, v] of Object.entries(sp)) if (typeof v === "string") currentParams[k] = v;

	// 关闭详情：去掉 detail 的当前 query。
	const closeQuery: Record<string, string> = {};
	for (const [k, v] of Object.entries(currentParams)) if (k !== "detail") closeQuery[k] = v;

	// 筛选项。
	const filterParams: Record<string, string> = {};
	if (type) filterParams.type = type;
	if (region) filterParams.region = region;
	if (status) filterParams.status = status;
	if (subStatus) filterParams.substatus = subStatus;
	if (env) filterParams.env = env;

	// 排序列头保留：筛选 + size（换排序回到第 1 页）。默认值省略以保持 URL 干净。
	const sortParams: Record<string, string> = { ...filterParams };
	if (pageSize !== DEFAULT_PAGE_SIZE) sortParams.size = String(pageSize);

	// 翻页保留：筛选 + size + 排序。
	const pageParams: Record<string, string> = { ...sortParams };
	if (sort !== "date") pageParams.sort = sort;
	if (dir !== "desc") pageParams.dir = dir;

	const th = "px-4 py-2.5 font-medium";
	const td = "whitespace-nowrap px-4 py-2.5";

	return (
		<div>
			<PageHeader title={t("title")} description={t("description")} />
			<FilterToolbar controls={controls} current={currentParams} />

			{rows.length === 0 ? (
				<EmptyState>{t("empty")}</EmptyState>
			) : (
				<>
					<p className="mb-3 text-xs text-muted-foreground">{t("count", { count: total })}</p>
					<div className="overflow-x-auto rounded-xl border border-border bg-card">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-left text-xs text-muted-foreground">
									<th className={th}>{t("columns.product")}</th>
									<th className={th}>{t("columns.type")}</th>
									<th className={`${th} text-right`}>
										<SortHeader
											label={t("columns.amount")}
											field="amount"
											active={sort === "amount"}
											dir={dir}
											basePath={BASE}
											params={sortParams}
											align="right"
										/>
									</th>
									<th className={th}>{t("columns.offer")}</th>
									<th className={th}>{t("columns.region")}</th>
									<th className={th}>{t("columns.environment")}</th>
									<th className={th}>
										<SortHeader
											label={t("columns.date")}
											field="date"
											active={sort === "date"}
											dir={dir}
											basePath={BASE}
											params={sortParams}
										/>
									</th>
									<th className={th}>{t("columns.status")}</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => {
									const offerLabel =
										r.offer_type != null
											? tOffer.has(String(r.offer_type))
												? tOffer(String(r.offer_type))
												: `#${r.offer_type}`
											: null;
									const txStatus = orderStatusOf(r.revocation_date, r.notification_type);
									const reason =
										txStatus === "refunded" && r.revocation_reason != null
											? tReason.has(String(r.revocation_reason))
												? tReason(String(r.revocation_reason))
												: null
											: null;
									const showSub = r.type === "Auto-Renewable Subscription" && r.sub_status;
									return (
										<ClickableRow
											key={r.transaction_id}
											query={{ ...currentParams, detail: r.transaction_id }}
											active={detailId === r.transaction_id}
										>
											<td className={`${td} font-medium`}>{productLabel(r.product_id, productMap)}</td>
											<td className={`${td} text-muted-foreground`}>
												{r.type ? typeLabelFor(r.type) : "—"}
											</td>
											<td className={`${td} text-right font-medium tabular-nums`}>
												{formatMoney(r.price_millis, r.currency)}
											</td>
											<td className={td}>
												{offerLabel ? (
													<div className="text-muted-foreground">{offerLabel}</div>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
												{r.offer_identifier ? (
													<div className="text-xs text-muted-foreground">{r.offer_identifier}</div>
												) : null}
											</td>
											<td className={`${td} text-muted-foreground`}>
												{storefrontName(r.storefront, locale)}
											</td>
											<td className={td}>
												{r.environment ? (
													<Badge tone={r.environment === "Production" ? "muted" : "info"}>
														{r.environment}
													</Badge>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
											<td className={`${td} text-muted-foreground tabular-nums`}>
												{formatTimestamp(r.purchase_date)}
											</td>
											<td className={td}>
												<div className="flex flex-col items-start gap-1">
													<Badge tone={orderStatusTone(txStatus)}>{tStatus(txStatus)}</Badge>
													{reason ? (
														<span className="text-xs text-muted-foreground">{reason}</span>
													) : null}
													{showSub && r.sub_status ? (
														<Badge tone={subStatusTone(r.sub_status)}>
															{tSubStatus.has(r.sub_status) ? tSubStatus(r.sub_status) : r.sub_status}
														</Badge>
													) : null}
												</div>
											</td>
										</ClickableRow>
									);
								})}
							</tbody>
						</table>
					</div>
					<Pagination
						basePath={BASE}
						page={current}
						totalPages={totalPages}
						params={pageParams}
						label={tCommon("pageInfo", { page: current, total: totalPages })}
						sizeSelect={
							<PageSizeSelect
								value={pageSize}
								sizes={PAGE_SIZES}
								defaultSize={DEFAULT_PAGE_SIZE}
								current={currentParams}
								label={tCommon("perPage")}
							/>
						}
					/>
				</>
			)}
			{detailId && orderDetail && orderDetail.order ? (
				<DetailSheet title={tDetail("orderTitle")} closeQuery={closeQuery}>
					<OrderDetailPanel detail={orderDetail} />
				</DetailSheet>
			) : null}
		</div>
	);
}
