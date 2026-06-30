// 把 Worker secrets 合并进自动生成的 CloudflareEnv（cloudflare-env.d.ts 由 cf-typegen
// 生成，不含 secret 字段）。此文件无 import/export，按全局脚本与全局接口声明合并。
interface CloudflareEnv {
	/** 管理后台登录口令（HMAC 会话签名密钥）。`wrangler secret put ADMIN_PASSWORD`。 */
	ADMIN_PASSWORD?: string;
	/** App Store Connect webhook 验签密钥。`wrangler secret put ASC_WEBHOOK_SECRET`。 */
	ASC_WEBHOOK_SECRET?: string;
	/** Web Push VAPID 公钥（base64url 未压缩点，65字节）。客户端 applicationServerKey 用；非敏感，置于 wrangler.jsonc vars。 */
	VAPID_PUBLIC_KEY?: string;
	/** Web Push VAPID 私钥（base64url d，32字节）。`wrangler secret put VAPID_PRIVATE_KEY`。 */
	VAPID_PRIVATE_KEY?: string;
	/** VAPID subject：mailto: 或 https: 联系方式。 */
	VAPID_SUBJECT?: string;
}
