"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPathname } from "@/i18n/navigation";
import {
	SESSION_COOKIE,
	createSessionToken,
	passwordMatches,
	sessionCookieOptions,
} from "@/lib/admin/auth";

// 登录 / 登出的 Server Action（locale 感知重定向）。
// 登录：口令常数时间比对 + HMAC 签名会话 cookie；失败 -> /admin/login?error=1。
export async function login(formData: FormData): Promise<void> {
	const { env } = await getCloudflareContext({ async: true });
	const secret = env.ADMIN_PASSWORD ?? "";
	const password = String(formData.get("password") ?? "");
	const locale = await getLocale();

	if (!(await passwordMatches(password, secret))) {
		redirect(getPathname({ href: { pathname: "/admin/login", query: { error: "1" } }, locale }));
	}

	const token = await createSessionToken(secret);
	// 无 NextRequest，secure 据转发协议判定（localhost http 下不能带 Secure，否则 cookie 不落）。
	const proto = (await headers()).get("x-forwarded-proto") ?? "http";
	(await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(proto === "https"));
	redirect(getPathname({ href: "/admin", locale }));
}

export async function logout(): Promise<void> {
	const locale = await getLocale();
	(await cookies()).set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
	redirect(getPathname({ href: "/admin/login", locale }));
}
