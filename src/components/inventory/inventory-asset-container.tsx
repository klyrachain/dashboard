"use client";

import { useState, useEffect } from "react";
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
  useCreateInventoryMutation,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation,
  type CreateInventoryBody,
  type UpdateInventoryBody,
} from "@/store/inventory-api";
import { Pencil, Trash2, Plus } from "lucide-react";

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
  token: string;
  balance: string;
};

const defaultForm: AssetFormState = {
  chain: "",
  token: "",
  balance: "0",
};

function AssetFormDialog({
  open,
  onOpenChange,
  title,
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValues: AssetFormState;
  onSubmit: (values: AssetFormState) => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const [chain, setChain] = useState(initialValues.chain);
  const [token, setToken] = useState(initialValues.token);
  const [balance, setBalance] = useState(initialValues.balance);

  useEffect(() => {
    if (open) {
      setChain(initialValues.chain);
      setToken(initialValues.token);
      setBalance(initialValues.balance);
    }
  }, [open, initialValues.chain, initialValues.token, initialValues.balance]);

  const reset = () => {
    setChain(initialValues.chain);
    setToken(initialValues.token);
    setBalance(initialValues.balance);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ chain, token, balance });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryAssetContainer() {
  const { data: assets = [], isLoading, error } = useGetInventoryQuery();
  const [createInventory, { isLoading: isCreating }] = useCreateInventoryMutation();
  const [updateInventory, { isLoading: isUpdating }] = useUpdateInventoryMutation();
  const [deleteInventory] = useDeleteInventoryMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<InventoryAssetRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (values: AssetFormState) => {
    setFormError(null);
    const body: CreateInventoryBody = {
      chain: values.chain.trim(),
      token: values.token.trim(),
      symbol: values.token.trim(),
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
      const err = e as { data?: { error?: string } };
      setFormError(err?.data?.error ?? "Create failed");
    }
  };

  const handleUpdate = async (values: AssetFormState) => {
    if (!editAsset) return;
    setFormError(null);
    const body: UpdateInventoryBody = {
      chain: values.chain.trim(),
      token: values.token.trim(),
      symbol: values.token.trim(),
      balance: values.balance.trim(),
    };
    try {
      const result = await updateInventory({ id: editAsset.id, body }).unwrap();
      if (result.success) {
        setEditAsset(null);
      } else {
        setFormError(result.error ?? "Update failed");
      }
    } catch (e) {
      const err = e as { data?: { error?: string } };
      setFormError(err?.data?.error ?? "Update failed");
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
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="size-4 mr-1.5" aria-hidden />
          Add asset
        </Button>
      </div>

      {assets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
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
        onOpenChange={setCreateOpen}
        title="Add asset"
        initialValues={defaultForm}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
        submitLabel="Create"
      />

      {editAsset && (
        <AssetFormDialog
          open={!!editAsset}
          onOpenChange={(open) => !open && setEditAsset(null)}
          title="Edit asset"
          initialValues={{
            chain: editAsset.chain,
            token: editAsset.token,
            balance: editAsset.balance,
          }}
          onSubmit={handleUpdate}
          isSubmitting={isUpdating}
          submitLabel="Save"
        />
      )}

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
    </section>
  );
}
