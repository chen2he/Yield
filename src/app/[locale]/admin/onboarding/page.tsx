import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPathname } from "@/i18n/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/auth";
import { getAllowedAppIds, getDataCurrencies, getProducts, getSettings } from "@/lib/asc/settings";
import { OnboardingWizard } from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "HKD", "AUD", "CAD"];

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const { env } = await getCloudflareContext({ async: true });
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token || !(await verifySessionToken(token, env.ADMIN_PASSWORD ?? ""))) {
		redirect(getPathname({ href: "/admin/login", locale }));
	}

	const settings = await getSettings();
	if (settings.onboardingCompleted) {
		redirect(getPathname({ href: "/admin", locale }));
	}

	const [products, dataCurrencies, allowedAppIds] = await Promise.all([
		getProducts(),
		getDataCurrencies(),
		getAllowedAppIds(),
	]);
	const vapidPublicKey = env.VAPID_PUBLIC_KEY ?? "";
	const currencies = [...new Set([settings.currency, ...COMMON_CURRENCIES, ...dataCurrencies])].sort();

	return (
		<div className="flex min-h-dvh items-center justify-center px-4 py-10">
			<OnboardingWizard
				locale={locale}
				settings={settings}
				products={products}
				allowedAppIds={allowedAppIds}
				currencies={currencies}
				vapidPublicKey={vapidPublicKey}
			/>
		</div>
	);
}
