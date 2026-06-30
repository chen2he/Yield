"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** 亮 / 暗 / 跟随系统 切换（next-themes）——顶栏下拉按钮。图标随 .dark 类用 CSS 切换，无需 mounted 守卫。 */
export function ModeToggle() {
	const { setTheme } = useTheme();
	const t = useTranslations("theme");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" className="relative">
					<Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">{t("appearance")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>{t("light")}</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>{t("dark")}</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>{t("system")}</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
