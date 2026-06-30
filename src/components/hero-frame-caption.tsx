"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

// 各截图真实尺寸（按主题区分；同主题下两语种仅差几像素，忽略不计）。
const DIMS = { light: { w: 2900, h: 1552 }, dark: { w: 2313, h: 1554 } } as const;

/** Hero 仪表盘截图：按当前主题(浅/深) + 界面语言挑选 public 下对应图。 */
export function HeroFrameCaption() {
	const { resolvedTheme } = useTheme();
	const t = useTranslations("landing");
	const locale = useLocale();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// resolvedTheme 把 "system" 归一到 light/dark；挂载前用 light，避免 hydration 不一致与 system_xxx 404。
	const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
	const { w, h } = DIMS[mode];

	return (
		<Image
			src={`/dashboard-${mode}_${locale}.png`}
			alt={t("hero.frameCaption")}
			width={w}
			height={h}
			priority
			sizes="(max-width: 1120px) 100vw, 1056px"
			className="block h-auto w-full"
		/>
	);
}
