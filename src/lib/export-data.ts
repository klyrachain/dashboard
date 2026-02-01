/**
 * Client-side export of table data to CSV, PDF, and XLSX.
 */

export type ExportColumn = { id: string; label: string };

function escapeCsvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
}

function cellValue(row: Record<string, unknown>, columnId: string): string {
  const v = row[columnId];
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Export data to CSV with selected columns only.
 */
export function exportToCsv(
  columns: ExportColumn[],
  data: Record<string, unknown>[],
  filenamePrefix: string
): void {
  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((c) => escapeCsvCell(cellValue(row, c.id)))
  );
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data to PDF with selected columns. Optionally add a "Charts" placeholder page.
 */
export async function exportToPdf(
  columns: ExportColumn[],
  data: Record<string, unknown>[],
  filenamePrefix: string,
  options?: { includeCharts?: boolean; chartImageDataUrls?: string[] }
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((c) => cellValue(row, c.id))
  );

  autoTable(doc, {
    head,
    body,
    startY: 10,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [71, 85, 105] },
  });

  if (options?.includeCharts && options?.chartImageDataUrls?.length) {
    options.chartImageDataUrls.forEach((dataUrl, i) => {
      doc.addPage("landscape");
      doc.setFontSize(12);
      doc.text(`Chart ${i + 1}`, 10, 15);
      try {
        doc.addImage(dataUrl, "PNG", 10, 20, 270, 160);
      } catch {
        doc.text("(Chart image could not be embedded)", 10, 30);
      }
    });
  } else if (options?.includeCharts) {
    doc.addPage("landscape");
    doc.setFontSize(12);
    doc.text("Charts", 10, 15);
    doc.setFontSize(10);
    doc.text("Charts are included when exporting from the Transactions page with charts visible.", 10, 25);
  }

  doc.save(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Export data to XLSX with selected columns. Optionally add a "Charts" sheet.
 */
export async function exportToXlsx(
  columns: ExportColumn[],
  data: Record<string, unknown>[],
  filenamePrefix: string,
  options?: { includeCharts?: boolean }
): Promise<void> {
  const XLSX = await import("xlsx");

  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((c) => cellValue(row, c.id))
  );
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  if (options?.includeCharts) {
    const chartSheetData = [
      ["Charts"],
      [""],
      ["Charts are included when exporting from the Transactions page with charts visible."],
    ];
    const chartWs = XLSX.utils.aoa_to_sheet(chartSheetData);
    XLSX.utils.book_append_sheet(wb, chartWs, "Charts");
  }

  XLSX.writeFile(wb, `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
