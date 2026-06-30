import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

// /sitemap.xml —— 仅公开首页（后台需登录，已在 robots 屏蔽）。
// localePrefix: "as-needed" → 默认语言在根路径，其余带语言前缀；双语互为 hreflang alternates。
export default function sitemap(): MetadataRoute.Sitemap {
	const urlFor = (locale: string) => (locale === routing.defaultLocale ? `${SITE_URL}/` : `${SITE_URL}/${locale}`);
	const languages = Object.fromEntries(routing.locales.map((locale) => [locale, urlFor(locale)]));
	return [
		{
			url: urlFor(routing.defaultLocale),
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
			alternates: { languages },
		},
	];
}
