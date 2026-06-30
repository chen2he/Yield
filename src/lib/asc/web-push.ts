// Web Push 发送：RFC 8291（aes128gcm 载荷加密）+ RFC 8292（VAPID 鉴权），纯 WebCrypto。
// 可直接在 Cloudflare Worker 运行，无 Node crypto 依赖。

export interface PushSubscriptionRecord {
	endpoint: string;
	p256dh: string; // base64url，UA 公钥（65 字节未压缩点）
	auth: string; // base64url，auth secret（16 字节）
}

export interface VapidKeys {
	publicKey: string; // base64url，65 字节未压缩点
	privateKey: string; // base64url，私钥标量 d（32 字节）
	subject: string; // mailto: 或 https:
}

export interface WebPushResult {
	endpoint: string;
	statusCode: number;
	ok: boolean;
}

const td = new TextEncoder();

// WebCrypto / fetch 需要 ArrayBuffer 背书的视图，故所有字节统一为 Uint8Array<ArrayBuffer>。
function utf8(s: string): Uint8Array<ArrayBuffer> {
	return new Uint8Array(td.encode(s));
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
	const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
	const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function bytesToB64url(bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrs: Uint8Array[]): Uint8Array<ArrayBuffer> {
	const len = arrs.reduce((n, a) => n + a.length, 0);
	const out = new Uint8Array(len);
	let off = 0;
	for (const a of arrs) {
		out.set(a, off);
		off += a.length;
	}
	return out;
}

/** HKDF-Expand(HKDF-Extract(salt, ikm), info, length)。WebCrypto HKDF 一步完成 extract+expand。 */
async function hkdf(
	salt: Uint8Array<ArrayBuffer>,
	ikm: Uint8Array<ArrayBuffer>,
	info: Uint8Array<ArrayBuffer>,
	length: number,
): Promise<Uint8Array<ArrayBuffer>> {
	const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
	return new Uint8Array(bits);
}

async function importVapidPrivateKey(vapid: VapidKeys): Promise<CryptoKey> {
	const pub = b64urlToBytes(vapid.publicKey); // 0x04 || X(32) || Y(32)
	const jwk: JsonWebKey = {
		kty: "EC",
		crv: "P-256",
		d: vapid.privateKey,
		x: bytesToB64url(pub.slice(1, 33)),
		y: bytesToB64url(pub.slice(33, 65)),
		ext: true,
	};
	return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

/** VAPID Authorization 头：`vapid t=<ES256 JWT>, k=<公钥 base64url>`。 */
async function vapidAuthHeader(endpoint: string, vapid: VapidKeys): Promise<string> {
	const { protocol, host } = new URL(endpoint);
	const header = bytesToB64url(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
	const payload = bytesToB64url(
		utf8(
			JSON.stringify({
				aud: `${protocol}//${host}`,
				exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
				sub: vapid.subject,
			}),
		),
	);
	const signingInput = `${header}.${payload}`;
	const key = await importVapidPrivateKey(vapid);
	const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(signingInput)));
	return `vapid t=${signingInput}.${bytesToB64url(sig)}, k=${vapid.publicKey}`;
}

/** 用订阅的 p256dh/auth 加密载荷，输出 aes128gcm 内容编码的 body。 */
async function encryptPayload(
	sub: PushSubscriptionRecord,
	plaintext: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
	const uaPublic = b64urlToBytes(sub.p256dh); // 65
	const authSecret = b64urlToBytes(sub.auth); // 16

	const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
	const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey)); // 65
	const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
	const ecdhSecret = new Uint8Array(
		await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, serverKeys.privateKey, 256),
	); // 32

	// RFC 8291：IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info"\0 || ua_pub || as_pub, 32)
	const keyInfo = concat(utf8("WebPush: info"), new Uint8Array([0]), uaPublic, asPublic);
	const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

	// RFC 8188：salt 随机，CEK/nonce 从 IKM 派生。
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const cek = await hkdf(salt, ikm, concat(utf8("Content-Encoding: aes128gcm"), new Uint8Array([0])), 16);
	const nonce = await hkdf(salt, ikm, concat(utf8("Content-Encoding: nonce"), new Uint8Array([0])), 12);

	// 单条记录：明文末尾追加分隔符 0x02。
	const record = concat(plaintext, new Uint8Array([2]));
	const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, record),
	);

	// header: salt(16) || rs(4, BE) || idlen(1) || keyid(as_pub 65) || ciphertext
	const head = new Uint8Array(16 + 4 + 1 + asPublic.length);
	head.set(salt, 0);
	new DataView(head.buffer).setUint32(16, 4096, false);
	head[20] = asPublic.length;
	head.set(asPublic, 21);
	return concat(head, ciphertext);
}

/** 向单个订阅发送一条 Web Push。返回状态码（404/410 表示订阅失效，应删除）。 */
export async function sendWebPush(
	sub: PushSubscriptionRecord,
	payload: string,
	vapid: VapidKeys,
	ttlSeconds = 2419200,
): Promise<WebPushResult> {
	const body = await encryptPayload(sub, utf8(payload));
	const authorization = await vapidAuthHeader(sub.endpoint, vapid);
	const res = await fetch(sub.endpoint, {
		method: "POST",
		headers: {
			"Content-Encoding": "aes128gcm",
			"Content-Type": "application/octet-stream",
			TTL: String(ttlSeconds),
			Authorization: authorization,
		},
		body,
		signal: AbortSignal.timeout(10000),
	});
	return { endpoint: sub.endpoint, statusCode: res.status, ok: res.ok };
}
