import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-8 text-center", className)}>
      {icon ? <div className="mb-3 grid size-10 place-items-center rounded-full bg-sage/70 text-forest [&_svg]:size-[18px]">{icon}</div> : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {children ? <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-ink">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
