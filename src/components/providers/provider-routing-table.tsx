"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProviderRow, ProviderStatus } from "@/lib/data-providers";
import {
  useGetProvidersQuery,
  useUpdateProviderMutation,
  useRotateProviderKeyMutation,
} from "@/store/providers-api";
import { KeyRound } from "lucide-react";

const STATUS_LABELS: Record<ProviderStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  MAINTENANCE: "Maintenance",
};

const STATUS_VARIANTS: Record<ProviderStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  MAINTENANCE: "outline",
};

function RotateKeyDialog({
  provider,
  open,
  onOpenChange,
  onSuccess,
}: {
  provider: ProviderRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [rotateProviderKey, { isLoading }] = useRotateProviderKeyMutation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const key = apiKey.trim();
    if (!key) {
      setError("API key is required");
      return;
    }
    try {
      const result = await rotateProviderKey({ id: provider.id, apiKey: key }).unwrap();
      if (result.success) {
        setApiKey("");
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error ?? "Failed to update key");
      }
    } catch (e) {
      const err = e as { data?: { error?: string } };
      setError(err?.data?.error ?? "Failed to update key");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update API key — {provider.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rotate-key-input">New API key</Label>
            <Input
              id="rotate-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_..."
              className="font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              The key is stored securely. Only a masked value will be shown after saving.
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !apiKey.trim()}>
              {isLoading ? "Updating…" : "Update key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function feeEquals(a: number | null, b: number | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
}

function ProviderRowEdit({
  provider,
  onOpenRotateKey,
}: {
  provider: ProviderRow;
  onOpenRotateKey: (p: ProviderRow) => void;
}) {
  const [updateProvider] = useUpdateProviderMutation();
  const [priority, setPriority] = useState(String(provider.priority));
  const [fee, setFee] = useState(provider.fee != null ? String(provider.fee) : "");

  const handleEnabled = async (checked: boolean) => {
    try {
      await updateProvider({
        id: provider.id,
        body: { enabled: checked },
      }).unwrap();
    } catch {
      // Status indicator updated by baseQueryWithStatus
    }
  };

  const handlePriorityBlur = async () => {
    const n = Math.floor(parseInt(priority, 10) || 0);
    if (n === provider.priority) return;
    try {
      await updateProvider({
        id: provider.id,
        body: { priority: n },
      }).unwrap();
    } catch {
      setPriority(String(provider.priority));
    }
  };

  const handleFeeBlur = async () => {
    const raw = fee.trim();
    const val = raw === "" ? null : parseFloat(fee);
    if (val !== null && !Number.isFinite(val)) return;
    if (raw === "" && (provider.fee === null || provider.fee === undefined)) return;
    if (val !== null && feeEquals(val, provider.fee)) return;
    try {
      await updateProvider({
        id: provider.id,
        body: { fee: raw === "" ? null : val },
      }).unwrap();
    } catch {
      setFee(provider.fee != null ? String(provider.fee) : "");
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{provider.code}</TableCell>
        <TableCell className="text-muted-foreground">{provider.name}</TableCell>
        <TableCell>
          <Badge variant={STATUS_VARIANTS[provider.status]} className="bg-green-500 text-green-700 dark:text-green-400">
            {STATUS_LABELS[provider.status]}
          </Badge>
        </TableCell>
        <TableCell>
          <span
            className={`inline-flex items-center gap-1.5 ${provider.operational ? "text-green-600" : "text-slate-400"}`}
            aria-label={provider.operational ? "Operational" : "Not operational"}
          >
            <span
              className={`inline-block size-2 rounded-full ${provider.operational ? "bg-green-500" : "bg-slate-300"}`}
              aria-hidden
            />
            {provider.operational ? "Yes" : "No"}
          </span>
        </TableCell>
        <TableCell>
          <Switch
            checked={provider.enabled}
            onCheckedChange={handleEnabled}
            aria-label={`Enabled for ${provider.code}`}
          />
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {provider.apiKeyMasked ?? "—"}
        </TableCell>
        <TableCell>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenRotateKey(provider)}
            aria-label={`Update API key for ${provider.code}`}
          >
            <KeyRound className="size-4 mr-1" aria-hidden />
            Update key
          </Button>
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min={0}
            step={1}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            onBlur={handlePriorityBlur}
            className="w-16"
            aria-label={`Priority for ${provider.code}`}
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            onBlur={handleFeeBlur}
            placeholder="—"
            className="w-20"
            aria-label={`Fee for ${provider.code}`}
          />
        </TableCell>
      </TableRow>
    </>
  );
}

export function ProviderRoutingTable() {
  const { data: providers = [], isLoading, error } = useGetProvidersQuery();
  const [rotateProvider, setRotateProvider] = useState<ProviderRow | null>(null);

  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => a.priority - b.priority),
    [providers]
  );

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Provider routing</CardTitle>
          <p className="text-sm text-muted-foreground">
            Loading providers…
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-md bg-slate-100"
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
            Failed to load providers. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (providers.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Provider routing</CardTitle>
          <p className="text-sm text-muted-foreground">
            No providers found. Run db:seed to create SQUID, LIFI, ZERO_X, PAYSTACK.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Provider routing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status, operational, enabled, API key (masked), priority, and fee. Priority 1 is first in routing.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operational</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>API key</TableHead>
                <TableHead>Update key</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Fee (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProviders.map((provider) => (
                <ProviderRowEdit
                  key={provider.id}
                  provider={provider}
                  onOpenRotateKey={setRotateProvider}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        {rotateProvider && (
          <RotateKeyDialog
            provider={rotateProvider}
            open={!!rotateProvider}
            onOpenChange={(open) => !open && setRotateProvider(null)}
            onSuccess={() => setRotateProvider(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
