"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Link2, Pencil, Plus } from "lucide-react";
import {
  useGetMerchantProductsQuery,
  useGetMerchantSummaryQuery,
  useGetMerchantTransactionsQuery,
  usePatchMerchantProductMutation,
  usePostMerchantProductMutation,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import type { MerchantApiScopeKey, MerchantProductRow } from "@/types/merchant-api";
import { isForbiddenMerchantRole } from "@/lib/merchant-api-error";
import {
  aggregateProductPurchaseCounts,
  parsePrice,
} from "@/lib/merchant-commerce-helpers";
import { MerchantProductTopChart } from "@/components/merchant/merchant-product-top-chart";
import {
  ProductFormModal,
  type ProductFormSavePayload,
} from "@/components/merchant/product-form-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DataTablePaginationBar } from "@/components/ui/data-table-pagination-bar";

const PRODUCT_TYPES = ["DIGITAL", "PHYSICAL", "SERVICE"] as const;
type ProductType = (typeof PRODUCT_TYPES)[number];

type StatusFilter = "active" | "archived" | "all";
type TypeFilter = "all" | ProductType;
type SortKey = "newest" | "price_high" | "price_low" | "most_sales";

function pick(row: MerchantProductRow, key: keyof MerchantProductRow): string {
  const v = row[key];
  return v != null && String(v).length > 0 ? String(v) : "—";
}

function descPreview(desc: string | null | undefined, max = 48): string {
  if (!desc?.trim()) return "—";
  const t = desc.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function MerchantProductsClient() {
  const { effectiveBusinessId, skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalRow, setProductModalRow] =
    useState<MerchantProductRow | null>(null);

  const params = useMemo((): Record<string, string | number | undefined> & MerchantApiScopeKey => {
    const p: Record<string, string | number | undefined> & MerchantApiScopeKey = {
      page,
      limit: pageSize,
      includeArchived: 1,
      merchantApiScopeKey,
    };
    if (q.trim()) p.q = q.trim();
    if (statusFilter === "active") p.status = "active";
    if (statusFilter === "archived") p.status = "archived";
    if (typeFilter !== "all") p.type = typeFilter;
    return p;
  }, [page, pageSize, q, statusFilter, typeFilter, merchantApiScopeKey]);

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [q, statusFilter, typeFilter]);

  const { data, isLoading, isError, error, refetch } = useGetMerchantProductsQuery(
    params,
    { skip: skipMerchantApi }
  );
  const { data: summary } = useGetMerchantSummaryQuery(
    { days: 30, seriesDays: 7, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const { data: txData } = useGetMerchantTransactionsQuery(
    { page: 1, limit: 200, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );

  const [postProduct, { isLoading: posting, error: postErr }] =
    usePostMerchantProductMutation();
  const [patchProduct, { isLoading: patching, error: patchErr }] =
    usePatchMerchantProductMutation();

  const rawRows = useMemo(() => data?.items ?? [], [data?.items]);
  const purchaseByProduct = useMemo(
    () => aggregateProductPurchaseCounts(txData?.items ?? []),
    [txData?.items]
  );

  const meta = data?.meta;
  const totalProducts = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));

  useEffect(() => {
    queueMicrotask(() => {
      if (page > totalPages) setPage(totalPages);
    });
  }, [page, totalPages]);

  const sortedRows = useMemo(() => {
    const list = [...rawRows];
    const sales = (id: string) => purchaseByProduct.get(id) ?? 0;
    list.sort((a, b) => {
      switch (sortKey) {
        case "price_high":
          return parsePrice(b.price) - parsePrice(a.price);
        case "price_low":
          return parsePrice(a.price) - parsePrice(b.price);
        case "most_sales":
          return sales(b.id) - sales(a.id);
        case "newest":
        default:
          return b.id.localeCompare(a.id);
      }
    });
    return list;
  }, [rawRows, sortKey, purchaseByProduct]);

  const topChartItems = useMemo(() => {
    return rawRows.map((p) => ({
      id: p.id,
      label: p.name,
      count: purchaseByProduct.get(p.id) ?? 0,
      revenueHint: parsePrice(p.price) * (purchaseByProduct.get(p.id) ?? 0),
    }));
  }, [rawRows, purchaseByProduct]);

  const forbidden =
    isForbiddenMerchantRole(error) ||
    isForbiddenMerchantRole(postErr) ||
    isForbiddenMerchantRole(patchErr);

  const openNewProduct = () => {
    setProductModalRow(null);
    setProductModalOpen(true);
  };

  const openEdit = (row: MerchantProductRow) => {
    setProductModalRow(row);
    setProductModalOpen(true);
  };

  const handleProductSave = async (payload: ProductFormSavePayload) => {
    if (payload.kind === "create") {
      await postProduct(payload.body).unwrap();
    } else {
      await patchProduct({
        id: payload.id,
        patch: payload.body,
      }).unwrap();
    }
  };

  const archiveRow = async (row: MerchantProductRow) => {
    await patchProduct({
      id: row.id,
      patch: { isActive: false },
    }).unwrap();
  };

  if (!effectiveBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to manage products.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full max-w-md" />
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
        <h2 className="font-medium text-destructive">Could not load products</h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>Check your connection and business selection.</span>
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
          Your role does not include access to products in this environment, or the
          action is restricted. Contact an owner or admin if you need access.
        </p>
      </section>
    );
  }

  const periodVol = summary?.transactions?.volumeUsdInPeriod;

  return (
    <div className="space-y-8">
      <section
        className="grid gap-4 md:grid-cols-2"
        aria-label="Product overview metrics"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{totalProducts}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total rows matching search and filters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Volume (last {summary?.periodDays ?? 30} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {periodVol != null && periodVol !== ""
                ? `$${Number(periodVol).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : "None"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              All sales in this period, not only these products.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top products
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            By purchases in recent transactions that include a product.
          </p>
        </CardHeader>
        <CardContent>
          <MerchantProductTopChart items={topChartItems} maxBars={5} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="product-search">Search</Label>
          <Input
            id="product-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name"
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {PRODUCT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sort by</Label>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest (id)</SelectItem>
              <SelectItem value="price_high">Highest price</SelectItem>
              <SelectItem value="price_low">Lowest price</SelectItem>
              <SelectItem value="most_sales">Most sales</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="ml-auto gap-2" onClick={openNewProduct}>
          <Plus className="size-4" aria-hidden />
          New product
        </Button>
      </div>

      <div className="rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[72px]">
                Image
              </TableHead>
              <TableHead scope="col">Product</TableHead>
              <TableHead scope="col">Type</TableHead>
              <TableHead scope="col" className="text-right">
                Price
              </TableHead>
              <TableHead scope="col" className="text-right">
                Sales
              </TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No products match your filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row) => {
                const sales = purchaseByProduct.get(row.id) ?? 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- user-provided catalog URLs
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{pick(row, "name")}</div>
                      <div className="text-xs text-muted-foreground">
                        {descPreview(row.description)}
                      </div>
                    </TableCell>
                    <TableCell>{pick(row, "type")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pick(row, "price")}{" "}
                      <span className="text-muted-foreground text-xs">
                        {row.currency ?? "USD"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{sales}</TableCell>
                    <TableCell>
                      <Badge variant={row.isActive !== false ? "success" : "secondary"}>
                        {row.isActive === false ? "Archived" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          asChild
                        >
                          <Link
                            href={`/payment-links?productId=${encodeURIComponent(row.id)}&productName=${encodeURIComponent(row.name)}`}
                          >
                            <Link2 className="size-3.5" aria-hidden />
                            Payment link
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                        {row.isActive !== false ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveRow(row)}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <DataTablePaginationBar
          className="mt-4"
          page={page}
          pageSize={pageSize}
          total={totalProducts}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>

      <ProductFormModal
        open={productModalOpen}
        onOpenChange={(next) => {
          setProductModalOpen(next);
          if (!next) setProductModalRow(null);
        }}
        product={productModalRow}
        onSave={handleProductSave}
        isSubmitting={posting || patching}
      />
    </div>
  );
}
