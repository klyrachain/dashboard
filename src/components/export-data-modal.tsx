"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  exportToCsv,
  exportToPdf,
  exportToXlsx,
  type ExportColumn,
} from "@/lib/export-data";
import { FileDown } from "lucide-react";

export type ExportDataModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** All columns that can be exported (id + label). */
  columns: ExportColumn[];
  /** Row data (objects keyed by column id). */
  data: Record<string, unknown>[];
  /** Filename prefix for downloads (e.g. "transactions", "inventory-history"). */
  filenamePrefix: string;
  /** Whether to show "Include charts" option (for PDF and Excel). */
  includeChartsOption?: boolean;
  /** When includeChartsOption is true and user exports PDF/XLSX with charts, call this to get chart image data URLs. */
  getChartImageDataUrls?: () => string[] | Promise<string[]>;
};

export function ExportDataModal({
  open,
  onOpenChange,
  title,
  columns,
  data,
  filenamePrefix,
  includeChartsOption = false,
  getChartImageDataUrls,
}: ExportDataModalProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() =>
    new Set(columns.map((c) => c.id))
  );
  const [includeCharts, setIncludeCharts] = React.useState(false);
  const [exporting, setExporting] = React.useState<string | null>(null);

  const selectedColumns = React.useMemo(
    () => columns.filter((c) => selectedIds.has(c.id)),
    [columns, selectedIds]
  );

  const toggleColumn = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(columns.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExportCsv = () => {
    if (selectedColumns.length === 0) return;
    setExporting("csv");
    try {
      exportToCsv(selectedColumns, data, filenamePrefix);
    } finally {
      setExporting(null);
      onOpenChange(false);
    }
  };

  const handleExportPdf = async () => {
    if (selectedColumns.length === 0) return;
    setExporting("pdf");
    try {
      let chartUrls: string[] = [];
      if (includeChartsOption && includeCharts && getChartImageDataUrls) {
        chartUrls = await getChartImageDataUrls();
      }
      await exportToPdf(selectedColumns, data, filenamePrefix, {
        includeCharts: includeChartsOption && includeCharts,
        chartImageDataUrls: chartUrls.length ? chartUrls : undefined,
      });
    } finally {
      setExporting(null);
      onOpenChange(false);
    }
  };

  const handleExportXlsx = async () => {
    if (selectedColumns.length === 0) return;
    setExporting("xlsx");
    try {
      await exportToXlsx(selectedColumns, data, filenamePrefix, {
        includeCharts: includeChartsOption && includeCharts,
      });
    } finally {
      setExporting(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="size-5" aria-hidden />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Columns to export</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-8 text-xs"
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-8 text-xs"
                >
                  Deselect all
                </Button>
              </div>
            </div>
            <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 p-3">
              {columns.map((col) => (
                <label
                  key={col.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="size-4 rounded border-slate-300"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
            {selectedColumns.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Select at least one column to export.
              </p>
            )}
          </div>
          {includeChartsOption && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include-charts"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="size-4 rounded border-slate-300"
              />
              <Label htmlFor="include-charts" className="text-sm font-normal cursor-pointer">
                Include charts in PDF and Excel
              </Label>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={!!exporting}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={selectedColumns.length === 0 || !!exporting}
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={selectedColumns.length === 0 || !!exporting}
          >
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportXlsx}
            disabled={selectedColumns.length === 0 || !!exporting}
          >
            {exporting === "xlsx" ? "Exporting…" : "Export XLSX"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
