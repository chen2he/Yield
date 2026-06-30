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

export interface FilterControl {
  key: string;
  label: string;
  allLabel: string;
  value: string;
  options: { value: string; label: string }[];
}

// Radix Select 不允许空字符串 value，用哨兵代表「全部」。
const ALL = "__all__";

/**
 * 通用筛选栏（客户端，shadcn Select）。改值即更新 URL query（重置 page），
 * 服务端据 query 重新查询。`current` 为当前全部 query，用于保留其它参数。
 * flex-wrap 让窄屏自动换行，移动端友好。订单页 / 通知页共用。
 */
export function FilterToolbar({
  controls,
  current,
}: {
  controls: FilterControl[];
  current: Record<string, string>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(current);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // 改筛选回到第 1 页
    const query = Object.fromEntries(params.entries());
    startTransition(() => router.push({ pathname, query }));
  }

  return (
    <div className={cn("mb-3 flex flex-wrap items-center gap-2", pending && "opacity-60")}>
      {controls.map((c) => (
        <Select
          key={c.key}
          value={c.value || ALL}
          onValueChange={(v) => setParam(c.key, v === ALL ? "" : v)}
        >
          <SelectTrigger size="sm" aria-label={c.label} className="min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{c.allLabel}</SelectItem>
            {c.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
