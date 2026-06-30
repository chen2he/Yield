"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** 可点击的表格行：点击导航到带 detail 参数的同页 URL（保留其它 query）。 */
export function ClickableRow({
  query,
  active,
  children,
}: {
  query: Record<string, string>;
  active?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <tr
      onClick={() => router.push({ pathname, query })}
      className={cn(
        "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40",
        active && "bg-accent/60",
      )}
    >
      {children}
    </tr>
  );
}
