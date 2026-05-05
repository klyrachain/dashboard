"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { X } from "lucide-react";
import {
  useGetMerchantCrmCustomersQuery,
  useGetMerchantCustomersQuery,
  useGetMerchantSummaryQuery,
  useGetMerchantTransactionsQuery,
  usePostMerchantCrmCustomerMutation,
} from "@/store/merchant-api";
import type { RootState } from "@/store";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import type { MerchantDerivedCustomerRow } from "@/types/merchant-api";
import { isForbiddenMerchantRole } from "@/lib/merchant-api-error";
import { parsePrice } from "@/lib/merchant-commerce-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)"];

type SortKey = "recent" | "most_orders" | "identifier";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function pickTxField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).length > 0) return String(v);
  }
  return "—";
}

function PayerActivityBody({
  payerTxLoading,
  items,
}: {
  payerTxLoading: boolean;
  items: Record<string, unknown>[];
}) {
  if (payerTxLoading) {
    return <Skeleton className="h-40 w-full shrink-0" />;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transactions matched this search. Try a full identifier match.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((tx, idx) => {
        const id = pickTxField(tx, "id", "_id");
        const status = pickTxField(tx, "status");
        const created = pickTxField(tx, "createdAt", "created_at");
        const type = pickTxField(tx, "type");
        return (
          <li
            key={id !== "—" ? id : String(idx)}
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Transaction
                </p>
                <p className="break-all font-mono text-xs leading-snug text-foreground" title={id}>
                  {id}
                </p>
              </div>
              <div className="shrink-0 sm:pt-5">
                <span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium tabular-nums text-foreground">
                  {status}
                </span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 border-t border-slate-200/80 pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{type}</span>
              <span aria-hidden className="text-slate-300">
                ·
              </span>
              <time className="tabular-nums">{created}</time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function MerchantCustomersClient() {
  const testMode = useSelector((s: RootState) => s.layout.testMode);
  const { effectiveBusinessId, skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();
  const [page] = useState(1);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"payers" | "crm">("payers");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [crmOpen, setCrmOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayer, setSelectedPayer] = useState<MerchantDerivedCustomerRow | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");

  const listParams = useMemo(
    () => ({
      page,
      limit: 200,
      merchantApiScopeKey,
      ...(q.trim() ? { q: q.trim() } : {}),
    }),
    [page, q, merchantApiScopeKey]
  );

  const derived = useGetMerchantCustomersQuery(listParams, {
    skip: skipMerchantApi,
  });
  const crm = useGetMerchantCrmCustomersQuery(listParams, {
    skip: skipMerchantApi,
  });
  const { data: summary } = useGetMerchantSummaryQuery(
    { days: 365, seriesDays: 30, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const [postCrm, { isLoading: crmPosting, error: crmPostErr }] =
    usePostMerchantCrmCustomerMutation();

  const txQueryParams = useMemo(
    () => ({
      page: 1,
      limit: 120,
      merchantApiScopeKey,
      ...(selectedPayer?.identifier ? { q: selectedPayer.identifier } : {}),
    }),
    [selectedPayer, merchantApiScopeKey]
  );

  const payerTx = useGetMerchantTransactionsQuery(txQueryParams, {
    skip: skipMerchantApi || !detailOpen || !selectedPayer?.identifier,
  });

  const derivedForbidden = isForbiddenMerchantRole(derived.error);
  const crmForbidden =
    isForbiddenMerchantRole(crm.error) || isForbiddenMerchantRole(crmPostErr);

  const derivedItems = useMemo(
    () => derived.data?.items ?? [],
    [derived.data?.items]
  );

  const sortedPayers = useMemo(() => {
    const list = [...derivedItems];
    list.sort((a, b) => {
      switch (sortKey) {
        case "most_orders":
          return (b.transactionCount ?? 0) - (a.transactionCount ?? 0);
        case "identifier":
          return a.identifier.localeCompare(b.identifier);
        case "recent":
        default: {
          const ta = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
          const tb = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
          return tb - ta;
        }
      }
    });
    return list;
  }, [derivedItems, sortKey]);

  const newVsReturning = useMemo(() => {
    let firstTime = 0;
    let repeat = 0;
    for (const row of derivedItems) {
      const c = row.transactionCount ?? 0;
      if (c <= 1) firstTime += 1;
      else repeat += 1;
    }
    return [
      { name: "Single purchase", value: firstTime },
      { name: "Repeat", value: repeat },
    ];
  }, [derivedItems]);

  const totalCustomers = derivedItems.length;
  const volume = summary?.transactions?.volumeUsdInPeriod;
  const avgLtv =
    totalCustomers > 0 && volume != null && volume !== ""
      ? parsePrice(volume) / totalCustomers
      : null;

  const payerTxItems = useMemo(
    () =>
      (payerTx.data?.items ?? []).map((tx) =>
        typeof tx === "object" && tx !== null ? (tx as Record<string, unknown>) : {}
      ),
    [payerTx.data?.items]
  );

  const handleAddCrm = async () => {
    if (!email.trim() && !phone.trim()) return;
    try {
      await postCrm({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        displayName: displayName.trim() || undefined,
      }).unwrap();
      setCrmOpen(false);
      setEmail("");
      setPhone("");
      setDisplayName("");
    } catch {
      /* surfaced by base query */
    }
  };

  const openPayerDetail = (row: MerchantDerivedCustomerRow) => {
    setSelectedPayer(row);
    setDetailOpen(true);
  };

  const closePayerDetail = () => {
    setDetailOpen(false);
    setSelectedPayer(null);
  };

  const fieldBorderClass =
    "border border-slate-200 bg-white shadow-sm focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200";

  if (!effectiveBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to view customers.
      </p>
    );
  }

  const payerPanelHeader = (
    <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 pb-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">Payer activity</h2>
        <p className="mt-1.5 break-all font-mono text-xs leading-relaxed text-muted-foreground">
          {selectedPayer?.identifier}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={closePayerDetail}
        aria-label="Close payer activity"
      >
        <X className="size-4" />
      </Button>
    </div>
  );

  const payerPanelBody = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-3 pr-1 [-webkit-overflow-scrolling:touch]">
      <PayerActivityBody payerTxLoading={payerTx.isLoading} items={payerTxItems} />
    </div>
  );

  return (
    <div className="relative">
      <div
        className={cn(
          "flex gap-0 lg:gap-8 xl:gap-10",
          detailOpen && selectedPayer && "lg:items-stretch"
        )}
      >
        <div className="min-w-0 min-h-0 flex-1 space-y-8">
          <section className="grid gap-4 md:grid-cols-3" aria-label="Customer metrics">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total payers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{totalCustomers}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unique customers in this view.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {avgLtv != null && Number.isFinite(avgLtv)
                    ? `$${avgLtv.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "None"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Period volume split across payers. Refines as we add per customer revenue.
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-1">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  New vs repeat
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[140px] pt-2">
                {derived.isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={newVsReturning}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={2}
                      >
                        {newVsReturning.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="cust-q">Search</Label>
              <Input
                id="cust-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Email, phone, or wallet"
                className={cn("w-full min-w-[200px] max-w-[320px] sm:w-[280px]", fieldBorderClass)}
              />
            </div>
            {tab === "payers" ? (
              <div className="space-y-2">
                <Label htmlFor="cust-sort">Sort</Label>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger id="cust-sort" className={cn("w-full min-w-[200px] max-w-[320px] sm:w-[240px]", fieldBorderClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent activity</SelectItem>
                    <SelectItem value="most_orders">Most orders</SelectItem>
                    <SelectItem value="identifier">Identifier A to Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 border-b border-border pb-2">
            <Button
              type="button"
              variant={tab === "payers" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("payers")}
            >
              From checkouts
            </Button>
            <Button
              type="button"
              variant={tab === "crm" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("crm")}
            >
              Saved contacts
            </Button>
          </div>

          {tab === "payers" ? (
            <div className="mt-4">
              {derived.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : derivedForbidden ? (
                <section
                  role="status"
                  className="rounded-md border border-border bg-muted/40 p-4 text-sm"
                >
                  <h2 className="font-medium">Not allowed</h2>
                  <p className="mt-1 text-muted-foreground">
                    You do not have access to derived customer analytics for this environment.
                  </p>
                </section>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Identifier
                        </TableHead>
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Type
                        </TableHead>
                        <TableHead
                          scope="col"
                          className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          Orders
                        </TableHead>
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Last active
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPayers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                            <p>No payers yet for this environment.</p>
                            {testMode ? (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Test mode only lists TEST checkouts. Switch to Live in the header if your payment
                                links were paid in production.
                              </p>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedPayers.map((row, i) => (
                          <TableRow
                            key={`${row.identifier}-${i}`}
                            className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                          >
                            <TableCell className="align-middle">
                              <button
                                type="button"
                                className="max-w-[260px] truncate text-left font-mono text-xs text-primary underline-offset-4 hover:underline"
                                onClick={() => openPayerDetail(row)}
                              >
                                {row.identifier}
                              </button>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.identityType ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums font-medium">
                              {row.transactionCount ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Dialog open={crmOpen} onOpenChange={setCrmOpen}>
                  <DialogTrigger asChild>
                    <Button type="button">Add CRM contact</Button>
                  </DialogTrigger>
                  <DialogContent className="border-none">
                    <DialogHeader>
                      <DialogTitle>New CRM contact</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="crm-email">Email</Label>
                        <Input
                          id="crm-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crm-phone">Phone</Label>
                        <Input id="crm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crm-name">Display name</Label>
                        <Input
                          id="crm-name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCrmOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleAddCrm} disabled={crmPosting}>
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {crm.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : crmForbidden ? (
                <section
                  role="status"
                  className="rounded-md border border-border bg-muted/40 p-4 text-sm"
                >
                  <h2 className="font-medium">Not allowed</h2>
                  <p className="mt-1 text-muted-foreground">
                    Your role may not include CRM access, or this environment is restricted.
                  </p>
                </section>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Name
                        </TableHead>
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Email
                        </TableHead>
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Phone
                        </TableHead>
                        <TableHead scope="col" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(crm.data?.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No CRM records yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (crm.data?.items ?? []).map((row) => (
                          <TableRow
                            key={row.id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                          >
                            <TableCell>{row.displayName ?? "—"}</TableCell>
                            <TableCell className="text-sm">{row.email ?? "—"}</TableCell>
                            <TableCell>{row.phone ?? "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {row.notes ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        {detailOpen && selectedPayer ? (
          <aside
            className="sticky top-4 z-10 hidden flex h-[calc(100vh-5.5rem)] min-h-[360px] w-full min-w-0 max-w-xl shrink-0 flex-col border-l border-slate-200 bg-white pl-5 pr-0 md:flex lg:min-w-[min(440px,38vw)] xl:min-w-[480px] xl:max-w-[520px]"
            aria-label="Payer activity panel"
          >
            {payerPanelHeader}
            {payerPanelBody}
          </aside>
        ) : null}
      </div>

      {detailOpen && selectedPayer ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/45 md:hidden"
            aria-label="Close payer activity"
            onClick={closePayerDetail}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Payer activity"
          >
            <div className="flex shrink-0 flex-col items-center border-b border-slate-100 px-4 pb-2 pt-3">
              <div className="mb-2 h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6 pt-1">
              {payerPanelHeader}
              {payerPanelBody}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
