import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/admin/badge";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DetailSheet } from "@/components/admin/detail-sheet";
import { FilterToolbar, type FilterControl } from "@/components/admin/filter-toolbar";
import { NotificationDetailPanel } from "@/components/admin/notification-detail";
import { PageSizeSelect } from "@/components/admin/page-size-select";
import { Pagination } from "@/components/admin/pagination";
import { ClickableRow } from "@/components/admin/row-link";
import { SortHeader } from "@/components/admin/sort-header";
import { formatMoney, formatTimestamp } from "@/lib/asc/format";
import {
	ENVIRONMENTS,
	NOTIFICATION_TYPES,
	notificationTone,
	productLabel,
	SUBTYPES,
} from "@/lib/asc/labels";
import { getProductLabelMap } from "@/lib/asc/settings";
import {
	DEFAULT_PAGE_SIZE,
	fetchNotificationDetail,
	fetchNotifications,
	PAGE_SIZES,
	parsePageSize,
	type SortDir,
} from "@/lib/asc/queries";

export const dynamic = "force-dynamic";

const BASE = "/admin/notifications";

type SearchParams = Record<string, string | string[] | undefined>;

function str(sp: SearchParams, key: string): string | null {
	const v = sp[key];
	return typeof v === "string" && v ? v : null;
}

function parsePage(v: string | null): number {
	const n = Number(v);
	return Number.isInteger(n) && n > 1 ? n : 1;
}

export default async function NotificationsPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const sp = await searchParams;
	const page = parsePage(str(sp, "page"));
	const dir: SortDir = sp.dir === "asc" ? "asc" : "desc";
	const type = str(sp, "type");
	const subtype = str(sp, "subtype");
	const env = str(sp, "env");
	const pageSize = parsePageSize(str(sp, "size"));
	const detailId = str(sp, "detail");

	const [t, tNotif, tSub, tFilter, tCommon, tDetail, productMap, result, notifDetail] = await Promise.all([
		getTranslations("notifications"),
		getTranslations("notifType"),
		getTranslations("subtype"),
		getTranslations("notifications.filters"),
		getTranslations("common"),
		getTranslations("detail"),
		getProductLabelMap(),
		fetchNotifications({ page, pageSize, dir, type, subtype, env }),
		detailId ? fetchNotificationDetail(detailId) : Promise.resolve(null),
	]);
	const { rows, total, page: current, totalPages } = result;

	const controls: FilterControl[] = [
		{
			key: "type",
			label: tFilter("eventType"),
			allLabel: tFilter("allEventTypes"),
			value: type ?? "",
			options: NOTIFICATION_TYPES.map((v) => ({ value: v, label: tNotif.has(v) ? tNotif(v) : v })),
		},
		{
			key: "subtype",
			label: tFilter("subtype"),
			allLabel: tFilter("allSubtypes"),
			value: subtype ?? "",
			options: SUBTYPES.map((v) => ({ value: v, label: tSub.has(v) ? tSub(v) : v })),
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
	if (subtype) filterParams.subtype = subtype;
	if (env) filterParams.env = env;

	// 排序列头保留：筛选 + size（换排序回到第 1 页）。
	const sortParams: Record<string, string> = { ...filterParams };
	if (pageSize !== DEFAULT_PAGE_SIZE) sortParams.size = String(pageSize);

	// 翻页保留：筛选 + size + 排序方向。
	const pageParams: Record<string, string> = { ...sortParams };
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
									<th className={th}>{t("columns.type")}</th>
									<th className={th}>{t("columns.related")}</th>
									<th className={th}>{t("columns.environment")}</th>
									<th className={th}>
										<SortHeader
											label={t("columns.received")}
											field="received"
											active={true}
											dir={dir}
											basePath={BASE}
											params={sortParams}
										/>
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => {
									const typeLabel = tNotif.has(r.notification_type)
										? tNotif(r.notification_type)
										: r.notification_type;
									const subLabel = r.subtype
										? tSub.has(r.subtype)
											? tSub(r.subtype)
											: r.subtype
										: null;
									const hasTxn = r.t_product_id != null || r.t_price_millis != null;
									return (
										<ClickableRow
											key={r.notification_uuid}
											query={{ ...currentParams, detail: r.notification_uuid }}
											active={detailId === r.notification_uuid}
										>
											<td className={td}>
												<Badge tone={notificationTone(r.notification_type)}>{typeLabel}</Badge>
												{subLabel ? (
													<div className="mt-1 text-xs text-muted-foreground">{subLabel}</div>
												) : null}
											</td>
											<td className={td}>
												{hasTxn ? (
													<div>
														<div className="text-muted-foreground">{productLabel(r.t_product_id, productMap)}</div>
														{r.t_price_millis != null ? (
															<div className="text-xs tabular-nums text-muted-foreground">
																{formatMoney(r.t_price_millis, r.t_currency)}
															</div>
														) : null}
													</div>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
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
												{formatTimestamp(r.received_at)}
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
			{detailId && notifDetail && notifDetail.notification ? (
				<DetailSheet title={tDetail("notificationTitle")} closeQuery={closeQuery}>
					<NotificationDetailPanel detail={notifDetail} />
				</DetailSheet>
			) : null}
		</div>
	);
}
