import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
	// 排除 API（含 ASC webhook /api/asc/webhook）、Next 内部路径与所有带扩展名的静态资源；
	// 其余路径（含 /admin）都走 next-intl 的语言路由。
	matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
