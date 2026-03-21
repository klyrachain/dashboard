"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryAssetRow } from "@/lib/data-inventory";
import {
  useGetInventoryQuery,
  useGetInventoryAssetQuery,
  useCreateInventoryMutation,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation,
  type CreateInventoryBody,
  type UpdateInventoryBody,
} from "@/store/inventory-api";
import {
  QUOTE_CURRENCIES,
  type QuoteCurrency,
  type RatesMap,
} from "@/lib/token-rates";
import { useSelector } from "react-redux";
import { selectBaseCurrency } from "@/store/preferences-slice";
import { ExportDataModal } from "@/components/export-data-modal";
import type { ExportColumn } from "@/lib/export-data";
import { FileDown, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

function assetKey(chain: string, token: string): string {
  return `${(chain ?? "").trim().toLowerCase()}:${(token ?? "").trim().toUpperCase()}`;
}

const CURRENCY_LABEL: Record<QuoteCurrency, string> = {
  usd: "USD",
  usdc: "USDC",
  ghs: "GHS",
};

function formatInQuote(value: number, quote: QuoteCurrency): string {
  const code = CURRENCY_LABEL[quote];
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code === "USDC" ? "USD" : code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const INVENTORY_ASSETS_EXPORT_COLUMNS: ExportColumn[] = [
  { id: "id", label: "ID" },
  { id: "chain", label: "Chain" },
  { id: "token", label: "Token" },
  { id: "balance", label: "Balance" },
  { id: "updatedAt", label: "Updated" },
  { id: "address", label: "Address" },
  { id: "tokenAddress", label: "Token address" },
];

function EmptyState({ compact }: { compact?: boolean }) {
  return (
    <Card className="bg-white">
      <CardContent className={`flex flex-col items-center justify-center gap-2 text-center ${compact ? "py-6" : "py-12"}`}>
        <div className={`flex items-center justify-center rounded-full bg-slate-100 ${compact ? "size-8" : "size-12"}`}>
          <span className={compact ? "text-lg text-slate-400" : "text-2xl text-slate-400"} aria-hidden>—</span>
        </div>
        <div>
          <p className={compact ? "text-xs font-medium text-slate-600" : "text-sm font-medium text-slate-600"}>No inventory assets</p>
          {!compact && (
            <p className="text-xs text-slate-500">Add an asset to track balances by chain and token.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssetCard({
  asset,
  onEdit,
  onDelete,
  isDeleting,
  compact,
  ratesMap = null,
  quote = "usdc",
}: {
  asset: InventoryAssetRow;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  compact?: boolean;
  ratesMap?: RatesMap | null;
  quote?: QuoteCurrency;
}) {
  const amount = (() => {
    const n = Number.parseFloat(asset.balance.replace(/,/g, ""));
    return Number.isNaN(n) ? 0 : n;
  })();
  const key = assetKey(asset.chain, asset.token);
  const rate = ratesMap?.[key]?.[quote] ?? 0;
  const converted = rate > 0 ? amount * rate : null;

  return (
    <Card className="bg-white">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${compact ? "px-3 pb-1 pt-3" : "pb-2"}`}>
        <CardTitle className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
          {asset.token} on {asset.chain}
        </CardTitle>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={compact ? "size-6" : "size-8"}
            onClick={onEdit}
            aria-label={`Edit ${asset.token} on ${asset.chain}`}
          >
            <Pencil className={compact ? "size-3" : "size-4"} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`text-destructive hover:text-destructive ${compact ? "size-6" : "size-8"}`}
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={`Delete ${asset.token} on ${asset.chain}`}
          >
            <Trash2 className={compact ? "size-3" : "size-4"} aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3 pt-0" : undefined}>
        <p className={compact ? "text-base font-semibold" : "text-2xl font-semibold"}>{asset.balance}</p>
        {converted != null && converted > 0 ? (
          <p className="text-xs text-muted-foreground">
            ≈ {formatInQuote(converted, quote)}
            {quote === "usdc" && " USDC"}
          </p>
        ) : ratesMap != null && amount > 0 ? (
          <p className="text-xs text-amber-600 dark:text-amber-500" title="Price feed not available for this token/chain.">
            Conversion unavailable
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {compact ? new Date(asset.updatedAt).toLocaleDateString() : `Updated ${new Date(asset.updatedAt).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
}

type AssetFormState = {
  chain: string;
  chainId: string;
  address: string;
  token: string;
  tokenAddress: string;
  balance: string;
};

const defaultForm: AssetFormState = {
  chain: "",
  chainId: "",
  address: "",
  token: "",
  tokenAddress: "",
  balance: "0",
};

function AssetFormBody({
  title,
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  formError = null,
  onCancel,
}: {
  title: string;
  initialValues: AssetFormState;
  onSubmit: (values: AssetFormState) => void;
  isSubmitting: boolean;
  submitLabel: string;
  formError?: string | null;
  onCancel: () => void;
}) {
  const [formState, setFormState] = useState<AssetFormState>(initialValues);
  const { chain, chainId, address, token, tokenAddress, balance } = formState;
  const setChain = (v: string) => setFormState((s) => ({ ...s, chain: v }));
  const setChainId = (v: string) => setFormState((s) => ({ ...s, chainId: v }));
  const setAddress = (v: string) => setFormState((s) => ({ ...s, address: v }));
  const setToken = (v: string) => setFormState((s) => ({ ...s, token: v }));
  const setTokenAddress = (v: string) => setFormState((s) => ({ ...s, tokenAddress: v }));
  const setBalance = (v: string) => setFormState((s) => ({ ...s, balance: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ chain, chainId, address, token, tokenAddress, balance });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="asset-chain">Chain</Label>
        <Input
          id="asset-chain"
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          placeholder="e.g. ethereum, polygon"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-chain-id">Chain ID</Label>
        <Input
          id="asset-chain-id"
          type="number"
          inputMode="numeric"
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          placeholder="e.g. 1 (Ethereum), 137 (Polygon)"
          required={title === "Add asset"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-address">Address</Label>
        <Input
          id="asset-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 0x… (wallet address)"
          required={title === "Add asset"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-token">Token / Symbol</Label>
        <Input
          id="asset-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="e.g. USDC, ETH"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-token-address">Token address</Label>
        <Input
          id="asset-token-address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="e.g. 0x… (contract address)"
          required={title === "Add asset"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset-balance">Balance</Label>
        <Input
          id="asset-balance"
          type="text"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0"
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AssetFormDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  formError = null,
  isLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValues: AssetFormState;
  onSubmit: (values: AssetFormState) => void;
  isSubmitting: boolean;
  submitLabel: string;
  formError?: string | null;
  isLoading?: boolean;
}) {
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const formKey = open
    ? `${initialValues.chain}-${initialValues.chainId}-${initialValues.address}-${initialValues.token}-${initialValues.tokenAddress}-${initialValues.balance}`
    : "closed";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading asset…
          </div>
        ) : (
          open && (
            <AssetFormBody
              key={formKey}
              title={title}
              initialValues={initialValues}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              submitLabel={submitLabel}
              formError={formError}
              onCancel={() => onOpenChange(false)}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function assetToFormState(asset: InventoryAssetRow): AssetFormState {
  return {
    chain: asset.chain ?? "",
    chainId: asset.chainId != null ? String(asset.chainId) : "",
    address: asset.address ?? "",
    token: asset.token ?? "",
    tokenAddress: asset.tokenAddress ?? "",
    balance: asset.balance ?? "0",
  };
}

type InventoryAssetContainerProps = { compact?: boolean };

export function InventoryAssetContainer({ compact }: InventoryAssetContainerProps = {}) {
  const { data: assets = [], isLoading, error, refetch, isFetching } = useGetInventoryQuery();
  const platformBase = useSelector(selectBaseCurrency);
  const [searchQuery, setSearchQuery] = useState("");
  const [quote, setQuote] = useState<QuoteCurrency>(platformBase);
  const [ratesMap, setRatesMap] = useState<RatesMap | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    setQuote(platformBase);
  }, [platformBase]);

  const fetchRatesForAssets = useCallback(async () => {
    if (assets.length === 0) {
      setRatesMap(null);
      setRatesLoading(false);
      return;
    }
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
    setRatesLoading(true);
    fetchRatesForAssets();
  }, [fetchRatesForAssets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.chain && a.chain.toLowerCase().includes(q)) ||
        (a.token && a.token.toLowerCase().includes(q)) ||
        (a.address && a.address.toLowerCase().includes(q)) ||
        (a.tokenAddress && a.tokenAddress.toLowerCase().includes(q))
    );
  }, [assets, searchQuery]);
  const [createInventory, { isLoading: isCreating }] = useCreateInventoryMutation();
  const [updateInventory, { isLoading: isUpdating }] = useUpdateInventoryMutation();
  const [deleteInventory] = useDeleteInventoryMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<InventoryAssetRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const exportData = useMemo((): Record<string, unknown>[] => {
    return filteredAssets.map((a) => ({
      id: a.id,
      chain: a.chain,
      token: a.token,
      balance: a.balance,
      updatedAt: a.updatedAt,
      address: a.address ?? "",
      tokenAddress: a.tokenAddress ?? "",
    }));
  }, [filteredAssets]);

  const { data: fullAsset, isLoading: isLoadingEditAsset } = useGetInventoryAssetQuery(
    editAsset?.id ?? "",
    { skip: !editAsset?.id }
  );

  const editInitialValues: AssetFormState = editAsset
    ? assetToFormState(fullAsset ?? editAsset)
    : defaultForm;

  const handleCreate = async (values: AssetFormState) => {
    setFormError(null);
    const chain = values.chain.trim();
    const token = values.token.trim();
    const address = values.address.trim();
    const tokenAddress = values.tokenAddress.trim();
    const chainIdRaw = values.chainId.trim();
    if (!chain || !token) {
      setFormError("Chain and token are required.");
      return;
    }
    if (!address) {
      setFormError("Address is required.");
      return;
    }
    if (!tokenAddress) {
      setFormError("Token address is required.");
      return;
    }
    if (!chainIdRaw) {
      setFormError("Chain ID is required and must be a number.");
      return;
    }
    const chainId = parseInt(chainIdRaw, 10);
    if (Number.isNaN(chainId) || chainId < 0) {
      setFormError("Chain ID must be a valid non-negative number.");
      return;
    }
    const body: CreateInventoryBody = {
      chain,
      chainId,
      address,
      tokenAddress,
      token,
      symbol: token,
      balance: values.balance.trim() || "0",
    };
    try {
      const result = await createInventory(body).unwrap();
      if (result.success) {
        setCreateOpen(false);
      } else {
        setFormError(result.error ?? "Create failed");
      }
    } catch (e) {
      const err = e as { data?: { error?: string }; error?: string };
      const message =
        err?.data?.error ?? err?.error ?? (e instanceof Error ? e.message : "Create failed");
      setFormError(message);
    }
  };

  const handleUpdate = async (values: AssetFormState) => {
    if (!editAsset) return;
    setFormError(null);
    const chain = values.chain.trim();
    const token = values.token.trim();
    const balance = values.balance.trim();
    const chainIdRaw = values.chainId.trim();
    const address = values.address.trim();
    const tokenAddress = values.tokenAddress.trim();
    const body: UpdateInventoryBody = {
      chain: chain || undefined,
      token: token || undefined,
      symbol: token || undefined,
      balance: balance || undefined,
    };
    if (chainIdRaw) {
      const chainId = parseInt(chainIdRaw, 10);
      if (!Number.isNaN(chainId) && chainId >= 0) body.chainId = chainId;
    }
    if (address) body.address = address;
    if (tokenAddress) body.tokenAddress = tokenAddress;
    try {
      const result = await updateInventory({ id: editAsset.id, body }).unwrap();
      if (result.success) {
        setEditAsset(null);
      } else {
        setFormError(result.error ?? "Update failed");
      }
    } catch (e) {
      const err = e as { data?: { error?: string }; error?: string; status?: number };
      const message =
        err?.data?.error ?? err?.error ?? (e instanceof Error ? e.message : "Update failed");
      setFormError(message);
    }
  };

  const handleDelete = async (asset: InventoryAssetRow) => {
    const confirmed = typeof window !== "undefined" && window.confirm(
      `Delete ${asset.token} on ${asset.chain}? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(asset.id);
    try {
      await deleteInventory(asset.id).unwrap();
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-xs font-medium text-muted-foreground" : "text-sm font-medium text-muted-foreground"}>
            Inventory assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={compact ? "grid gap-2 md:grid-cols-3 lg:grid-cols-4" : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`animate-pulse rounded-lg bg-slate-100 ${compact ? "h-20" : "h-28"}`}
                aria-hidden
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <p className="text-sm font-medium text-amber-800">
            Failed to load inventory. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currencySelect = (
    <Select value={quote} onValueChange={(v) => setQuote(v as QuoteCurrency)}>
      <SelectTrigger className="h-9 w-34" aria-label="Convert balances to">
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
  );

  return (
    <section className={compact ? "space-y-2" : "space-y-4"} aria-labelledby="inventory-assets-heading">
      {compact && assets.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Convert to</span>
          {currencySelect}
        </div>
      ) : null}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {assets.length > 0 && (
            <div className="relative w-full max-w-lg">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search by chain, token, ID, or address…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border border-slate-200 bg-white w-full max-w-xl"
                aria-label="Search assets"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Convert to</span>
            {currencySelect}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="gap-2"
              aria-label="Export assets"
            >
              <FileDown className="size-4" aria-hidden />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              aria-label="Refresh inventory"
            >
              <Loader2 className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="size-4 mr-1.5" aria-hidden />
              Add asset
            </Button>
          </div>
        </div>
      )}
      {assets.length === 0 ? (
        <EmptyState compact={compact} />
      ) : filteredAssets.length === 0 ? (
        <Card className="bg-white">
          <CardContent className={`flex flex-col items-center justify-center gap-2 text-center ${compact ? "py-6" : "py-12"}`}>
            <p className={compact ? "text-xs font-medium text-slate-600" : "text-sm font-medium text-slate-600"}>No assets match your search</p>
            {!compact && <p className="text-xs text-slate-500">Try a different term or clear the search.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className={compact ? "grid gap-2 md:grid-cols-3 lg:grid-cols-4" : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"}>
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={() => setEditAsset(asset)}
              onDelete={() => handleDelete(asset)}
              isDeleting={deletingId === asset.id}
              compact={compact}
              ratesMap={ratesLoading ? null : ratesMap}
              quote={quote}
            />
          ))}
        </div>
      )}

      <AssetFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) setFormError(null);
          setCreateOpen(open);
        }}
        title="Add asset"
        initialValues={defaultForm}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
        submitLabel="Create"
        formError={createOpen ? formError : null}
      />

      {editAsset && (
        <AssetFormDialog
          open={!!editAsset}
          onOpenChange={(open) => {
            if (!open) setEditAsset(null);
          }}
          title="Edit asset"
          initialValues={editInitialValues}
          onSubmit={handleUpdate}
          isSubmitting={isUpdating}
          submitLabel="Save"
          formError={editAsset ? formError : null}
          isLoading={isLoadingEditAsset}
        />
      )}

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <ExportDataModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        title="Export inventory assets"
        columns={INVENTORY_ASSETS_EXPORT_COLUMNS}
        data={exportData}
        filenamePrefix="inventory-assets"
      />
    </section>
  );
}
