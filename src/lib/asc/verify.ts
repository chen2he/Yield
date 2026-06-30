// App Store Server Notifications V2 的签名校验。
//
// signedPayload 是一段 ES256 JWS，protected header 带 x5c 证书链
// [叶子, 中间证书, Apple Root CA G3]。校验分两层：
//   1) 证书链：cert[i] 由 cert[i+1] 签发，链尾 pin 到内置的 Apple Root CA G3
//      （DER 精确比对，绝不信任 x5c 自带的根）；并校验签名时点落在各证书有效期内。
//   2) JWS：用叶子证书公钥验签，取出 payload。
// 内层 signedTransactionInfo / signedRenewalInfo 也是同构 JWS，复用同一套校验。
//
// 纯 WebCrypto（jose + @peculiar/x509），无 node:crypto 依赖，Workers 边缘可用。

import { cryptoProvider, X509Certificate } from "@peculiar/x509";
import { compactVerify, decodeProtectedHeader } from "jose";
import { APPLE_ROOT_CA_G3_PEM } from "./apple-root-ca";
import type {
	DecodedNotification,
	DecodedNotificationPayload,
	RenewalInfo,
	TransactionInfo,
} from "./types";

export class NotificationVerifyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotificationVerifyError";
	}
}

let cryptoReady = false;
function ensureCrypto(): void {
	if (cryptoReady) return;
	cryptoProvider.set(globalThis.crypto as Crypto);
	cryptoReady = true;
}

let pinnedRoot: X509Certificate | undefined;
function applePinnedRoot(): X509Certificate {
	pinnedRoot ??= new X509Certificate(APPLE_ROOT_CA_G3_PEM);
	return pinnedRoot;
}

/** x5c 是裸 base64 DER；包成 PEM 交给 X509Certificate。 */
function derBase64ToPem(b64: string): string {
	const body = b64.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? b64;
	return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
}

/** 常数时间 DER 等值比对（证书 pin 用） */
function sameDer(a: X509Certificate, b: X509Certificate): boolean {
	const x = new Uint8Array(a.rawData);
	const y = new Uint8Array(b.rawData);
	if (x.length !== y.length) return false;
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
}

export interface VerifyOptions {
	/** 测试可注入自定义可信根；默认 pin 到 Apple Root CA G3。 */
	trustedRoot?: X509Certificate;
}

/** 校验并解码一段 x5c-signed JWS（外层通知 / 内层交易 / 内层续订通用）。 */
export async function verifyAndDecodeJws<T>(jws: string, opts: VerifyOptions = {}): Promise<T> {
	ensureCrypto();

	let header: ReturnType<typeof decodeProtectedHeader>;
	try {
		header = decodeProtectedHeader(jws);
	} catch {
		throw new NotificationVerifyError("无法解析 JWS header");
	}
	if (header.alg !== "ES256") {
		throw new NotificationVerifyError(`不支持的签名算法：${String(header.alg)}`);
	}
	const x5c = header.x5c;
	if (!Array.isArray(x5c) || x5c.length < 2) {
		throw new NotificationVerifyError("JWS header 缺少有效的 x5c 证书链");
	}

	let certs: X509Certificate[];
	try {
		certs = x5c.map((b64) => new X509Certificate(derBase64ToPem(b64)));
	} catch {
		throw new NotificationVerifyError("x5c 证书解析失败");
	}
	const root = opts.trustedRoot ?? applePinnedRoot();

	// 1) 链路签名：cert[i] 由 cert[i+1] 签发
	for (let i = 0; i < certs.length - 1; i++) {
		const ok = await certs[i].verify({ publicKey: certs[i + 1].publicKey, signatureOnly: true });
		if (!ok) throw new NotificationVerifyError(`证书链第 ${i} 段签名校验失败`);
	}
	// 2) 根 pin：链尾必须等于、或由可信根签发
	const top = certs[certs.length - 1];
	if (!sameDer(top, root)) {
		const ok = await top.verify({ publicKey: root.publicKey, signatureOnly: true });
		if (!ok) throw new NotificationVerifyError("证书链未锚定到 Apple Root CA G3");
	}

	// 3) 用叶子公钥验 JWS 签名并取 payload
	const leafKey = await certs[0].publicKey.export({ name: "ECDSA", namedCurve: "P-256" }, ["verify"]);
	let payloadBytes: Uint8Array;
	try {
		({ payload: payloadBytes } = await compactVerify(jws, leafKey, { algorithms: ["ES256"] }));
	} catch {
		throw new NotificationVerifyError("JWS 签名校验失败");
	}

	let decoded: T;
	try {
		decoded = JSON.parse(new TextDecoder().decode(payloadBytes)) as T;
	} catch {
		throw new NotificationVerifyError("JWS payload 不是合法 JSON");
	}

	// 4) 用 payload.signedDate 校验证书有效期
	const signedDate = (decoded as { signedDate?: number }).signedDate;
	if (typeof signedDate === "number" && Number.isFinite(signedDate)) {
		const at = new Date(signedDate);
		for (const cert of certs) {
			if (at < cert.notBefore || at > cert.notAfter) {
				throw new NotificationVerifyError("证书在签名时点不在有效期内");
			}
		}
	}

	return decoded;
}

/** 校验整条通知：外层 payload + 内层交易 / 续订都验签解出。 */
export async function verifyNotification(
	signedPayload: string,
	opts: VerifyOptions = {},
): Promise<DecodedNotification> {
	const payload = await verifyAndDecodeJws<DecodedNotificationPayload>(signedPayload, opts);

	let transaction: TransactionInfo | undefined;
	let renewal: RenewalInfo | undefined;
	const data = payload.data;
	if (data?.signedTransactionInfo) {
		transaction = await verifyAndDecodeJws<TransactionInfo>(data.signedTransactionInfo, opts);
	}
	if (data?.signedRenewalInfo) {
		renewal = await verifyAndDecodeJws<RenewalInfo>(data.signedRenewalInfo, opts);
	}

	return { payload, transaction, renewal };
}
