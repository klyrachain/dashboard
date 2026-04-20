"use client";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
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
  ChevronDown,
  Copy,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  useGetCheckoutBaseUrlQuery,
  useGetMerchantBusinessQuery,
  useGetMerchantGasAccountQuery,
  useGetMerchantPayPagesQuery,
  useGetMerchantProductsQuery,
  useGetMerchantSummaryQuery,
  usePatchMerchantPayPageMutation,
  usePostMerchantFiatQuoteMutation,
  usePostMerchantPayPageMutation,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import type {
  MerchantApiScopeKey,
  MerchantBusinessProfile,
  MerchantPayPageRow,
  MerchantProductRow,
} from "@/types/merchant-api";
import {
  formatMerchantApiFetchError,
  isForbiddenMerchantRole,
} from "@/lib/merchant-api-error";
import {
  buildPaymentLinkPublicUrl,
  computePaymentLinkCartDiscountTotal,
  computePaymentLinkCartSubtotal,
  computePaymentLinkCartTotal,
  formatPaymentLinkCatalogCell,
  isMerchantPayPageOpenAmount,
  parsePrice,
} from "@/lib/merchant-commerce-helpers";
import { PaymentLinkQrDialog } from "@/components/merchant/payment-link-qr-dialog";
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
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";
type AmountFilter = "all" | "fixed" | "open";

const EMPTY_PAY_PAGE_ROWS: MerchantPayPageRow[] = [];

const FILTER_CONTROL_CLASS =
  "shadow-sm bg-background ";

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

export type MerchantPaymentLinksClientProps = {
  /**
   * RSC snapshot from `GET /api/v1/merchant/business` (same as Settings → General).
   * Merged with RTK so name/logo for QR match settings without waiting on client fetch.
   */
  serverBusinessProfile?: MerchantBusinessProfile | null;
};

