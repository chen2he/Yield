// 站点级常量：SEO / GEO 元数据、robots、sitemap、结构化数据共用的单一来源。
// 规范站点地址 —— 部署到自有域名时用 NEXT_PUBLIC_SITE_URL 覆盖（构建期内联）。
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://yield.o-c.do").replace(/\/+$/, "");
export const SITE_NAME = "Yield";

export const GITHUB_URL = "https://github.com/chen2he/Yield";
export const OC_URL = "https://o-c.do";
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;

// 作者 / 发布方（元数据 authors、结构化数据里的 Person）。
export const AUTHOR = "Chen2he";
export const AUTHOR_URL = "https://github.com/chen2he";

// hreflang ↔ og:locale 映射。next-intl 的 locale 用脚本子标签（zh-Hans），
// Open Graph 需要 language_TERRITORY 形式。
export const OG_LOCALE: Record<string, string> = { en: "en_US", "zh-Hans": "zh_CN" };

// 关键词混排中英技术词 —— 搜索意图常以英文产品名为主，辅以中文长尾。
export const SEO_KEYWORDS = [
	"App Store Connect",
	"App Store Server Notifications",
	"App Store 订单管理",
	"order management",
	"self-hosted",
	"open source",
	"Cloudflare Workers",
	"Cloudflare D1",
	"webhook",
	"in-app purchase",
	"subscription analytics",
	"revenue dashboard",
	"Apple",
];

// 本地化截图（同时充当 Open Graph / Twitter 卡片图与结构化数据 screenshot）。
export const OG_IMAGE = { width: 2312, height: 1554 } as const;
export function ogImagePath(locale: string): string {
	return `/dashboard-light_${locale}.png`;
}
