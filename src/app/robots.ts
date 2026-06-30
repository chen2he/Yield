import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /robots.txt —— 收录公开页，屏蔽鉴权后台（/admin 及其语言前缀）与 API；指向 sitemap。
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/admin", "/zh-Hans/admin", "/api/"],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	};
}
