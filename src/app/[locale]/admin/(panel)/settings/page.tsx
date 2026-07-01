import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { getAllowedAppIds, getDataCurrencies, getProducts, getSettings } from "@/lib/asc/settings";
import { AddAppIdForm } from "./add-app-id-form";
import { AddProductForm } from "./add-product-form";
import { DeleteAppIdButton } from "./delete-app-id-button";
import { DeleteProductButton } from "./delete-product-button";
import { PreferencesForm } from "./preferences-form";
import { PushManager } from "./push-manager";

export const dynamic = "force-dynamic";

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "HKD", "AUD", "CAD"];

export default async function SettingsPage() {
	const [t, locale, settings, products, dataCurrencies, allowedAppIds] = await Promise.all([
		getTranslations("settings"),
		getLocale(),
		getSettings(),
		getProducts(),
		getDataCurrencies(),
		getAllowedAppIds(),
	]);
	const { env } = await getCloudflareContext({ async: true });
	const vapidPublicKey = env.VAPID_PUBLIC_KEY ?? "";
	const currencies = [...new Set([settings.currency, ...COMMON_CURRENCIES, ...dataCurrencies])].sort();

	const card = "rounded-xl border border-border bg-card p-5";

	return (
		<div>
			<PageHeader title={t("title")} description={t("description")} />
			<div className="max-w-2xl space-y-4">
				<section className={card}>
					<h2 className="text-sm font-semibold">{t("prefsTitle")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("prefsDescription")}</p>
					<PreferencesForm settings={settings} currencies={currencies} />
				</section>

				<section className={card}>
					<h2 className="text-sm font-semibold">{t("pushSectionTitle")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("pushSectionDescription")}</p>
					<div className="mt-3">
						<PushManager vapidPublicKey={vapidPublicKey} locale={locale} />
					</div>
				</section>

				<section className={card}>
					<h2 className="text-sm font-semibold">{t("productsTitle")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("productsDescription")}</p>
					<AddProductForm />
					<div className="mt-4">
						{products.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("noProducts")}</p>
						) : (
							<ul className="divide-y divide-border/60 rounded-lg border border-border">
								{products.map((p) => (
									<li key={p.product_id} className="flex items-center justify-between gap-3 px-3 py-2">
										<div className="min-w-0">
											<div className="truncate text-sm font-medium">{p.label}</div>
											<div className="truncate font-mono text-xs text-muted-foreground">{p.product_id}</div>
										</div>
										<DeleteProductButton productId={p.product_id} />
									</li>
								))}
							</ul>
						)}
					</div>
				</section>

				<section className={card}>
					<h2 className="text-sm font-semibold">{t("appIdTitle")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("appIdDescription")}</p>
					<AddAppIdForm />
					<div className="mt-4">
						{allowedAppIds.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("noAppIds")}</p>
						) : (
							<ul className="divide-y divide-border/60 rounded-lg border border-border">
								{allowedAppIds.map((id) => (
									<li key={id} className="flex items-center justify-between gap-3 px-3 py-2">
										<div className="truncate font-mono text-sm">{id}</div>
										<DeleteAppIdButton appAppleId={id} />
									</li>
								))}
							</ul>
						)}
					</div>
				</section>

				<section className={card}>
					<h2 className="text-sm font-semibold">{t("webhookTitle")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("webhookDescription")}</p>
					<code className="mt-3 inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs">
						POST /api/asc/webhook
					</code>
				</section>
			</div>
		</div>
	);
}
