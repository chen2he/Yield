"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * 每页条数切换（5/10/20/50）。改值写入 ?size 并重置 page；
 * 选中默认值时移除 size 参数保持 URL 干净。`current` 用于保留其它 query。
 */
export function PageSizeSelect({
  value,
  sizes,
  defaultSize,
  current,
  label,
}: {
  value: number;
  sizes: readonly number[];
  defaultSize: number;
  current: Record<string, string>;
  label: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(v: string) {
    const params = new URLSearchParams(current);
    if (Number(v) === defaultSize) params.delete("size");
    else params.set("size", v);
    params.delete("page");
    const query = Object.fromEntries(params.entries());
    startTransition(() => router.push({ pathname, query }));
  }

  return (
    <div className={cn("flex items-center gap-1.5", pending && "opacity-60")}>
      <span className="hidden text-xs whitespace-nowrap text-muted-foreground sm:inline">{label}</span>
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger size="sm" aria-label={label} className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sizes.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
