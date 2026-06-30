import type { ReactNode } from "react";

/** 详情面板里的一行「标签 — 值」。 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm">{children}</div>
    </div>
  );
}

/** 详情面板里的小节标题。 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  );
}
