import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/admin/badge";
import { Field, SectionTitle } from "@/components/admin/detail-field";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatTimestamp } from "@/lib/asc/format";
import {
	notificationTone,
	orderStatusOf,
	orderStatusTone,
	productLabel,
	TX_TYPE_KEY,
} from "@/lib/asc/labels";
import type { NotificationDetail } from "@/lib/asc/queries";
import { getProductLabelMap } from "@/lib/asc/settings";
import { storefrontName } from "@/lib/asc/storefronts";

/** 通知详情面板：通知字段 + 关联订单卡片（点进可跳到订单页该订单）。 */
export async function NotificationDetailPanel({ detail }: { detail: NotificationDetail }) {
	const [t, tNotif, tSub, tType, tStatus, locale, productMap] = await Promise.all([
		getTranslations("detail"),
		getTranslations("notifType"),
		getTranslations("subtype"),
		getTranslations("txType"),
		getTranslations("orderStatus"),
		getLocale(),
		getProductLabelMap(),
	]);
	const { notification: n, order } = detail;
	if (!n) return null;

	const nLabel = tNotif.has(n.notification_type) ? tNotif(n.notification_type) : n.notification_type;
	const sLabel = n.subtype ? (tSub.has(n.subtype) ? tSub(n.subtype) : n.subtype) : null;

	const orderTypeLabel =
		order?.type && TX_TYPE_KEY[order.type] && tType.has(TX_TYPE_KEY[order.type])
			? tType(TX_TYPE_KEY[order.type])
			: (order?.type ?? null);

	return (
		<div>
			<div className="rounded-lg border border-border px-3">
				<Field label={t("event")}>
					<div className="flex flex-col items-end gap-1">
						<Badge tone={notificationTone(n.notification_type)}>{nLabel}</Badge>
						{sLabel ? <span className="text-xs text-muted-foreground">{sLabel}</span> : null}
					</div>
				</Field>
				<Field label={t("environment")}>{n.environment ?? "—"}</Field>
				<Field label={t("received")}>
					<span className="tabular-nums">{formatTimestamp(n.received_at)}</span>
				</Field>
				<Field label={t("notificationId")}>
					<span className="font-mono text-xs break-all">{n.notification_uuid}</span>
				</Field>
				{n.transaction_id ? (
					<Field label={t("transactionId")}>
						<span className="font-mono text-xs break-all">{n.transaction_id}</span>
					</Field>
				) : null}
				{n.original_transaction_id ? (
					<Field label={t("originalTransactionId")}>
						<span className="font-mono text-xs break-all">{n.original_transaction_id}</span>
					</Field>
				) : null}
			</div>

			<SectionTitle>{t("relatedOrder")}</SectionTitle>
			{order ? (
				<Link
					href={{ pathname: "/admin/orders", query: { detail: order.transaction_id } }}
					className="block rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent/40"
				>
					<div className="flex items-center justify-between gap-3">
						<span className="font-medium">{productLabel(order.product_id, productMap)}</span>
						<span className="tabular-nums">{formatMoney(order.price_millis, order.currency)}</span>
					</div>
					<div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
						<span>
							{storefrontName(order.storefront, locale)}
							{orderTypeLabel ? ` · ${orderTypeLabel}` : ""}
						</span>
						<Badge tone={orderStatusTone(orderStatusOf(order.revocation_date, order.notification_type))}>
							{tStatus(orderStatusOf(order.revocation_date, order.notification_type))}
						</Badge>
					</div>
				</Link>
			) : (
				<p className="text-sm text-muted-foreground">{t("noRelatedOrder")}</p>
			)}
		</div>
	);
}
