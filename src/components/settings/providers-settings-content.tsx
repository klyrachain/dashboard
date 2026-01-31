"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Route, CreditCard, Layers } from "lucide-react";
import type { SettingsProvider, SettingsProviders } from "@/lib/data-settings";
import { saveProvidersAction, saveProviderByIdAction } from "@/app/settings/actions";

const PROVIDER_NAMES: Record<string, string> = {
  SQUID: "Squid Router",
  LIFI: "LiFi",
  "0X": "0x",
  PAYSTACK: "Paystack",
};

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SQUID: Route,
  LIFI: Route,
  "0X": Layers,
  PAYSTACK: CreditCard,
};

type ProviderState = SettingsProvider & {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "operational" | "degraded" | "down";
};

function statusFromApi(s?: string | null, latencyMs?: number | null): ProviderState["status"] {
  if (s === "down") return "down";
  if (s === "degraded") return "degraded";
  if (latencyMs != null && latencyMs > 2000) return "degraded";
  return "operational";
}

function StatusDot({ status }: { status: ProviderState["status"] }) {
  const color =
    status === "operational"
      ? "bg-green-500"
      : status === "degraded"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span
      className={`inline-block size-2 rounded-full ${color}`}
      aria-hidden
    />
  );
}

type ProvidersSettingsContentProps = {
  initialData?: SettingsProviders | null;
};

export function ProvidersSettingsContent({ initialData }: ProvidersSettingsContentProps) {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [maxSlippage, setMaxSlippage] = useState("0.5");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiKeyByProvider, setApiKeyByProvider] = useState<Record<string, string>>({});
  const [updatingKeyFor, setUpdatingKeyFor] = useState<string | null>(null);

  useEffect(() => {
    if (initialData?.providers?.length) {
      setProviders(
        initialData.providers.map((p) => ({
          ...p,
          name: PROVIDER_NAMES[p.id] ?? p.id,
          icon: PROVIDER_ICONS[p.id] ?? Route,
          status: statusFromApi(p.status, p.latencyMs),
        }))
      );
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData) {
      setMaxSlippage(String(initialData.maxSlippagePercent));
    }
  }, [initialData]);

  const setProvider = (id: string, patch: Partial<ProviderState>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id} className="bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">
                  <provider.icon className="size-5 text-slate-600" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{provider.name}</p>
                  <p className="text-xs font-mono uppercase text-slate-500">
                    {provider.id}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="flex items-center gap-1.5 capitalize">
                  <StatusDot status={provider.status} />
                  {provider.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor={`enabled-${provider.id}`} className="text-slate-600">
                  Enabled
                </Label>
                <Switch
                  id={`enabled-${provider.id}`}
                  checked={provider.enabled}
                  onCheckedChange={(checked) =>
                    setProvider(provider.id, { enabled: checked })
                  }
                />
              </div>
              <div className="space-y-1 text-sm">
                <Label className="text-slate-500">API key</Label>
                <p className="font-mono text-xs text-slate-600">
                  {provider.apiKeyMasked}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="password"
                    placeholder="Set or rotate key"
                    className="h-8 font-mono text-xs max-w-[200px]"
                    value={apiKeyByProvider[provider.id] ?? ""}
                    onChange={(e) =>
                      setApiKeyByProvider((prev) => ({
                        ...prev,
                        [provider.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      updatingKeyFor !== null || !(apiKeyByProvider[provider.id]?.trim())
                    }
                    onClick={async () => {
                      const key = apiKeyByProvider[provider.id]?.trim();
                      if (!key) return;
                      setUpdatingKeyFor(provider.id);
                      setSaveError(null);
                      const result = await saveProviderByIdAction(provider.id, {
                        apiKey: key,
                      });
                      setUpdatingKeyFor(null);
                      if (result.success) {
                        setApiKeyByProvider((prev) => {
                          const next = { ...prev };
                          delete next[provider.id];
                          return next;
                        });
                        router.refresh();
                      } else {
                        setSaveError(result.error ?? "Update failed");
                      }
                    }}
                  >
                    {updatingKeyFor === provider.id ? "Updating…" : "Update key"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <Label htmlFor={`priority-${provider.id}`}>Priority</Label>
                <Input
                  id={`priority-${provider.id}`}
                  type="number"
                  min={1}
                  max={10}
                  value={provider.priority}
                  onChange={(e) =>
                    setProvider(provider.id, {
                      priority: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-20"
                />
              </div>
              {provider.latencyMs != null && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Latency (avg)</span>
                  <span className="tabular-nums">{provider.latencyMs}ms</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white">
        <CardHeader>
          <p className="font-semibold text-slate-900">Slippage configuration</p>
          <p className="text-sm text-slate-500">
            Max allowed slippage for swap routing (e.g. 0.5% or 1.0%).
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={maxSlippage}
              onChange={(e) => setMaxSlippage(e.target.value)}
              placeholder="0.5"
              className="w-24"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </CardContent>
      </Card>

      {saveError && (
        <p className="text-sm text-destructive" role="alert">{saveError}</p>
      )}
      <Button
        disabled={saving || providers.length === 0}
        onClick={async () => {
          setSaving(true);
          setSaveError(null);
          const maxSlippagePercent = parseFloat(maxSlippage);
          const result = await saveProvidersAction({
            maxSlippagePercent: Number.isFinite(maxSlippagePercent)
              ? Math.max(0, Math.min(100, maxSlippagePercent))
              : undefined,
            providers: providers.map((p) => ({
              id: p.id,
              enabled: p.enabled,
              priority: p.priority,
            })),
          });
          setSaving(false);
          if (result.success) {
            router.refresh();
          } else {
            setSaveError(result.error ?? "Save failed");
          }
        }}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
