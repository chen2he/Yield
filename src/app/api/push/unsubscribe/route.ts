import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import { isApiAuthed } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";

// 删除一个 Web Push 订阅（需管理员会话）。
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
	const { env } = await getCloudflareContext({ async: true });
	if (!(await isApiAuthed(request, env.ADMIN_PASSWORD))) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}
	const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
	if (!body?.endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });
	const db = await getDb();
	await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(body.endpoint).run();
	return NextResponse.json({ ok: true });
}
