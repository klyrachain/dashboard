"use client";

import { useGetMerchantTransactionsQuery } from "@/store/validation-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsMerchantRtkPanel() {
  const { data, isLoading, isError, error } = useGetMerchantTransactionsQuery({});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const msg =
      error && typeof error === "object" && "status" in error
        ? `Unable to load transactions (${String((error as { status: unknown }).status)}).`
        : "Unable to load transactions. Check your portal session and API.";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-800" role="alert">
            {msg} Ensure you are signed in and <code className="text-xs">/api/v1/merchant/transactions</code> is
            available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const payload = data?.data;
  const rows = Array.isArray(payload) ? payload : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your transactions</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Sourced from <span className="font-mono text-xs">GET /api/v1/merchant/transactions</span>
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No transactions yet.</p>
        ) : (
          <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(rows, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
