import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * 底部分页条：左侧每页条数切换（sizeSelect）+ 页码信息，右侧上一页 / 下一页。
 * 基于 next-intl Link，自动保留语言前缀；`params` 为当前筛选 / 排序 / size，翻页时一并带上。
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  label,
  params = {},
  sizeSelect,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  label: string;
  params?: Record<string, string>;
  sizeSelect?: ReactNode;
}) {
  if (totalPages <= 1 && !sizeSelect) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  const prevQuery = { ...params, ...(prev > 1 ? { page: String(prev) } : {}) };
  const nextQuery = { ...params, page: String(next) };

  const base =
    "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  const disabled = "pointer-events-none opacity-40";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {sizeSelect}
        <span className="text-xs text-muted-foreground tabular-nums">{label}</span>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1.5">
          <Link
            href={{ pathname: basePath, query: prevQuery }}
            aria-disabled={atStart}
            className={cn(base, atStart && disabled)}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={{ pathname: basePath, query: nextQuery }}
            aria-disabled={atEnd}
            className={cn(base, atEnd && disabled)}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
