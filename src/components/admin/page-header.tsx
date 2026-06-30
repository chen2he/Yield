import type { ReactNode } from "react";

/** 后台每个页面的统一标题区；`right` 可在右侧放操作（如切换器）。 */
export function PageHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

/** 占位空状态卡片，后续接入数据后替换。 */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
