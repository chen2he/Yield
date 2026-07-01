"use server";

import { revalidatePath } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";

const ONBOARDING_PATH = "/[locale]/admin/onboarding";

/** 标记引导流程已完成，跳转到概览页（locale 感知）。 */
export async function completeOnboarding(locale: string): Promise<void> {
	const db = await getDb();
	await db
		.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
		.bind("onboarding_completed", "1")
		.run();
	revalidatePath(ONBOARDING_PATH, "page");
	redirect(getPathname({ href: "/admin", locale }));
}
