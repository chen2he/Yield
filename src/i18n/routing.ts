import { defineRouting } from "next-intl/routing";

// 暂支持英文（主）与简体中文（副）。defaultLocale 无 URL 前缀（as-needed）：
//   en -> /admin，zh-Hans -> /zh-Hans/admin。
export const routing = defineRouting({
	locales: ["en", "zh-Hans"],
	defaultLocale: "en",
	localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