export function MerchantPaymentLinksClient({
  serverBusinessProfile = null,
}: MerchantPaymentLinksClientProps) {
  const searchParams = useSearchParams();
  const { effectiveBusinessId, skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();

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
  const [currencyCode, setCurrencyCode] = useState("USDC");
  const [gasSponsorshipEnabled, setGasSponsorshipEnabled] = useState(false);

  type OrderCartLine = {
    key: string;
    source: "catalog" | "custom";
    productId: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
    currency: string;
  };

  const [orderCartLines, setOrderCartLines] = useState<OrderCartLine[]>([]);
  const [cartDiscountPercent, setCartDiscountPercent] = useState("");
  const [cartDiscountAmount, setCartDiscountAmount] = useState("");
  const [catalogAddOpen, setCatalogAddOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemUnitPrice, setCustomItemUnitPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");
  const [customItemCurrency, setCustomItemCurrency] = useState("USDC");
  const [orderSectionOpen, setOrderSectionOpen] = useState(true);
  const [summarySectionOpen, setSummarySectionOpen] = useState(true);
  const urlCatalogProductAppliedRef = useRef(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrRow, setQrRow] = useState<MerchantPayPageRow | null>(null);

  const params = useMemo((): Record<string, string | number | undefined> & MerchantApiScopeKey => {
    const p: Record<string, string | number | undefined> & MerchantApiScopeKey = {
      page,
      limit: pageSize,
      merchantApiScopeKey,
    };
    if (q.trim()) p.q = q.trim();
    if (statusFilter === "active") p.active = "true";
    if (statusFilter === "inactive") p.active = "false";
    if (amountFilter === "fixed") p.amountType = "fixed";
    if (amountFilter === "open") p.amountType = "open";
    return p;
  }, [page, pageSize, q, statusFilter, amountFilter, merchantApiScopeKey]);

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
    { page: 1, limit: 200, includeArchived: 1, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const { data: summary } = useGetMerchantSummaryQuery(
    { days: 30, seriesDays: 7, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const { data: gasAccount } = useGetMerchantGasAccountQuery(
    { merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const { data: merchantBusinessFromQuery } = useGetMerchantBusinessQuery(
    undefined,
    { skip: skipMerchantApi }
  );
  const merchantBusiness =
    merchantBusinessFromQuery ?? serverBusinessProfile ?? undefined;
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

  const qrDialogHeadline = useMemo(() => {
    if (!qrRow) return "";
    const pid = qrRow.productId?.trim();
    if (pid) {
      const name = productNameById.get(pid);
      if (name) return name;
    }
    return qrRow.title;
  }, [qrRow, productNameById]);

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

  useEffect(() => {
    if (!open) {
      urlCatalogProductAppliedRef.current = false;
      return;
    }
    if (urlCatalogProductAppliedRef.current) return;
    const pid = productId?.trim();
    if (!pid) return;
    const items = productsData?.items ?? [];
    const p = items.find((x) => x.id === pid);
    if (!p) return;
    urlCatalogProductAppliedRef.current = true;
    const unit = parsePrice(p.price);
    const cur = (p.currency ?? "USD").trim().toUpperCase() || "USD";
    queueMicrotask(() => {
      setOrderCartLines([
        {
          key: `seed-${pid}`,
          source: "catalog",
          productId: p.id,
          name: p.name,
          unitPrice: Number.isFinite(unit) ? unit : 0,
          quantity: 1,
          currency: cur,
        },
      ]);
      setCurrencyCode(cur);
      setTitle((t) => (t.trim() === "" ? p.name : t));
    });
  }, [open, productId, productsData?.items]);

  const rows = data?.items ?? EMPTY_PAY_PAGE_ROWS;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next: Record<string, string> = {};
      const quote = postFiatQuoteRef.current;
      for (const row of rows) {
        if (cancelled) return;
        if (isMerchantPayPageOpenAmount(row) || row.amount == null || row.amount === "") {
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

  const cartDiscountPercentNum = parseFloat(cartDiscountPercent) || 0;
  const cartDiscountAmountNum = parseFloat(cartDiscountAmount) || 0;
  const orderCartSubtotal = useMemo(
    () =>
      computePaymentLinkCartSubtotal(
        orderCartLines.map((l) => ({
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        }))
      ),
    [orderCartLines]
  );
  const orderCartDiscount = useMemo(
    () =>
      computePaymentLinkCartDiscountTotal({
        subtotal: orderCartSubtotal,
        discountPercent: cartDiscountPercentNum,
        discountAmount: cartDiscountAmountNum,
      }),
    [orderCartSubtotal, cartDiscountPercentNum, cartDiscountAmountNum]
  );
  const orderCartTotal = useMemo(
    () =>
      computePaymentLinkCartTotal({
        lines: orderCartLines.map((l) => ({
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        discountPercent: cartDiscountPercentNum,
        discountAmount: cartDiscountAmountNum,
      }),
    [orderCartLines, cartDiscountPercentNum, cartDiscountAmountNum]
  );

  const orderCartCurrenciesConflict = useMemo(() => {
    const set = new Set(
      orderCartLines.map((l) => l.currency.trim().toUpperCase())
    );
    return set.size > 1;
  }, [orderCartLines]);

  const cartSummaryCurrency =
    orderCartLines.length > 0
      ? orderCartLines[0]!.currency.trim().toUpperCase() || "USD"
      : currencyCode.trim().toUpperCase() || "USDC";

  const catalogProductsForPicker = useMemo(() => {
    const items = productsData?.items ?? [];
    return items.filter((p) => p.isActive !== false);
  }, [productsData?.items]);

  const addProductToOrderCart = (p: MerchantProductRow) => {
    const unit = parsePrice(p.price);
    const cur = (p.currency ?? "USD").trim().toUpperCase() || "USD";
    setOrderCartLines((prev) => {
      const idx = prev.findIndex(
        (l) => l.source === "catalog" && l.productId === p.id
      );
      if (idx >= 0) {
        const next = [...prev];
        const row = next[idx]!;
        next[idx] = { ...row, quantity: row.quantity + 1 };
        return next;
      }
      if (prev.length === 0) {
        queueMicrotask(() => {
          setCurrencyCode(cur);
          setTitle((t) => (t.trim() === "" ? p.name : t));
        });
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          source: "catalog",
          productId: p.id,
          name: p.name,
          unitPrice: Number.isFinite(unit) ? unit : 0,
          quantity: 1,
          currency: cur,
        },
      ];
    });
    setCatalogAddOpen(false);
  };

  const addCustomLineToOrderCart = () => {
    const name = customItemName.trim();
    if (!name) return;
    const unit = parseFloat(customItemUnitPrice);
    if (!Number.isFinite(unit) || unit < 0) return;
    const qtyRaw = parseFloat(customItemQty);
    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
    const cur =
      orderCartLines.length > 0
        ? orderCartLines[0]!.currency.trim().toUpperCase() || "USDC"
        : customItemCurrency.trim().toUpperCase() || "USDC";
    setOrderCartLines((prev) => {
      if (prev.length === 0) {
        queueMicrotask(() => setCurrencyCode(cur));
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          source: "custom",
          productId: null,
          name,
          unitPrice: unit,
          quantity: qty,
          currency: cur,
        },
      ];
    });
    setCustomItemName("");
    setCustomItemUnitPrice("");
    setCustomItemQty("1");
    setCustomItemOpen(false);
  };

  const setOrderLineQuantity = (key: string, quantity: number) => {
    setOrderCartLines((prev) => {
      if (quantity <= 0) {
        return prev.filter((l) => l.key !== key);
      }
      return prev.map((l) =>
        l.key === key ? { ...l, quantity: Math.floor(quantity) } : l
      );
    });
  };

  const removeOrderLine = (key: string) => {
    setOrderCartLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handlePaymentLinkDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setOrderCartLines([]);
      setCartDiscountPercent("");
      setCartDiscountAmount("");
      setCatalogAddOpen(false);
      setCustomItemOpen(false);
      setCustomItemName("");
      setCustomItemUnitPrice("");
      setCustomItemQty("1");
      setCustomItemCurrency("USDC");
      setOrderSectionOpen(true);
      setSummarySectionOpen(true);
      urlCatalogProductAppliedRef.current = false;
    }
  };

  const createPaymentLinkDisabled =
    posting ||
    !title.trim() ||
    (orderCartLines.length > 0 && orderCartCurrenciesConflict) ||
    (orderCartLines.length === 0 &&
      (Number.isNaN(parseFloat(amount)) || parseFloat(amount) < 0));

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
      currency: currencyCode.trim().toUpperCase() || "USDC",
      chargeKind: "CRYPTO",
      gasSponsorshipEnabled:
        gasSponsorshipEnabled === true && globalGasToggleOn === true,
      isOneTime: linkUsage === "onetime",
      isActive: true,
    };

    if (orderCartLines.length > 0) {
      const currencies = new Set(
        orderCartLines.map((l) => l.currency.trim().toUpperCase())
      );
      if (currencies.size !== 1) return;
      const cartCurrency = [...currencies][0]!;
      base.currency = cartCurrency;
      base.amount = orderCartTotal;
      base.metadata = {
        cart: {
          v: 1,
          lines: orderCartLines.map((l) => ({
            ...(l.source === "catalog" && l.productId
              ? { productId: l.productId }
              : {}),
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          ...(cartDiscountPercentNum > 0
            ? {
                discountPercent: Math.min(100, Math.max(0, cartDiscountPercentNum)),
              }
            : {}),
          ...(cartDiscountAmountNum > 0
            ? { discountAmount: Math.max(0, cartDiscountAmountNum) }
            : {}),
        },
      };
      if (orderCartLines.length === 1) {
        const only = orderCartLines[0]!;
        if (only.source === "catalog" && only.productId) {
          base.productId = only.productId;
        }
      }
    } else {
      if (productId?.trim()) {
        base.productId = productId.trim();
      }
      const a = parseFloat(amount);
      if (Number.isNaN(a) || a < 0) return;
      base.amount = a;
    }

    try {
      await postLink(base).unwrap();
      setTitle("");
      setAmount("");
      setProductId(undefined);
      setCurrencyCode("USDC");
      setGasSponsorshipEnabled(false);
      setLinkUsage("unlimited");
      handlePaymentLinkDialogOpenChange(false);
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
    setQrRow(row);
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

  const gasToggleDisabledReason = !globalGasToggleOn
    ? "Enable gas sponsorship first on Settings > Gas before enabling it per link."
    : undefined;

  const customItemFormValid =
    customItemName.trim().length > 0 &&
    Number.isFinite(parseFloat(customItemUnitPrice)) &&
    parseFloat(customItemUnitPrice) >= 0;

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
        <Dialog open={open} onOpenChange={handlePaymentLinkDialogOpenChange}>
          <DialogContent
            className="border-none sm:max-w-xl"
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
              <div className="overflow-hidden rounded-lg"
              style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}>
                <div
                  className={cn(
                    "flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between",
                    orderSectionOpen && ""
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left text-sm font-medium outline-none  focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={orderSectionOpen}
                    aria-controls="pl-order-collapsible"
                    onClick={() => setOrderSectionOpen((v) => !v)}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-background transition-transform duration-200",
                        orderSectionOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                    <span className="text-background">Order</span>
                  </button>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Popover open={catalogAddOpen} onOpenChange={setCatalogAddOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={posting}
                        >
                          <Plus className="size-3.5" aria-hidden />
                          Add product
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className={`w-[min(100vw-2rem,20rem)] p-0 ${FILTER_CONTROL_CLASS}`}
                      >
                        <p className="border-b border-border px-3 py-2 text-sm font-medium">
                          Your catalog
                        </p>
                        <div className="max-h-56 overflow-y-auto p-1">
                          {catalogProductsForPicker.length === 0 ? (
                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                              No active products. Create products first.
                            </p>
                          ) : (
                            catalogProductsForPicker.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80"
                                onClick={() => addProductToOrderCart(p)}
                              >
                                <span className="font-medium leading-tight">{p.name}</span>
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  {p.price}{" "}
                                  {(p.currency ?? "USD").trim().toUpperCase() || "USD"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                        <Popover open={customItemOpen} onOpenChange={setCustomItemOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 w-full"
                          disabled={posting}
                        >
                          <Plus className="size-3.5" aria-hidden />
                          Add custom item
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className={`w-[min(100vw-2rem,20rem)] space-y-3 p-3 ${FILTER_CONTROL_CLASS}`}
                      >
                        <p className="text-sm font-medium">Custom line item</p>
                        <div className="space-y-2">
                          <Label htmlFor="pl-custom-name">Description</Label>
                          <Input
                            id="pl-custom-name"
                            value={customItemName}
                            onChange={(e) => setCustomItemName(e.target.value)}
                            placeholder="e.g. Rush fee"
                            disabled={posting}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="pl-custom-price">Unit price</Label>
                            <Input
                              id="pl-custom-price"
                              inputMode="decimal"
                              value={customItemUnitPrice}
                              onChange={(e) => setCustomItemUnitPrice(e.target.value)}
                              placeholder="0.00"
                              disabled={posting}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pl-custom-qty">Qty</Label>
                            <Input
                              id="pl-custom-qty"
                              inputMode="numeric"
                              value={customItemQty}
                              onChange={(e) => setCustomItemQty(e.target.value)}
                              placeholder="1"
                              disabled={posting}
                            />
                          </div>
                        </div>
                        {orderCartLines.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Charged in {cartSummaryCurrency} to match your order.
                          </p>
                        ) : (
                          <div className="min-w-0 space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Currency
                            </span>
                            <PaymentLinkCurrencyPicker
                              value={customItemCurrency}
                              onChange={setCustomItemCurrency}
                              chargeKind="CRYPTO"
                              disabled={posting}
                              triggerPlaceholder="Search currency…"
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          disabled={posting || !customItemFormValid}
                          onClick={() => addCustomLineToOrderCart()}
                        >
                          Add to order
                        </Button>
                      </PopoverContent>
                    </Popover>

                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {orderSectionOpen ? (
                  <div id="pl-order-collapsible" className="space-y-3 p-3 pt-2">
                    {orderCartLines.length === 0 ? (
                      <p className="text-xs text-background">
                        Add catalog products or custom items for a bundled total. Leave the order
                        empty to charge a single crypto amount below.
                      </p>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {orderCartLines.map((line) => (
                            <li
                              key={line.key}
                              className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 px-2 py-2 text-sm"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                {line.source === "custom" ? (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 text-[10px] uppercase text-background"
                                  >
                                    Custom
                                  </Badge>
                                ) : null}
                                <span className="truncate font-medium text-background" title={line.name}>
                                  {line.name}
                                </span>
                              </div>
                              <span className="shrink-0 text-xs tabular-nums text-background">
                                {line.unitPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                {line.currency}
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-7"
                                  style={{ backgroundColor: 'black' }}
                                  aria-label={`Decrease quantity for ${line.name}`}
                                  onClick={() =>
                                    setOrderLineQuantity(line.key, line.quantity - 1)
                                  }
                                >
                                  <Minus className="size-3.5 text-background" aria-hidden />
                                </Button>
                                <span className="w-6 text-background text-center text-xs tabular-nums">
                                  {line.quantity}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-7"
                                  style={{ backgroundColor: 'black' }}
                                  aria-label={`Increase quantity for ${line.name}`}
                                  onClick={() =>
                                    setOrderLineQuantity(line.key, line.quantity + 1)
                                  }
                                >
                                  <Plus className="size-3.5 text-background" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-background"
                                  style={{ backgroundColor: 'black' }}
                                  aria-label={`Remove ${line.name} from order`}
                                  onClick={() => removeOrderLine(line.key)}
                                >
                                  <Trash2 className="size-3.5 text-background" aria-hidden />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {orderCartCurrenciesConflict ? (
                          <p className="text-xs text-destructive" role="alert">
                            All lines must use the same currency. Remove items or adjust catalog
                            prices so currencies match.
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pl-title">Name</Label>
                <Input
                  id="pl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter payment link name"
                />
              </div>
              {orderCartLines.length === 0 ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Crypto amount</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Payment links are settled in crypto. Choose the charge currency and amount.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr] sm:items-end">
                    <div className="min-w-0">
                      <PaymentLinkCurrencyPicker
                        value={currencyCode}
                        onChange={setCurrencyCode}
                        chargeKind="CRYPTO"
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
                        disabled={posting}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2 flex justify-between">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-medium">Payment link type
                </span>
                   <p className="text-xs text-muted-foreground">
                  One-time links are marked paid after successful settlement and cannot be paid again.
                  </p>
                  </div>
                <div
                  className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1 h-fit"
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
               
              </div>

   
 
              {orderCartLines.length > 0 ? (
                <div className="w-full overflow-hidden rounded-lg" 
                style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium outline-none hover:bg-muted/10 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={summarySectionOpen}
                    aria-controls="pl-summary-collapsible"
                    onClick={() => setSummarySectionOpen((v) => !v)}
                  >
                    <span className="text-background">Order summary</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-background transition-transform duration-200",
                        summarySectionOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  {summarySectionOpen ? (
                    <div
                      id="pl-summary-collapsible"
                      className="space-y-3 border-t border-border p-3 pt-2"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="pl-cart-disc-pct" className="text-background">Discount %</Label>
                          <Input
                            id="pl-cart-disc-pct"
                            inputMode="decimal"
                            value={cartDiscountPercent}
                            onChange={(e) => setCartDiscountPercent(e.target.value)}
                            placeholder="0"
                            disabled={posting}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pl-cart-disc-amt" className="text-background">Discount amount</Label>
                          <Input
                            id="pl-cart-disc-amt"
                            inputMode="decimal"
                            value={cartDiscountAmount}
                            onChange={(e) => setCartDiscountAmount(e.target.value)}
                            placeholder={`0 ${cartSummaryCurrency}`}
                            disabled={posting}
                          />
                        </div>
                      </div>
                      <div
                        className="space-y-1 rounded-md border border-dashed border-border bg-background/20 px-3 py-2 text-sm text-background"
                        aria-live="polite"
                      >
                        <div className="flex justify-between gap-2 tabular-nums">
                          <span className="text-background">Subtotal</span>
                          <span>
                            {orderCartSubtotal.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {cartSummaryCurrency}
                          </span>
                        </div>
                        {orderCartDiscount > 0 ? (
                          <div className="flex justify-between gap-2 tabular-nums text-background">
                            <span>Discount</span>
                            <span>
                              −
                              {orderCartDiscount.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {cartSummaryCurrency}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between gap-2 border-t border-border pt-1 font-medium tabular-nums">
                          <span>Total</span>
                          <span>
                            {orderCartTotal.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {cartSummaryCurrency}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
          
            </div>
            <DialogFooter className="flex justify-between">
            <div className="space-y-2">
                {/* <span className="text-sm font-medium">Sponsor gas for payers on this link</span> */}
                <label className="flex cursor-pointer items-start gap-3 rounded-md bg-background/40 p-3 pl-0 pt-0 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 rounded border border-input"
                    checked={gasSponsorshipEnabled}
                    disabled={posting || Boolean(gasToggleDisabledReason)}
                    onChange={(e) => setGasSponsorshipEnabled(e.target.checked)}
                    aria-describedby="pl-gas-help"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="font-medium leading-snug">
                      Sponsor gas for payers on this link
                    </span>
                    {/* <span
                      id="pl-gas-help"
                      className="block text-xs leading-relaxed text-muted-foreground"
                    >
                      {gasToggleDisabledReason ??
                        "When enabled, checkout can apply sponsorship when your business gas policy is healthy."}
                    </span> */}
                  </span>
                </label>
              </div>
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => handlePaymentLinkDialogOpenChange(false)}
              >
                Cancel
              </Button> */}
              <div className="flex-1"></div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={handleCreate}
                disabled={createPaymentLinkDisabled}
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
            const catalogLabel = formatPaymentLinkCatalogCell(row, productNameById);

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
                  <span
                    title={catalogLabel}
                    className={
                      catalogLabel === "Open amount"
                        ? "text-muted-foreground"
                        : undefined
                    }
                  >
                    {catalogLabel}
                  </span>
                </TableCell>
                
                <TableCell className="text-right text-sm tabular-nums truncate">
                  {isMerchantPayPageOpenAmount(row) ? (
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
      <PaymentLinkQrDialog
        open={qrOpen}
        onOpenChange={(next) => {
          setQrOpen(next);
          if (!next) setQrRow(null);
        }}
        row={qrRow}
        checkoutBaseUrl={paymentLinkBase}
        companyName={merchantBusiness?.name?.trim() || "Your business"}
        companyLogoUrl={merchantBusiness?.logoUrl ?? null}
        headline={qrDialogHeadline}
      />
    </div>
  );
}
