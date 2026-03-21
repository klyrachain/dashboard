"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Copy, Plus, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useGetMerchantPayPagesQuery,
  useGetMerchantProductsQuery,
  useGetMerchantSummaryQuery,
  useGetMerchantTransactionsQuery,
  usePatchMerchantPayPageMutation,
  usePostMerchantPayPageMutation,
} from "@/store/merchant-api";
import type { RootState } from "@/store";
import type { MerchantPayPageRow } from "@/types/merchant-api";
import { isForbiddenMerchantRole } from "@/lib/merchant-api-error";
import {
  buildPaymentLinkPublicUrl,
  getPaymentLinkBaseUrl,
} from "@/lib/merchant-commerce-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function slugifyHint(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isOpenAmount(row: MerchantPayPageRow): boolean {
  const a = row.amount;
  if (a == null || a === "") return true;
  const n = parseFloat(String(a));
  return !Number.isFinite(n) || n <= 0;
}

type StatusFilter = "all" | "active" | "inactive";
type AmountFilter = "all" | "fixed" | "open";

export function MerchantPaymentLinksClient() {
  const searchParams = useSearchParams();
  const activeBusinessId = useSelector(
    (s: RootState) => s.merchantSession.activeBusinessId
  );

  const [page] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [amount, setAmount] = useState("");
  const [openAmount, setOpenAmount] = useState(false);
  const [productId, setProductId] = useState<string | undefined>(undefined);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrTitle, setQrTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 100,
      ...(q.trim() ? { q: q.trim() } : {}),
    }),
    [page, q]
  );

  const { data, isLoading, isError, error, refetch } = useGetMerchantPayPagesQuery(
    params,
    { skip: !activeBusinessId }
  );
  const { data: productsData } = useGetMerchantProductsQuery(
    { page: 1, limit: 200, includeArchived: 1 },
    { skip: !activeBusinessId }
  );
  const { data: summary } = useGetMerchantSummaryQuery(
    { days: 30, seriesDays: 7 },
    { skip: !activeBusinessId }
  );
  const { data: txData } = useGetMerchantTransactionsQuery(
    { page: 1, limit: 200 },
    { skip: !activeBusinessId }
  );

  const [postLink, { isLoading: posting, error: postErr }] =
    usePostMerchantPayPageMutation();
  const [patchLink] = usePatchMerchantPayPageMutation();

  const productNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of productsData?.items ?? []) {
      m.set(p.id, p.name);
    }
    return m;
  }, [productsData?.items]);

  useEffect(() => {
    const pid = searchParams.get("productId")?.trim();
    const pname = searchParams.get("productName")?.trim();
    if (pid) {
      setProductId(pid);
      setOpen(true);
      if (pname) setTitle(pname);
    }
  }, [searchParams]);

  const rows = data?.items ?? [];

  const filteredRows = useMemo(() => {
    let list = [...rows];
    if (statusFilter === "active") list = list.filter((r) => r.isActive !== false);
    if (statusFilter === "inactive") list = list.filter((r) => r.isActive === false);
    if (amountFilter === "fixed") list = list.filter((r) => !isOpenAmount(r));
    if (amountFilter === "open") list = list.filter((r) => isOpenAmount(r));
    return list;
  }, [rows, statusFilter, amountFilter]);

  const forbidden =
    isForbiddenMerchantRole(error) || isForbiddenMerchantRole(postErr);

  const completedInPeriod = summary?.transactions?.completedCountInPeriod;
  const volume30 = summary?.transactions?.volumeUsdInPeriod;
  const linkCount = rows.length;

  const txWithLink = useMemo(() => {
    return (txData?.items ?? []).filter((t) => {
      const pl =
        t.paymentLinkId ?? t.payment_link_id ?? t.payPageId ?? t.pay_page_id;
      return pl != null && String(pl).length > 0;
    }).length;
  }, [txData?.items]);

  const conversionHint =
    linkCount > 0 && txWithLink >= 0
      ? `${Math.min(100, Math.round((txWithLink / Math.max(linkCount, 1)) * 100))}%`
      : "None";

  const handleCreate = async () => {
    if (!title.trim() || !slug.trim()) return;
    const base: Parameters<typeof postLink>[0] = {
      title: title.trim(),
      slug: slugifyHint(slug) || slugifyHint(title),
      currency: "USD",
      isActive: true,
      ...(productId ? { productId } : {}),
    };
    if (!openAmount) {
      const a = parseFloat(amount);
      if (Number.isNaN(a) || a < 0) return;
      base.amount = a;
    }
    try {
      await postLink(base).unwrap();
      setOpen(false);
      setTitle("");
      setSlug("");
      setAmount("");
      setOpenAmount(false);
      setProductId(undefined);
    } catch {
      /* base query */
    }
  };

  const toggle = async (row: MerchantPayPageRow) => {
    await patchLink({
      id: row.id,
      patch: { isActive: !row.isActive },
    }).unwrap();
  };

  const copyUrl = useCallback(async (row: MerchantPayPageRow) => {
    const url = buildPaymentLinkPublicUrl(row.slug);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(row.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const showQr = (row: MerchantPayPageRow) => {
    const url = buildPaymentLinkPublicUrl(row.slug);
    setQrUrl(url);
    setQrTitle(row.title);
    setQrOpen(true);
  };

  if (!activeBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to manage payment links.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 max-w-md" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError && !forbidden) {
    return (
      <section
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
      >
        <h2 className="font-medium text-destructive">Could not load payment links</h2>
        <p className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </p>
      </section>
    );
  }

  if (forbidden) {
    return (
      <section
        role="status"
        className="rounded-md border border-border bg-muted/40 p-4 text-sm"
      >
        <h2 className="font-medium">Not allowed</h2>
        <p className="mt-1 text-muted-foreground">
          Your role does not include payment links for this environment.
        </p>
      </section>
    );
  }

  const baseDisplay = getPaymentLinkBaseUrl() || "Not set";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2" aria-label="Payment link metrics">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Volume (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {volume30 != null && volume30 !== ""
                ? `$${Number(volume30).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : "None"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your overall sales in this window, not link traffic only.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Links in use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{conversionHint}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share of transactions that reference a link ({txWithLink} of{" "}
              {linkCount} links). Add view tracking later for full funnel data.
            </p>
            {completedInPeriod != null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Completed txs in period: {completedInPeriod}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Public checkout base: <span className="font-mono">{baseDisplay}</span>.
        Set <span className="font-mono">NEXT_PUBLIC_PAYMENT_LINK_BASE_URL</span> for
        your live domain.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="pl-q">Search</Label>
          <Input
            id="pl-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or slug"
            className="w-[220px]"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount type</Label>
          <Select
            value={amountFilter}
            onValueChange={(v) => setAmountFilter(v as AmountFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="fixed">Fixed price</SelectItem>
              <SelectItem value="open">Open / customer decides</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="gap-2 ml-auto">
              <Plus className="size-4" aria-hidden />
              New link
            </Button>
          </DialogTrigger>
          <DialogContent className="border-none">
            <DialogHeader>
              <DialogTitle>Create payment link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              {productId ? (
                <p className="text-sm text-muted-foreground">
                  Prefilled product ID:{" "}
                  <span className="font-mono text-xs">{productId}</span>
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="pl-title">Title</Label>
                <Input
                  id="pl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pl-slug">Slug (a-z, 0-9, hyphens)</Label>
                <Input
                  id="pl-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="consulting-hour"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pl-open"
                  checked={openAmount}
                  onChange={(e) => setOpenAmount(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="pl-open">Open amount (customer enters)</Label>
              </div>
              {!openAmount ? (
                <div className="space-y-2">
                  <Label htmlFor="pl-amt">Amount</Label>
                  <Input
                    id="pl-amt"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={posting}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Title</TableHead>
              <TableHead scope="col">Checkout URL</TableHead>
              <TableHead scope="col">Linked product</TableHead>
              <TableHead scope="col" className="text-right">
                Amount
              </TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No payment links match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const url = buildPaymentLinkPublicUrl(row.slug);
                const pid = row.productId ?? undefined;
                const pname = pid ? productNameById.get(pid) : undefined;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <span className="break-all font-mono text-xs text-muted-foreground">
                        {url || row.slug}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {pid ? (
                        <span title={pid}>{pname ?? pid.slice(0, 8) + "…"}</span>
                      ) : (
                        <span className="text-muted-foreground">Open amount</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {isOpenAmount(row) ? (
                        <span className="text-muted-foreground">Customer decides</span>
                      ) : (
                        <>
                          {row.amount} {row.currency ?? ""}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive !== false ? "success" : "secondary"}>
                        {row.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => copyUrl(row)}
                        >
                          <Copy className="size-3.5" aria-hidden />
                          {copiedId === row.id ? "Copied" : "Copy link"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => showQr(row)}
                          disabled={!url}
                        >
                          <QrCode className="size-3.5" aria-hidden />
                          QR
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle(row)}
                        >
                          {row.isActive !== false ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR code — {qrTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrUrl ? (
              <QRCodeSVG value={qrUrl} size={200} level="M" />
            ) : null}
            <p className="break-all text-center text-xs text-muted-foreground font-mono">
              {qrUrl}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
