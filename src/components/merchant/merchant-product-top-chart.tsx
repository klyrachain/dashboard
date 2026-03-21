"use client";

type BarItem = { id: string; label: string; count: number; revenueHint: number };

/**
 * Horizontal bar chart for top products by purchase count (proxy for revenue when
 * per-product revenue is not on the API).
 */
export function MerchantProductTopChart({
  items,
  maxBars = 5,
}: {
  items: BarItem[];
  maxBars?: number;
}) {
  const sorted = [...items]
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxBars);
  const max = sorted.length > 0 ? Math.max(...sorted.map((i) => i.count), 1) : 1;

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground"
        role="status"
      >
        No purchase data with product IDs yet. Sales appear when transactions
        reference a product.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Top {sorted.length} by completed line items (transactions with{" "}
        <span className="font-mono">productId</span>).
      </p>
      <ul className="space-y-2">
        {sorted.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <span
              className="w-32 shrink-0 truncate text-xs font-medium text-foreground"
              title={row.label}
            >
              {row.label}
            </span>
            <div className="h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full rounded-md bg-primary/80 transition-[width]"
                style={{ width: `${Math.round((row.count / max) * 100)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
