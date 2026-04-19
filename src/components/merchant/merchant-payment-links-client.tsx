"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useGetCheckoutBaseUrlQuery,
  useGetMerchantGasAccountQuery,
  useGetMerchantPayPagesQuery,
  useGetMerchantProductsQuery,
  useGetMerchantSummaryQuery,
  usePatchMerchantPayPageMutation,
  usePostMerchantFiatQuoteMutation,
  usePostMerchantPayPageMutation,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import type { MerchantPayPageRow } from "@/types/merchant-api";
import {
  formatMerchantApiFetchError,
  isForbiddenMerchantRole,
} from "@/lib/merchant-api-error";
import { buildPaymentLinkPublicUrl } from "@/lib/merchant-commerce-helpers";
import { PaymentLinkCurrencyPicker } from "@/components/merchant/payment-link-currency-picker";
import {
  ActionTooltip,
  actionTooltipContentClassName,
} from "@/components/ui/ActionTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePaginationBar } from "@/components/ui/data-table-pagination-bar";

function isOpenAmount(row: MerchantPayPageRow): boolean {
  const a = row.amount;
  if (a == null || a === "") return true;
  const n = parseFloat(String(a));
  return !Number.isFinite(n) || n <= 0;
}

type StatusFilter = "all" | "active" | "inactive";
type AmountFilter = "all" | "fixed" | "open";

const EMPTY_PAY_PAGE_ROWS: MerchantPayPageRow[] = [];

const FILTER_CONTROL_CLASS =
  "border border-slate-300 bg-background dark:border-slate-600";

const subscribeNoop = () => () => {};

