"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * URL 驱动的详情容器：移动端用底部 Drawer，桌面端用右侧 Sheet。
 * 父级仅在 detail 参数存在时渲染，故恒为 open；关闭即导航到去掉 detail 的 URL。
 * 挂载前返回 null，避免 useIsMobile 未定型时 Sheet→Drawer 抖动。
 */
export function DetailSheet({
	title,
	closeQuery,
	children,
}: {
	title: string;
	closeQuery: Record<string, string>;
	children: ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const onOpenChange = (open: boolean) => {
		if (!open) router.push({ pathname, query: closeQuery });
	};

	if (!mounted) return null;

	if (isMobile) {
		return (
			<Drawer open onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{title}</DrawerTitle>
					</DrawerHeader>
					<div className="min-h-0 overflow-y-auto px-4 pb-6">{children}</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Sheet open onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>
				<div className="px-4 pb-6">{children}</div>
			</SheetContent>
		</Sheet>
	);
}
