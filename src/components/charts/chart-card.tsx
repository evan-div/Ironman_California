import * as React from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type ChartTable = { columns: string[]; rows: (string | number)[][] };

/**
 * Frame for one chart: title, plain-language summary (also read by screen
 * readers), the plot or an empty state, and the same data as a table.
 */
export function ChartCard({
  title,
  description,
  summary,
  table,
  empty,
  emptyTitle = "Not enough data yet",
  emptyText,
  legend,
  className,
  children,
}: {
  title: string;
  description?: string;
  /** One-sentence takeaway computed from the data. */
  summary?: string;
  table?: ChartTable;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  legend?: { label: string; color: string; dashed?: boolean }[];
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <Card className={cn("flex flex-col p-5 sm:p-6", className)}>
      <figure className="flex flex-1 flex-col" aria-labelledby={`${id}-title`} aria-describedby={summary && !empty ? `${id}-summary` : undefined}>
        <figcaption>
          <h2 id={`${id}-title`} className="text-[15px] font-semibold">
            {title}
          </h2>
          {description ? <p className="mt-1 text-[13px] leading-snug text-muted-ink">{description}</p> : null}
        </figcaption>

        {empty ? (
          <EmptyState icon={<BarChart3 />} title={emptyTitle} className="flex-1 justify-center py-10">
            {emptyText}
          </EmptyState>
        ) : (
          <>
            {summary ? (
              <p id={`${id}-summary`} className="tnum mt-3 text-sm text-ink">
                {summary}
              </p>
            ) : null}
            {legend && legend.length > 1 ? (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-ink" aria-label="Legend">
                {legend.map((l) => (
                  <li key={l.label} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn("size-2.5 rounded-[3px]", l.dashed && "border border-dashed bg-transparent")}
                      style={l.dashed ? { borderColor: l.color } : { backgroundColor: l.color }}
                    />
                    {l.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex-1" aria-hidden>
              {children}
            </div>
            {table ? (
              <details className="group mt-3 text-xs">
                <summary className="w-fit rounded text-muted-ink hover:text-ink">View as table</summary>
                <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
                  <table className="tnum w-full text-left">
                    <caption className="sr-only">{title}</caption>
                    <thead className="sticky top-0 bg-muted text-muted-ink">
                      <tr>
                        {table.columns.map((c) => (
                          <th key={c} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r, i) => (
                        <tr key={i} className="border-t border-line">
                          {r.map((cell, j) =>
                            j === 0 ? (
                              <th key={j} scope="row" className="px-3 py-1.5 font-normal whitespace-nowrap">
                                {cell}
                              </th>
                            ) : (
                              <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                                {cell}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </>
        )}
      </figure>
    </Card>
  );
}
