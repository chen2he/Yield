import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "muted" | "positive" | "negative" | "info";

const TONES: Record<BadgeTone, string> = {
  muted: "bg-muted text-muted-foreground",
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  negative: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
};

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
