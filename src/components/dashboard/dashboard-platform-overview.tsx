"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data-balances";
import type { PlatformOverview } from "@/lib/data-platform";

type DashboardPlatformOverviewProps = {
  data: PlatformOverview | null;
  error?: string | null;
};

export function DashboardPlatformOverview({ data, error }: DashboardPlatformOverviewProps) {
  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <p className="text-sm text-amber-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const hasFeesByCurrency =
    Object.keys(data.feesByCurrency).length > 0 &&
    Object.values(data.feesByCurrency).some((v) => v != null && String(v).trim() !== "");

  return (
    <div className="space-y-6">
      {/* Platform-wide KPIs */}
      <div>
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Platform overview (all transactions)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-slate-500">Completed transactions</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {data.completedTransactionCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-slate-500">Completed with fee</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {data.completedWithFeeCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-slate-500">Total fees (converted)</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {formatCurrency(data.totalConverted)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform fee container: fees by currency */}
      {hasFeesByCurrency && (
        <Card className="bg-white">
          <CardHeader>
            <p className="text-sm font-medium text-slate-700">Fees by currency</p>
            <p className="text-xs text-slate-500">
              Accumulated platform fees per token (all completed transactions)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(data.feesByCurrency)
                .filter(([, v]) => v != null && String(v).trim() !== "")
                .map(([currency, amount]) => (
                  <div
                    key={currency}
                    className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <span className="font-mono text-sm font-medium text-slate-700">{currency}</span>
                    <span className="tabular-nums text-sm text-slate-900">{amount}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
