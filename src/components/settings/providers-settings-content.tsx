"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, CreditCard, Layers, GripVertical } from "lucide-react";
import type { ProviderRow, ProviderStatus } from "@/lib/data-providers";
import {
  updateProviderRoutingAction,
  rotateProviderKeyRoutingAction,
} from "@/app/settings/actions";

/** Sort by priority ascending (1 first). */
function sortByPriority(rows: ProviderRow[]): ProviderRow[] {
  return [...rows].sort((a, b) => a.priority - b.priority);
}

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SQUID: Route,
  LIFI: Route,
  ZERO_X: Layers,
  "0X": Layers,
  PAYSTACK: CreditCard,
};

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

type SortableProviderCardProps = {
  provider: ProviderRow;
  savingId: string | null;
  apiKeyByProvider: Record<string, string>;
  updatingKeyFor: string | null;
  setProvider: (id: string, patch: Partial<ProviderRow>) => void;
  setApiKeyByProvider: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onEnabled: (id: string, checked: boolean) => void;
  onSaveProvider: (provider: ProviderRow) => void;
  onRotateKey: (id: string, apiKey: string) => void;
};

function SortableProviderCard({
  provider,
  savingId,
  apiKeyByProvider,
  updatingKeyFor,
  setProvider,
  setApiKeyByProvider,
  onEnabled,
  onSaveProvider,
  onRotateKey,
}: SortableProviderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = PROVIDER_ICONS[provider.code] ?? Route;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-white ${isDragging ? "opacity-80 shadow-lg ring-2 ring-primary/20" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="touch-none cursor-grab active:cursor-grabbing rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 shrink-0">
            <Icon className="size-5 text-slate-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{provider.name}</p>
            <p className="text-xs font-mono uppercase text-slate-500">
              {provider.code}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[provider.status]} className="shrink-0">
            {STATUS_LABELS[provider.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Operational</span>
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
        </div>
        <div className="flex items-center justify-between text-sm">
          <Label htmlFor={`enabled-${provider.id}`} className="text-slate-600">
            Enabled
          </Label>
          <Switch
            id={`enabled-${provider.id}`}
            checked={provider.enabled}
            onCheckedChange={(checked) => onEnabled(provider.id, checked)}
          />
        </div>
        <div className="space-y-1 text-sm">
          <Label className="text-slate-500">API key</Label>
          <p className="font-mono text-xs text-slate-600">
            {provider.apiKeyMasked ?? "—"}
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
                updatingKeyFor !== null ||
                !(apiKeyByProvider[provider.id]?.trim())
              }
              onClick={() =>
                onRotateKey(provider.id, apiKeyByProvider[provider.id] ?? "")
              }
            >
              {updatingKeyFor === provider.id ? "Updating…" : "Update key"}
            </Button>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <Label htmlFor={`fee-${provider.id}`}>Fee (%)</Label>
          <Input
            id={`fee-${provider.id}`}
            type="number"
            min={0}
            step={0.1}
            value={provider.fee != null ? provider.fee : ""}
            onChange={(e) => {
              const v = e.target.value;
              setProvider(provider.id, {
                fee: v === "" ? null : parseFloat(v) || 0,
              });
            }}
            placeholder="—"
            className="w-20"
          />
        </div>
        <Button
          size="sm"
          disabled={savingId !== null}
          onClick={() => onSaveProvider(provider)}
        >
          {savingId === provider.id ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

type ProvidersSettingsContentProps = {
  initialProviders?: ProviderRow[] | null;
};

export function ProvidersSettingsContent({ initialProviders }: ProvidersSettingsContentProps) {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [apiKeyByProvider, setApiKeyByProvider] = useState<Record<string, string>>({});
  const [updatingKeyFor, setUpdatingKeyFor] = useState<string | null>(null);
  const initialOrderRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (initialProviders?.length) {
      const sorted = sortByPriority(initialProviders);
      setProviders(sorted);
      if (initialOrderRef.current === null) {
        initialOrderRef.current = sorted.map((p) => p.id);
      }
    }
  }, [initialProviders]);

  const sortedProviders = useMemo(() => sortByPriority(providers), [providers]);

  const orderDirty = useMemo(() => {
    const current = sortedProviders.map((p) => p.id);
    const initial = initialOrderRef.current ?? [];
    return (
      current.length !== initial.length ||
      current.some((id, i) => id !== initial[i])
    );
  }, [sortedProviders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedProviders.findIndex((p) => p.id === active.id);
    const newIndex = sortedProviders.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortedProviders, oldIndex, newIndex).map(
      (p, i) => ({ ...p, priority: i + 1 })
    );
    setProviders(reordered);
  };

  const handleSaveOrder = async () => {
    setSaveError(null);
    setSavingOrder(true);
    let err: string | null = null;
    for (const p of sortedProviders) {
      const result = await updateProviderRoutingAction(p.id, {
        priority: p.priority,
      });
      if (!result.success) {
        err = result.error ?? "Failed to save order";
        break;
      }
    }
    setSaveError(err);
    setSavingOrder(false);
    if (!err) {
      initialOrderRef.current = sortedProviders.map((p) => p.id);
      router.refresh();
    }
  };

  const setProvider = (id: string, patch: Partial<ProviderRow>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleEnabled = (id: string, checked: boolean) => {
    setProvider(id, { enabled: checked });
  };

  const handleSaveProvider = async (provider: ProviderRow) => {
    setSaveError(null);
    setSavingId(provider.id);
    try {
      const result = await updateProviderRoutingAction(provider.id, {
        enabled: provider.enabled,
        priority: provider.priority,
        fee: provider.fee,
      });
      if (result.success) {
        router.refresh();
      } else {
        setSaveError(result.error ?? "Update failed");
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleRotateKey = async (id: string, apiKey: string) => {
    const key = apiKey.trim();
    if (!key) return;
    setUpdatingKeyFor(id);
    setSaveError(null);
    const result = await rotateProviderKeyRoutingAction(id, key);
    setUpdatingKeyFor(null);
    if (result.success) {
      setApiKeyByProvider((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      router.refresh();
    } else {
      setSaveError(result.error ?? "Update key failed");
    }
  };

  if (providers.length === 0 && initialProviders !== undefined) {
    return (
      <Card className="bg-white">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">No providers found</p>
          <p className="text-xs text-slate-500">
            Run db:seed to create SQUID, LIFI, ZERO_X, PAYSTACK.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {orderDirty && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={savingOrder || savingId !== null}
            onClick={handleSaveOrder}
          >
            {savingOrder ? "Saving order…" : "Save order"}
          </Button>
          <span className="text-xs text-slate-500">
            Drag cards to reorder; priority is set by position (1 = first).
          </span>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedProviders.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {sortedProviders.map((provider) => (
              <SortableProviderCard
                key={provider.id}
                provider={provider}
                savingId={savingId}
                apiKeyByProvider={apiKeyByProvider}
                updatingKeyFor={updatingKeyFor}
                setProvider={setProvider}
                setApiKeyByProvider={setApiKeyByProvider}
                onEnabled={handleEnabled}
                onSaveProvider={handleSaveProvider}
                onRotateKey={handleRotateKey}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
