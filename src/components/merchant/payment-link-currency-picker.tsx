"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLazyGetPublicCurrenciesQuery } from "@/store/merchant-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PaymentLinkCurrencyPickerProps = {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  chargeKind: "FIAT" | "CRYPTO";
  disabled?: boolean;
  /** Hide visible "Currency" label (keep screen-reader label). */
  labelSrOnly?: boolean;
  triggerPlaceholder?: string;
  triggerClassName?: string;
};

export function PaymentLinkCurrencyPicker({
  id: idProp,
  value,
  onChange,
  chargeKind,
  disabled,
  labelSrOnly,
  triggerPlaceholder,
  triggerClassName,
}: PaymentLinkCurrencyPickerProps) {
  const autoId = useId();
  const fieldId = idProp ?? autoId;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [trigger, result] = useLazyGetPublicCurrenciesQuery();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void trigger({ q: search.trim() || undefined });
    }, 280);
    return () => window.clearTimeout(t);
  }, [open, search, trigger]);

  const items = useMemo(() => {
    const list = result.data?.items ?? [];
    return list.filter((i) =>
      chargeKind === "CRYPTO" ? i.kind === "crypto" : i.kind === "fiat"
    );
  }, [result.data?.items, chargeKind]);

  const displayLabel = value.trim()
    ? value.trim().toUpperCase()
    : (triggerPlaceholder ?? "Search currency");

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className={labelSrOnly ? "sr-only" : undefined}>
        Currency
      </Label>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            id={fieldId}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              triggerClassName
            )}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[280px] p-2" align="start">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type code or name"
            className="mb-2 h-9"
            aria-label="Filter currencies"
          />
          <ul
            role="listbox"
            className="max-h-48 overflow-y-auto text-sm [scrollbar-width:auto] [&::-webkit-scrollbar]:w-2.5"
            aria-label="Currency options"
            onWheel={(e) => e.stopPropagation()}
          >
            {result.isFetching ? (
              <li className="px-2 py-2 text-muted-foreground">Loading…</li>
            ) : null}
            {!result.isFetching && items.length === 0 ? (
              <li className="px-2 py-2 text-muted-foreground">No matches.</li>
            ) : null}
            {items.map((item) => (
              <li key={`${item.kind}-${item.code}`} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={item.code === value.trim().toUpperCase()}
                  className={cn(
                    "flex w-full flex-col rounded px-2 py-1.5 text-left hover:bg-muted",
                    item.code === value.trim().toUpperCase() && "bg-muted"
                  )}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="font-medium">{item.code}</span>
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
