import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import { notifyEvent } from "@/lib/asc/notify";
import { getAllowedAppIds, getProductLabelMap, getSettings } from "@/lib/asc/settings";
import { processNotification } from "@/lib/asc/store";
import { NotificationVerifyError, verifyNotification } from "@/lib/asc/verify";

// App Store Server Notifications V2 入口。Apple POST { signedPayload: <JWS> }。
// 安全边界 = JWS 验签（x5c 链 pin 到 Apple Root CA G3），无共享密钥。
// 在 App Store Connect 把 Production / Sandbox 通知 URL 指向此端点即可。
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
	const raw = await request.text();
	let signedPayload: string | undefined;
	try {
		signedPayload = (JSON.parse(raw) as { signedPayload?: string }).signedPayload;
	} catch {
		return NextResponse.json({ error: "bad json" }, { status: 400 });
	}
	if (!signedPayload) {
		return NextResponse.json({ error: "missing signedPayload" }, { status: 400 });
	}

	let decoded;
	try {
		decoded = await verifyNotification(signedPayload);
	} catch (err) {
		if (err instanceof NotificationVerifyError) {
			return NextResponse.json({ error: "invalid signature" }, { status: 401 });
		}
		console.error("[asc-webhook] verify error", err);
		return NextResponse.json({ error: "verify failed" }, { status: 400 });
	}

	const { env, ctx } = getCloudflareContext();
	const [settings, allowedAppIds] = await Promise.all([getSettings(), getAllowedAppIds()]);

	// App ID 过滤：白名单为空则接收所有应用的通知；非空则仅接收 app_apple_id 命中的通知，其余整体丢弃（不入库、不推送）。
	const appAppleId = decoded.payload.data?.appAppleId ?? decoded.payload.summary?.appAppleId;
	if (allowedAppIds.length > 0 && (appAppleId == null || !allowedAppIds.includes(appAppleId))) {
		return NextResponse.json({ ok: true, discarded: true, reason: "app_id_mismatch" });
	}

	const result = await processNotification(env.DB, decoded);

	// 仅新通知推送（Apple 重发的重复通知不再打扰）。fire-and-forget，不阻塞响应。
	if (!result.duplicate) {
		const productMap = await getProductLabelMap();
		const task = notifyEvent(decoded, settings, productMap).catch((e) =>
			console.error("[asc-webhook] notify error", e),
		);
		if (ctx?.waitUntil) ctx.waitUntil(task);
		else await task;
	}

	return NextResponse.json({ ok: true, duplicate: result.duplicate, type: result.notificationType });
}
