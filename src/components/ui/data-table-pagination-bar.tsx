"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PRESETS = [10, 25, 50, 100] as const;

export type DataTablePaginationBarProps = {
  /** 1-based page index */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  presets?: readonly number[];
  className?: string;
};

export function DataTablePaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  presets = DEFAULT_PRESETS,
  className,
}: DataTablePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const applyCustomPageSize = useCallback(() => {
    const n = parseInt(pageSizeInput.trim(), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 200) {
      onPageSizeChange(n);
    } else {
      setPageSizeInput(String(pageSize));
    }
  }, [pageSizeInput, pageSize, onPageSizeChange]);

  const handlePreset = useCallback(
    (value: string) => {
      if (value === "custom") return;
      const n = parseInt(value, 10);
      if (Number.isFinite(n)) onPageSizeChange(n);
    },
    [onPageSizeChange]
  );

  const presetValue = presets.includes(pageSize as (typeof presets)[number])
    ? String(pageSize)
    : "custom";

  return (
    <nav
      className={className}
      aria-label="Table pagination"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={presetValue} onValueChange={handlePreset}>
            <SelectTrigger className="w-[90px]" aria-label="Rows per page preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">or</span>
          <Input
            type="number"
            min={1}
            max={200}
            placeholder="Any"
            value={pageSizeInput}
            onChange={(e) => setPageSizeInput(e.target.value)}
            onBlur={applyCustomPageSize}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCustomPageSize();
            }}
            className="w-[72px] tabular-nums"
            aria-label="Custom rows per page"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted-foreground tabular-nums">
            Page {safePage} of {totalPages}
            {total > 0 ? (
              <span className="ml-2 text-xs">
                ({total} total)
              </span>
            ) : null}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
