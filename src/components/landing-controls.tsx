"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/** 首页右上 / 页脚的「语言 + 主题」分段切换；接 next-intl locale 路由与 next-themes。 */
export function LandingControls() {
	const locale = useLocale();
	const t = useTranslations("theme");
	const router = useRouter();
	const pathname = usePathname();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

	const seg = "mono cursor-pointer rounded-[7px] px-3 py-1.5 text-xs leading-none tracking-[0.02em] transition-colors";
	const on = "bg-[var(--seg-on)] font-semibold text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]";
	const off = "bg-transparent font-medium text-[var(--muted)]";
	const group = "flex gap-0.5 rounded-[9px] bg-[var(--seg-wrap)] p-[3px]";

	return (
		<div className="flex items-center gap-2.5">
			<div className={group}>
				<button type="button" onClick={() => router.replace(pathname, { locale: "en" })} className={`${seg} ${locale === "en" ? on : off}`}>
					EN
				</button>
				<button type="button" onClick={() => router.replace(pathname, { locale: "zh-Hans" })} className={`${seg} ${locale === "zh-Hans" ? on : off}`}>
					中
				</button>
			</div>
			<div className={group}>
				<button type="button" onClick={() => setTheme("light")} className={`${seg} ${isDark ? off : on}`}>
					{t("light")}
				</button>
				<button type="button" onClick={() => setTheme("dark")} className={`${seg} ${isDark ? on : off}`}>
					{t("dark")}
				</button>
			</div>
		</div>
	);
}
