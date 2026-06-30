"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// 各语言以本族名展示（autonym），与界面语言无关。
const NAMES: Record<string, string> = { en: "English", "zh-Hans": "简体中文" };

/** 界面语言切换——顶栏下拉按钮；保留当前路径，仅替换 locale。 */
export function LocaleToggle() {
	const t = useTranslations("language");
	const active = useLocale();
	const pathname = usePathname();
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" disabled={pending}>
					<Languages className="size-[1.2rem]" />
					<span className="sr-only">{t("label")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{routing.locales.map((l) => (
					<DropdownMenuItem
						key={l}
						disabled={l === active}
						onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
					>
						{NAMES[l] ?? l}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
