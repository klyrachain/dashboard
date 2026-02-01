"use client";

import { useState, useMemo } from "react";
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
import { ExportDataModal } from "@/components/export-data-modal";
import type { ExportColumn } from "@/lib/export-data";
import { FileDown, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

const INVENTORY_ASSETS_EXPORT_COLUMNS: ExportColumn[] = [
  { id: "id", label: "ID" },
  { id: "chain", label: "Chain" },
  { id: "token", label: "Token" },
  { id: "balance", label: "Balance" },
  { id: "updatedAt", label: "Updated" },
  { id: "address", label: "Address" },
  { id: "tokenAddress", label: "Token address" },
];

function EmptyState() {
  return (
    <Card className="bg-white">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl text-slate-400" aria-hidden>
            —
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">No inventory assets</p>
          <p className="text-xs text-slate-500">
            Add an asset to track balances by chain and token.
          </p>
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
}: {
  asset: InventoryAssetRow;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {asset.token} on {asset.chain}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
            aria-label={`Edit ${asset.token} on ${asset.chain}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={`Delete ${asset.token} on ${asset.chain}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{asset.balance}</p>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(asset.updatedAt).toLocaleDateString()}
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
      <DialogContent>
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

export function InventoryAssetContainer() {
  const { data: assets = [], isLoading, error, refetch, isFetching } = useGetInventoryQuery();
  const [searchQuery, setSearchQuery] = useState("");

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
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inventory assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-slate-100"
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

  return (
    <section className="space-y-4" aria-labelledby="inventory-assets-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="inventory-assets-heading" className="text-lg font-semibold tracking-tight">
          Inventory assets
        </h2>
        <div className="flex items-center gap-2">
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

      {assets.length > 0 && (
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search by chain, token, ID, or address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border border-slate-200 bg-white"
            aria-label="Search assets"
          />
        </div>
      )}

      {assets.length === 0 ? (
        <EmptyState />
      ) : filteredAssets.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">No assets match your search</p>
            <p className="text-xs text-slate-500">Try a different term or clear the search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={() => setEditAsset(asset)}
              onDelete={() => handleDelete(asset)}
              isDeleting={deletingId === asset.id}
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
