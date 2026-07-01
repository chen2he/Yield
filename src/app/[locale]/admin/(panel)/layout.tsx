import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { LocaleToggle } from "@/components/admin/locale-toggle";
import { ModeToggle } from "@/components/admin/mode-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getPathname } from "@/i18n/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/auth";
import { getSettings } from "@/lib/asc/settings";

// 读取会话 cookie 即令本子树动态渲染；未登录 -> /admin/login（locale 感知）。
export const dynamic = "force-dynamic";

// 鉴权后台不应被收录（robots.txt 已屏蔽，这里再加一道 meta 兜底）。
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const { env } = await getCloudflareContext({ async: true });
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token || !(await verifySessionToken(token, env.ADMIN_PASSWORD ?? ""))) {
		redirect(getPathname({ href: "/admin/login", locale }));
	}
	// 首次部署未完成引导 -> 强制先走 /admin/onboarding。
	const settings = await getSettings();
	if (!settings.onboardingCompleted) {
		redirect(getPathname({ href: "/admin/onboarding", locale }));
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
					<SidebarTrigger />
					<div className="flex items-center gap-2">
						<LocaleToggle />
						<ModeToggle />
					</div>
				</header>
				<main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