function useClientReady(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

function usdMapsEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function MerchantPaymentLinksClient() {
  const searchParams = useSearchParams();
  const { effectiveBusinessId, skipMerchantApi } = useMerchantTenantScope();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [linkUsage, setLinkUsage] = useState<"unlimited" | "onetime">("unlimited");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [chargeKind, setChargeKind] = useState<"FIAT" | "CRYPTO">("FIAT");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [gasSponsorshipEnabled, setGasSponsorshipEnabled] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrTitle, setQrTitle] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: pageSize };
    if (q.trim()) p.q = q.trim();
    if (statusFilter === "active") p.active = "true";
    if (statusFilter === "inactive") p.active = "false";
    if (amountFilter === "fixed") p.amountType = "fixed";
    if (amountFilter === "open") p.amountType = "open";
    return p;
  }, [page, pageSize, q, statusFilter, amountFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [q, statusFilter, amountFilter]);

  const { data: checkoutMeta } = useGetCheckoutBaseUrlQuery();
  const { data, isLoading, isError, error, refetch } = useGetMerchantPayPagesQuery(
    params,
    { skip: skipMerchantApi }
  );
  const { data: productsData } = useGetMerchantProductsQuery(
    { page: 1, limit: 200, includeArchived: 1 },
    { skip: skipMerchantApi }
  );
  const { data: summary } = useGetMerchantSummaryQuery(
    { days: 30, seriesDays: 7 },
    { skip: skipMerchantApi }
  );
  const { data: gasAccount } = useGetMerchantGasAccountQuery(undefined, {
    skip: skipMerchantApi,
  });
  const globalGasToggleOn = gasAccount?.sponsorshipEnabled === true;

  const [postLink, { isLoading: posting, error: postErr }] =
    usePostMerchantPayPageMutation();
  const [patchLink] = usePatchMerchantPayPageMutation();
  const [postFiatQuote] = usePostMerchantFiatQuoteMutation();
  const postFiatQuoteRef = useRef(postFiatQuote);
  useEffect(() => {
    postFiatQuoteRef.current = postFiatQuote;
  }, [postFiatQuote]);
  const [usdByRowId, setUsdByRowId] = useState<Record<string, string>>({});
  const clientReady = useClientReady();

  const meta = data?.meta;
  const totalLinks = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLinks / pageSize));

  useEffect(() => {
    queueMicrotask(() => {
      if (page > totalPages) setPage(totalPages);
    });
  }, [page, totalPages]);

  const productNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of productsData?.items ?? []) {
      m.set(p.id, p.name);
    }
    return m;
  }, [productsData?.items]);

  useEffect(() => {
    queueMicrotask(() => {
      const pid = searchParams.get("productId")?.trim();
      const pname = searchParams.get("productName")?.trim();
      if (pid) {
        setProductId(pid);
        setOpen(true);
        if (pname) setTitle(pname);
      }
    });
  }, [searchParams]);

  const rows = data?.items ?? EMPTY_PAY_PAGE_ROWS;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next: Record<string, string> = {};
      const quote = postFiatQuoteRef.current;
      for (const row of rows) {
        if (cancelled) return;
        if (isOpenAmount(row) || row.amount == null || row.amount === "") {
          next[row.id] = "—";
          continue;
        }
        const amt = parseFloat(String(row.amount));
        if (!Number.isFinite(amt) || amt <= 0) {
          next[row.id] = "—";
          continue;
        }
        const cur = (row.currency ?? "USD").trim().toUpperCase();
        if (row.chargeKind === "CRYPTO") {
          if (["USDC", "USDT", "DAI", "BUSD", "USD"].includes(cur)) {
            next[row.id] = `≈ $${amt.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          } else {
            next[row.id] = "—";
          }
          continue;
        }
        if (cur === "USD") {
          next[row.id] = `≈ $${amt.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
          continue;
        }
        try {
          const res = await quote({
            from: cur,
            to: "USD",
            amount: amt,
          }).unwrap();
          if (cancelled) return;
          const conv = res?.convertedAmount;
          if (typeof conv === "number" && Number.isFinite(conv)) {
            next[row.id] = `≈ $${conv.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          } else {
            next[row.id] = "—";
          }
        } catch {
          next[row.id] = "—";
        }
      }
      if (!cancelled) {
        setUsdByRowId((prev) => (usdMapsEqual(prev, next) ? prev : next));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const forbidden =
    isForbiddenMerchantRole(error) || isForbiddenMerchantRole(postErr);

  const completedInPeriod = summary?.transactions?.completedCountInPeriod;
  const volumeAll30 = summary?.transactions?.volumeUsdInPeriod;
  const plStats = summary?.paymentLinks;
  const linkVolume30 = plStats?.volumeUsdInPeriod;
  const distinctLinksUsed = plStats?.distinctLinksUsedInPeriod ?? 0;
  const totalPaymentLinksCatalog = plStats?.totalPaymentLinks ?? 0;
  const completedSalesViaLinks = plStats?.completedTxWithLinkCount ?? 0;

  const linksInUsePercent =
    totalPaymentLinksCatalog > 0
      ? Math.min(
          100,
          Math.round((distinctLinksUsed / totalPaymentLinksCatalog) * 100)
        )
      : 0;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (amountFilter !== "all" ? 1 : 0);

  const paymentLinkBase = useMemo(() => {
    const fromCore = checkoutMeta?.checkoutBaseUrl?.trim().replace(/\/$/, "") ?? "";
    const fromEnv =
      process.env.NEXT_PUBLIC_PAYMENT_LINK_BASE_URL?.trim().replace(/\/$/, "") ?? "";
    return fromCore || fromEnv;
  }, [checkoutMeta?.checkoutBaseUrl]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const base: Parameters<typeof postLink>[0] = {
      title: title.trim(),
      currency: currencyCode.trim().toUpperCase() || "USD",
      chargeKind,
      ...(chargeKind === "CRYPTO"
        ? {
            gasSponsorshipEnabled:
              gasSponsorshipEnabled === true && globalGasToggleOn === true,
          }
        : {}),
      isOneTime: linkUsage === "onetime",
      isActive: true,
      ...(productId ? { productId } : {}),
    };
    const a = parseFloat(amount);
    if (Number.isNaN(a) || a < 0) return;
    base.amount = a;
    try {
      await postLink(base).unwrap();
      setOpen(false);
      setTitle("");
      setAmount("");
      setProductId(undefined);
      setChargeKind("FIAT");
      setCurrencyCode("USD");
      setGasSponsorshipEnabled(false);
      setLinkUsage("unlimited");
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
    const url = buildPaymentLinkPublicUrl(
      row.publicCode?.trim() || row.slug,
      paymentLinkBase
    );
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }, [paymentLinkBase]);

  const showQr = (row: MerchantPayPageRow) => {
    const url = buildPaymentLinkPublicUrl(
      row.publicCode?.trim() || row.slug,
      paymentLinkBase
    );
    setQrUrl(url);
    setQrTitle(row.title);
    setQrOpen(true);
  };

  if (!clientReady) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 max-w-md" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!effectiveBusinessId) {
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
    const detail = formatMerchantApiFetchError(error);
    return (
      <section
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
      >
        <h2 className="font-medium text-destructive">Could not load payment links</h2>
        {detail ? (
          <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground break-words">
            {detail}
          </p>
        ) : null}
        <p className="mt-3 flex flex-wrap gap-2 text-muted-foreground">
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

  const gasToggleDisabledReason =
    chargeKind !== "CRYPTO"
      ? "Gas sponsorship is available only for crypto links."
      : !globalGasToggleOn
        ? "Enable gas sponsorship first on Settings > Gas before enabling it per link."
        : undefined;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2" aria-label="Payment link metrics">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Link volume (last {summary?.periodDays ?? 30} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {linkVolume30 != null && Number.isFinite(Number(linkVolume30))
                ? `$${Number(linkVolume30).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">

              Overall
              completed volume:{" "}
              {volumeAll30 != null && volumeAll30 !== ""
                ? `$${Number(volumeAll30).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : "—"}
            </p>
            {completedSalesViaLinks > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {completedSalesViaLinks} completed transaction
                {completedSalesViaLinks === 1 ? "" : "s"} via payment links in this period.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Links in use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {totalPaymentLinksCatalog > 0 ? `${linksInUsePercent}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {distinctLinksUsed} of {totalPaymentLinksCatalog} payment link
              {totalPaymentLinksCatalog === 1 ? "" : "s"} completed sale in
              this period.
            </p>
            {/* {completedInPeriod != null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                All completed transactions in period: {completedInPeriod}
              </p>
            ) : null} */}
          </CardContent>
        </Card>
      </section>

      {/* {baseConfigured ? (
        <p className="text-xs text-muted-foreground">
          Checkout base: <span className="font-mono">{baseDisplay}</span>
        </p>
      ) : (
        <p className="text-xs text-amber-800" role="status">
          No checkout base configured. Set Core{" "}
          <span className="font-mono">CHECKOUT_BASE_URL</span> or this app&apos;s{" "}
          <span className="font-mono">NEXT_PUBLIC_PAYMENT_LINK_BASE_URL</span>. Copy and QR are
          disabled.
        </p>
      )} */}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">

        <div className="flex w-full items-end gap-2 ">
        {/* <Label htmlFor="pl-q">Search</Label> */}
        <div className={`${FILTER_CONTROL_CLASS} flex items-center gap-2 rounded-md w-[500px]`}>
          <Input
            id="pl-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or slug"
            className={`w-full bg-transparent`}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={` justify-center gap-2 bg-background`}
                aria-label="Open filters"
              >
                <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
                {/* <span>Filters</span> */}
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className={` space-y-4 p-4 ${FILTER_CONTROL_CLASS}`}
            >
              <p className="text-sm font-medium">Filter payment links</p>
              <div className="space-y-2">
                <Label htmlFor="pl-status-m">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger id="pl-status-m" className={`w-full ${FILTER_CONTROL_CLASS}`}>
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
                <Label htmlFor="pl-amt-type-m">Amount type</Label>
                <Select
                  value={amountFilter}
                  onValueChange={(v) => setAmountFilter(v as AmountFilter)}
                >
                  <SelectTrigger id="pl-amt-type-m" className={`w-full ${FILTER_CONTROL_CLASS}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="fixed">Fixed price</SelectItem>
                    <SelectItem value="open">Open / customer decides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <Button
                type="button"
                variant="outline"
                className={` justify-center gap-2`}
                aria-label="Open filters"
              >
                <Search className="size-4 shrink-0" aria-hidden />
              </Button>
          </div>
          <div className="flex-1"></div>
          <Button
            type="button"
            className="shrink-0 gap-2"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            New link
          </Button>
        </div>

        {/* <div className="hidden space-y-2 md:block">
          <Label htmlFor="pl-status">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger id="pl-status" className={`w-[160px] ${FILTER_CONTROL_CLASS}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden space-y-2 md:block">
          <Label htmlFor="pl-amt-type">Amount type</Label>
          <Select
            value={amountFilter}
            onValueChange={(v) => setAmountFilter(v as AmountFilter)}
          >
            <SelectTrigger id="pl-amt-type" className={`w-[180px] ${FILTER_CONTROL_CLASS}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="fixed">Fixed price</SelectItem>
              <SelectItem value="open">Open / customer decides</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:ml-auto md:block">
          <Button
            type="button"
            className="gap-2"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            New link
          </Button>
        </div> */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="border-none sm:max-w-135"
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle>Generate a payment link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {productId ? (
                <p className="text-sm text-muted-foreground">
                  Prefilled product ID:{" "}
                  <span className="font-mono text-xs">{productId}</span>
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="pl-title">Name</Label>
                <Input
                  id="pl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter payment link name"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Price</span>
                <div
                  className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1"
                  role="group"
                  aria-label="Charge in fiat or crypto"
                >
                  <Button
                    type="button"
                    variant={chargeKind === "CRYPTO" ? "default" : "ghost"}
                    className="h-9"
                    onClick={() => {
                      setChargeKind("CRYPTO");
                      setCurrencyCode("USDC");
                    }}
                  >
                    Crypto
                  </Button>
                  <Button
                    type="button"
                    variant={chargeKind === "FIAT" ? "default" : "ghost"}
                    className="h-9"
                    onClick={() => {
                      setChargeKind("FIAT");
                      setCurrencyCode("USD");
                      setGasSponsorshipEnabled(false);
                    }}
                  >
                    Fiat
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr] sm:items-end">
                <div className="min-w-0">
                  <PaymentLinkCurrencyPicker
                    value={currencyCode}
                    onChange={setCurrencyCode}
                    chargeKind={chargeKind}
                    disabled={posting}
                    triggerPlaceholder="Search currency…"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="pl-amt">Amount</Label>
                  <Input
                    id="pl-amt"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full min-w-0"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Payment link type</span>
                <div
                  className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1"
                  role="group"
                  aria-label="Link usage"
                >
                  <Button
                    type="button"
                    variant={linkUsage === "unlimited" ? "default" : "ghost"}
                    className="h-10 text-sm"
                    onClick={() => setLinkUsage("unlimited")}
                  >
                    Unlimited use
                  </Button>
                  <Button
                    type="button"
                    variant={linkUsage === "onetime" ? "default" : "ghost"}
                    className="h-10 text-sm"
                    onClick={() => setLinkUsage("onetime")}
                  >
                    One-time
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  One-time links are marked paid after successful settlement and cannot be paid again.
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Gas sponsorship</span>
                <div
                  className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1"
                  role="group"
                  aria-label="Gas sponsorship toggle"
                >
                  <Button
                    type="button"
                    variant={!gasSponsorshipEnabled ? "default" : "ghost"}
                    className="h-10 text-sm"
                    onClick={() => setGasSponsorshipEnabled(false)}
                  >
                    Off
                  </Button>
                  <Button
                    type="button"
                    variant={gasSponsorshipEnabled ? "default" : "ghost"}
                    className="h-10 text-sm"
                    onClick={() => {
                      if (!gasToggleDisabledReason) setGasSponsorshipEnabled(true);
                    }}
                    disabled={Boolean(gasToggleDisabledReason)}
                  >
                    On
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {gasToggleDisabledReason ??
                    "If enabled, checkout can apply sponsorship when global/business gas policy is healthy."}
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={handleCreate}
                disabled={posting || !title.trim()}
              >
                {posting ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
                {posting ? "Creating..." : "Create payment link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-md bg-white">
        <TooltipProvider delayDuration={200}>
          <div className="w-full overflow-x-auto">
    {/* The table-fixed class forces the browser to respect our exact column widths */}
    <Table className="table-fixed min-w-[1000px] lg:min-w-full">
      <TableHeader>
        <TableRow>
          {/* Strict widths for the heaviest columns */}
          <TableHead scope="col" className="w-[14rem]">
            Title
          </TableHead>
          <TableHead scope="col" className="w-[22rem]">
            Checkout URL
          </TableHead>
          
          {/* Let the browser distribute the remaining space automatically */}
          <TableHead scope="col">Kind</TableHead>
          <TableHead scope="col">Linked product</TableHead>
          <TableHead scope="col" className="text-right">Amount</TableHead>
          <TableHead scope="col" className="text-right">~ USD</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" className="text-right">Uses</TableHead>
          <TableHead scope="col" className="text-right w-[4rem]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground">
              No payment links match your filters.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const url = buildPaymentLinkPublicUrl(
              row.publicCode?.trim() || row.slug,
              paymentLinkBase
            );
            const pid = row.productId ?? undefined;
            const pname = pid ? productNameById.get(pid) : undefined;
            
            return (
              <TableRow key={row.id}>
                
                {/* Truncate ensures long titles do not stretch the column */}
                <TableCell className="font-medium truncate" title={row.title}>
                  {row.title}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* min-w-0 and truncate work together to clip the URL properly inside a flex container */}
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-[13px] text-muted-foreground lg:text-xs"
                      title={url || row.slug}
                    >
                      {url || row.slug}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <ActionTooltip
                        label="Copy checkout URL"
                        actionLabel="Copied"
                        onClick={() => {
                          void copyUrl(row);
                        }}
                        side="top"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0"
                          disabled={!url}
                          aria-label="Copy checkout URL"
                        >
                          <Copy className="size-3.5" aria-hidden />
                        </Button>
                      </ActionTooltip>
                      <ActionTooltip
                        label="Show QR code"
                        actionLabel="QR code generated"
                        onClick={() => {
                          showQr(row);
                        }}
                        side="top"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0"
                          disabled={!url}
                          aria-label="Show QR code"
                        >
                          <QrCode className="size-3.5" aria-hidden />
                        </Button>
                      </ActionTooltip>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="text-sm tabular-nums">
                  {row.chargeKind === "CRYPTO" ? "Crypto" : "Fiat"}
                </TableCell>
                
                <TableCell className="text-sm truncate">
                  {pid ? (
                    <span title={pname ?? pid}>
                      {pname ?? pid.slice(0, 8) + "…"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Open amount</span>
                  )}
                </TableCell>
                
                <TableCell className="text-right text-sm tabular-nums truncate">
                  {isOpenAmount(row) ? (
                    <span className="text-muted-foreground">Customer decides</span>
                  ) : (
                    <>
                      {row.amount} {row.currency ?? ""}
                    </>
                  )}
                </TableCell>
                
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground truncate">
                  {usdByRowId[row.id] ?? "…"}
                </TableCell>
                
                <TableCell>
                  <Badge variant={row.isOneTime && row.paidAt ? "outline" : row.isActive !== false ? "success" : "secondary"}>
                    {row.isOneTime && row.paidAt
                      ? "Paid"
                      : row.isActive !== false
                        ? "Active"
                        : "Inactive"}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-right text-sm tabular-nums">
                  {row.isOneTime ? (row.paidAt ? "1" : "0") : (row.usageCount ?? 0)}
                </TableCell>
                
                <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <ActionTooltip label="Open actions menu" side="left">
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${row.title || "payment link"}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                      </ActionTooltip>
                      <DropdownMenuContent align="end" className="w-48">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              disabled={!url}
                              onSelect={() => {
                                void copyUrl(row);
                              }}
                            >
                              <Copy className="mr-2 size-4" aria-hidden />
                              Copy link
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            sideOffset={8}
                            className={actionTooltipContentClassName}
                          >
                            Copy checkout URL
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              disabled={!url}
                              onSelect={() => {
                                showQr(row);
                              }}
                            >
                              <QrCode className="mr-2 size-4" aria-hidden />
                              QR code
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            sideOffset={8}
                            className={actionTooltipContentClassName}
                          >
                            Show QR code
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onSelect={() => {
                                void toggle(row);
                              }}
                            >
                              {row.isActive !== false ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            sideOffset={8}
                            className={actionTooltipContentClassName}
                          >
                            {row.isActive !== false
                              ? "Stop accepting payments on this link"
                              : "Resume accepting payments on this link"}
                          </TooltipContent>
                        </Tooltip>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
          </div>

          <DataTablePaginationBar
    className="mt-0"
    page={page}
    pageSize={pageSize}
    total={totalLinks}
    onPageChange={setPage}
    onPageSizeChange={(n) => {
      setPageSize(n);
      setPage(1);
    }}
          />
        </TooltipProvider>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
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
