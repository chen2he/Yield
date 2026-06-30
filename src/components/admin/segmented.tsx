"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * URL 驱动的分段切换器。选中 `defaultValue` 时移除参数（保持 URL 干净），
 * 否则写入 `?<paramKey>=<value>`；保留其它 query。环境 / 时间范围切换共用。
 */
export function Segmented({
  paramKey,
  value,
  defaultValue,
  options,
  current,
}: {
  paramKey: string;
  value: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  current: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function set(v: string) {
    const params = new URLSearchParams(current);
    if (v === defaultValue) params.delete(paramKey);
    else params.set(paramKey, v);
    startTransition(() => router.push({ pathname, query: Object.fromEntries(params.entries()) }));
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5",
        pending && "opacity-60",
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => set(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
