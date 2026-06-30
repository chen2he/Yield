import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPathname } from "@/i18n/navigation";
import { login } from "@/lib/admin/actions";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/auth";

export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function LoginPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const { locale } = await params;
	const { env } = await getCloudflareContext({ async: true });
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (token && (await verifySessionToken(token, env.ADMIN_PASSWORD ?? ""))) {
		redirect(getPathname({ href: "/admin", locale }));
	}
	const { error } = await searchParams;
	const t = await getTranslations("login");

	return (
		<div className="flex min-h-dvh items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<div className="mb-6 flex items-center gap-2.5">
					<span className="size-6 rounded-md bg-primary shadow-sm" />
					<p className="text-sm font-semibold tracking-tight">{t("subtitle")}</p>
				</div>
				<form action={login} className="rounded-xl border border-border bg-card p-6 shadow-sm">
					<label htmlFor="password" className="text-xs font-medium text-muted-foreground">
						{t("passwordLabel")}
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autoFocus
						autoComplete="current-password"
						className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
					/>
					{error === "1" ? <p className="mt-2 text-xs text-destructive">{t("error")}</p> : null}
					<button
						type="submit"
						className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
					>
						{t("submit")}
					</button>
				</form>
				<p className="mt-4 text-center text-[11px] text-muted-foreground">{t("hint")}</p>
			</div>
		</div>
	);
}
