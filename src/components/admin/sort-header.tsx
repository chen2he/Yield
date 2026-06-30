import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * 可排序的列头：点击在 desc/asc 间切换，并把目标字段写入 URL（保留当前筛选、重置页码）。
 * `params` 仅含筛选项（不含 page/sort/dir），换排序时回到第 1 页。
 */
export function SortHeader({
  label,
  field,
  active,
  dir,
  basePath,
  params,
  align,
}: {
  label: string;
  field: string;
  active: boolean;
  dir: "asc" | "desc";
  basePath: string;
  params: Record<string, string>;
  align?: "right";
}) {
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  const query: Record<string, string> = { ...params, sort: field, dir: nextDir };

  return (
    <Link
      href={{ pathname: basePath, query }}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
        align === "right" && "flex-row-reverse",
        active && "text-foreground",
      )}
    >
      <span>{label}</span>
      {active ? (
        dir === "desc" ? (
          <ArrowDown className="size-3.5" />
        ) : (
          <ArrowUp className="size-3.5" />
        )
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-40" />
      )}
    </Link>
  );
}
