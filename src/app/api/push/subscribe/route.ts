import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import { isApiAuthed } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";

// 保存当前浏览器的 Web Push 订阅（需管理员会话）。
export const dynamic = "force-dynamic";

interface SubBody {
	subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
	locale?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	const { env } = await getCloudflareContext({ async: true });
	if (!(await isApiAuthed(request, env.ADMIN_PASSWORD))) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}
	const body = (await request.json().catch(() => null)) as SubBody | null;
	const sub = body?.subscription;
	if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
		return NextResponse.json({ error: "bad subscription" }, { status: 400 });
	}
	const db = await getDb();
	await db
		.prepare(
			`INSERT INTO push_subscriptions (endpoint, p256dh, auth, locale, created_at) VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, locale = excluded.locale`,
		)
		.bind(sub.endpoint, sub.keys.p256dh, sub.keys.auth, body?.locale ?? null, Date.now())
		.run();
	return NextResponse.json({ ok: true });
}
