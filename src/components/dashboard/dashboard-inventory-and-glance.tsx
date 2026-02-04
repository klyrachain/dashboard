"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useGetInventoryQuery } from "@/store/inventory-api";
import { selectBaseCurrency } from "@/store/preferences-slice";
import { AtAGlanceCards } from "@/components/dashboard/at-a-glance-cards";
import { DashboardPlatformOverview } from "@/components/dashboard/dashboard-platform-overview";
import { DashboardInventoryCharts } from "@/components/dashboard/dashboard-inventory-charts";
import type { AtAGlanceCard } from "@/lib/data-stripe-dashboard";
import type { PlatformOverview } from "@/lib/data-platform";
import {
  QUOTE_CURRENCIES,
  type QuoteCurrency,
  type RatesMap,
} from "@/lib/token-rates";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function assetKey(chain: string, token: string): string {
  return `${(chain ?? "").trim().toLowerCase()}:${(token ?? "").trim().toUpperCase()}`;
}

const CURRENCY_DISPLAY: Record<QuoteCurrency, string> = {
  usd: "USD",
  usdc: "USDC",
  ghs: "GHS",
};

function atAGlanceFromAssets(
  assets: { chain: string; token: string; balance: string }[],
  ratesMap: RatesMap | null,
  quote: QuoteCurrency
): AtAGlanceCard[] {
  if (assets.length === 0) return [];

  let totalInQuote = 0;
  let excludedCount = 0;
  if (ratesMap) {
    for (const a of assets) {
      const n = Number.parseFloat(a.balance.replace(/,/g, ""));
      const amount = Number.isNaN(n) ? 0 : n;
      const key = assetKey(a.chain, a.token);
      const rates = ratesMap[key];
      const rate = rates?.[quote] ?? 0;
      if (rate > 0) {
        totalInQuote += amount * rate;
      } else if (amount > 0) {
        excludedCount += 1;
      }
    }
  }

  const currencyCode = CURRENCY_DISPLAY[quote];
  const totalFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode === "USDC" ? "USD" : currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalInQuote);
  const totalDisplay =
    quote === "usdc" ? `${totalFormatted} (USDC)` : totalFormatted;

  const totalSub =
    excludedCount > 0
      ? `Across all chains · ${excludedCount} asset(s) excluded (rate unavailable)`
      : "Across all chains";

  const chains = new Set(assets.map((a) => a.chain.toUpperCase())).size;
  const byToken = new Map<string, number>();
  for (const a of assets) {
    const n = Number.parseFloat(a.balance.replace(/,/g, ""));
    const v = Number.isNaN(n) ? 0 : n;
    byToken.set(a.token, (byToken.get(a.token) ?? 0) + v);
  }

  const cards: AtAGlanceCard[] = [
    {
      title: "Total balance",
      value: totalDisplay,
      sub: totalSub,
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

type DashboardInventoryAndGlanceProps = {
  platformOverview?: PlatformOverview | null;
  platformOverviewError?: string | null;
};

export function DashboardInventoryAndGlance({
  platformOverview = null,
  platformOverviewError = null,
}: DashboardInventoryAndGlanceProps) {
  const { data: assets = [], isLoading } = useGetInventoryQuery();
  const platformBase = useSelector(selectBaseCurrency);
  const [quote, setQuote] = useState<QuoteCurrency>(platformBase);
  const [ratesMap, setRatesMap] = useState<RatesMap | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    setQuote(platformBase);
  }, [platformBase]);

  const fetchRatesForAssets = useCallback(async () => {
    if (assets.length === 0) {
      setRatesMap(null);
      return;
    }
    setRatesLoading(true);
    try {
      const assetsParam = encodeURIComponent(
        JSON.stringify(assets.map((a) => ({ chain: a.chain, token: a.token })))
      );
      const res = await fetch(
        `/api/rates?assets=${assetsParam}&vs=usd,usdc,ghs`
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: RatesMap;
      };
      if (json.success && json.data) setRatesMap(json.data);
      else setRatesMap(null);
    } catch {
      setRatesMap(null);
    } finally {
      setRatesLoading(false);
    }
  }, [assets]);

  useEffect(() => {
    fetchRatesForAssets();
  }, [fetchRatesForAssets]);

  const atAGlanceCards = atAGlanceFromAssets(assets, ratesMap, quote);

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-slate-500">At a glance</h2>
          <Select
            value={quote}
            onValueChange={(v) => setQuote(v as QuoteCurrency)}
          >
            <SelectTrigger className="h-9 w-34">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {QUOTE_CURRENCIES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {ratesLoading && assets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : (
          <AtAGlanceCards cards={atAGlanceCards} />
        )}
        <br />
        <DashboardPlatformOverview
          data={platformOverview}
          error={platformOverviewError}
          pairsOnly
        />
      </section>

      <DashboardInventoryCharts
        initialAssets={assets}
        historyPoints={[]}
      />
    </div>
  );
}
