#!/usr/bin/env node
// Deploy to Cloudflare 按钮流程中，用户在 CF 的设置表单里改的项目名不会写回
// wrangler.jsonc，而是通过 WRANGLER_CI_OVERRIDE_NAME 环境变量在部署时覆盖生效的
// Worker 名（Workers Builds, wrangler v3+ 的行为）。但 wrangler.jsonc 里自引用的
// WORKER_SELF_REFERENCE service 绑定是静态字符串，不会跟着同步，于是部署出的
// Worker 名和 service 绑定指向的名字对不上，报 "Service binding ... references
// Worker 'x' which was not found"。这里在部署前把该绑定同步成实际生效的名字。
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../wrangler.jsonc", import.meta.url);
const raw = readFileSync(path, "utf8");

const nameMatch = raw.match(/^\s*"name":\s*"([^"]+)"/m);
if (!nameMatch) {
	console.error("[sync-self-reference] 找不到 wrangler.jsonc 的顶层 name 字段");
	process.exit(1);
}
const effectiveName = process.env.WRANGLER_CI_OVERRIDE_NAME || nameMatch[1];

const pattern = /("binding":\s*"WORKER_SELF_REFERENCE",\s*\n\s*"service":\s*")[^"]*(")/;
if (!pattern.test(raw)) {
	console.error("[sync-self-reference] 找不到 WORKER_SELF_REFERENCE 的 service 绑定");
	process.exit(1);
}
const updated = raw.replace(pattern, `$1${effectiveName}$2`);

if (updated === raw) {
	console.log(`[sync-self-reference] WORKER_SELF_REFERENCE 已是 "${effectiveName}"，无需修改`);
} else {
	writeFileSync(path, updated);
	console.log(`[sync-self-reference] 已将 WORKER_SELF_REFERENCE 同步为 "${effectiveName}"`);
}
