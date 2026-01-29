"use client";

import { useGetInventoryQuery } from "@/store/inventory-api";
import { AtAGlanceCards } from "@/components/dashboard/at-a-glance-cards";
import { DashboardInventoryCharts } from "@/components/dashboard/dashboard-inventory-charts";
import type { AtAGlanceCard } from "@/lib/data-stripe-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

function atAGlanceFromAssets(
  assets: { chain: string; token: string; balance: string }[]
): AtAGlanceCard[] {
  if (assets.length === 0) return [];

  const total = assets.reduce((sum, a) => {
    const n = Number.parseFloat(a.balance.replace(/,/g, ""));
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);

  const chains = new Set(assets.map((a) => a.chain.toUpperCase())).size;

  const byToken = new Map<string, number>();
  for (const a of assets) {
    const n = Number.parseFloat(a.balance.replace(/,/g, ""));
    const v = Number.isNaN(n) ? 0 : n;
    byToken.set(a.token, (byToken.get(a.token) ?? 0) + v);
  }

  const totalFormatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(total);

  const cards: AtAGlanceCard[] = [
    {
      title: "Total balance",
      value: totalFormatted,
      sub: "Across all chains",
      action: { label: "View", href: "/inventory" },
    },
    {
      title: "Assets",
      value: String(assets.length),
      sub: `${byToken.size} token(s) · ${chains} chain(s)`,
    },
    {
      title: "Chains",
      value: String(chains),
      sub: chains > 0 ? "With liquidity" : "No data",
    },
  ];

  return cards;
}

export function DashboardInventoryAndGlance() {
  const { data: assets = [], isLoading } = useGetInventoryQuery();

  const atAGlanceCards = atAGlanceFromAssets(assets);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <section>
          <Skeleton className="mb-4 h-4 w-24" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </section>
        <Skeleton className="h-[360px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          At a glance
        </h2>
        <AtAGlanceCards cards={atAGlanceCards} />
      </section>

      <DashboardInventoryCharts
        initialAssets={assets}
        historyPoints={[]}
      />
    </div>
  );
}
