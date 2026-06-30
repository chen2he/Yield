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
	subStatusTone,
	TX_TYPE_KEY,
} from "@/lib/asc/labels";
import type { OrderDetail } from "@/lib/asc/queries";
import { getProductLabelMap } from "@/lib/asc/settings";
import { storefrontName } from "@/lib/asc/storefronts";

/** 订单详情面板：订单字段 + 关联通知列表（点进可跳到通知页该通知）。 */
export async function OrderDetailPanel({ detail }: { detail: OrderDetail }) {
	const [t, tType, tStatus, tSubStatus, tReason, tOffer, tNotif, tSub, locale, productMap] =
		await Promise.all([
			getTranslations("detail"),
			getTranslations("txType"),
			getTranslations("orderStatus"),
			getTranslations("subStatus"),
			getTranslations("revReason"),
			getTranslations("offerType"),
			getTranslations("notifType"),
			getTranslations("subtype"),
			getLocale(),
			getProductLabelMap(),
		]);
	const { order, notifications } = detail;
	if (!order) return null;

	const typeKey = order.type ? TX_TYPE_KEY[order.type] : null;
	const typeLabel = typeKey && tType.has(typeKey) ? tType(typeKey) : (order.type ?? "—");
	const txStatus = orderStatusOf(order.revocation_date, order.notification_type);
	const reason =
		txStatus === "refunded" && order.revocation_reason != null && tReason.has(String(order.revocation_reason))
			? tReason(String(order.revocation_reason))
			: null;
	const showSub = order.type === "Auto-Renewable Subscription" && order.sub_status;
	const offerLabel =
		order.offer_type != null
			? tOffer.has(String(order.offer_type))
				? tOffer(String(order.offer_type))
				: `#${order.offer_type}`
			: null;

	return (
		<div>
			<div className="rounded-lg border border-border px-3">
				<Field label={t("product")}>{productLabel(order.product_id, productMap)}</Field>
				<Field label={t("type")}>{typeLabel}</Field>
				<Field label={t("amount")}>
					<span className="tabular-nums">{formatMoney(order.price_millis, order.currency)}</span>
				</Field>
				<Field label={t("region")}>{storefrontName(order.storefront, locale)}</Field>
				<Field label={t("environment")}>{order.environment ?? "—"}</Field>
				<Field label={t("purchased")}>
					<span className="tabular-nums">{formatTimestamp(order.purchase_date)}</span>
				</Field>
				{offerLabel || order.offer_identifier ? (
					<Field label={t("offer")}>
						<div>{offerLabel ?? "—"}</div>
						{order.offer_identifier ? (
							<div className="text-xs text-muted-foreground">{order.offer_identifier}</div>
						) : null}
					</Field>
				) : null}
				<Field label={t("status")}>
					<div className="flex flex-col items-end gap-1">
						<Badge tone={orderStatusTone(txStatus)}>{tStatus(txStatus)}</Badge>
						{reason ? <span className="text-xs text-muted-foreground">{reason}</span> : null}
						{showSub && order.sub_status ? (
							<Badge tone={subStatusTone(order.sub_status)}>
								{tSubStatus.has(order.sub_status) ? tSubStatus(order.sub_status) : order.sub_status}
							</Badge>
						) : null}
					</div>
				</Field>
				<Field label={t("transactionId")}>
					<span className="font-mono text-xs break-all">{order.transaction_id}</span>
				</Field>
			</div>

			<SectionTitle>
				{t("relatedNotifications")} ({notifications.length})
			</SectionTitle>
			{notifications.length === 0 ? (
				<p className="text-sm text-muted-foreground">{t("noRelatedNotifications")}</p>
			) : (
				<ul className="flex flex-col gap-1.5">
					{notifications.map((n) => {
						const nLabel = tNotif.has(n.notification_type)
							? tNotif(n.notification_type)
							: n.notification_type;
						const sLabel = n.subtype ? (tSub.has(n.subtype) ? tSub(n.subtype) : n.subtype) : null;
						return (
							<li key={n.notification_uuid}>
								<Link
									href={{ pathname: "/admin/notifications", query: { detail: n.notification_uuid } }}
									className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/40"
								>
									<span className="flex flex-col items-start gap-1">
										<Badge tone={notificationTone(n.notification_type)}>{nLabel}</Badge>
										{sLabel ? <span className="text-xs text-muted-foreground">{sLabel}</span> : null}
									</span>
									<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
										{formatTimestamp(n.received_at)}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
