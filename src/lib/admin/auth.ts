// 管理后台身份认证：单一管理口令（Worker secret ADMIN_PASSWORD）+ HMAC 签名会话 cookie。
// 纯 WebCrypto，无外部依赖。未设 ADMIN_PASSWORD 时一律拒绝（fail-closed）。

import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "asc_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 小时

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 等长字节常数时间比较 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

async function sha256(text: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

/** 口令常数时间比对（先各自 SHA-256 再比，避免泄漏长度 / 提前返回） */
export async function passwordMatches(input: string, secret: string): Promise<boolean> {
	if (!secret) return false;
	return timingSafeEqual(await sha256(input), await sha256(secret));
}

async function hmac(secret: string, msg: string): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(msg)));
}

/** 生成会话 token：payload(b64url).signature(b64url)，签名密钥取自 ADMIN_PASSWORD。 */
export async function createSessionToken(secret: string): Promise<string> {
	const payload = base64url(encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })));
	const sig = base64url(await hmac(secret, payload));
	return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
	if (!secret) return false;
	const dot = token.indexOf(".");
	if (dot <= 0) return false;
	const payload = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const expected = base64url(await hmac(secret, payload));
	if (!timingSafeEqual(encoder.encode(sig), encoder.encode(expected))) return false;
	try {
		const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
		return typeof json.exp === "number" && json.exp > Date.now();
	} catch {
		return false;
	}
}

/** 请求是否已登录（cookie 有效且未过期）。secret 为空（未配置）时恒为 false。 */
export async function isAuthed(request: NextRequest, secret: string | undefined): Promise<boolean> {
	const token = request.cookies.get(SESSION_COOKIE)?.value;
	if (!token || !secret) return false;
	return verifySessionToken(token, secret);
}

/** JSON 接口鉴权：会话 cookie 有效，或带 `Authorization: Bearer <口令>`（方便 curl）。 */
export async function isApiAuthed(request: NextRequest, secret: string | undefined): Promise<boolean> {
	if (await isAuthed(request, secret)) return true;
	const auth = request.headers.get("authorization");
	if (secret && auth?.startsWith("Bearer ")) {
		return passwordMatches(auth.slice(7).trim(), secret);
	}
	return false;
}

/** 据请求协议决定 secure（localhost http 下不能带 Secure，否则 cookie 不落） */
export function cookieSecure(request: NextRequest): boolean {
	return new URL(request.url).protocol === "https:";
}

export function sessionCookieOptions(secure: boolean) {
	return {
		httpOnly: true,
		secure,
		sameSite: "lax" as const,
		path: "/",
		maxAge: Math.floor(SESSION_TTL_MS / 1000),
	};
}
