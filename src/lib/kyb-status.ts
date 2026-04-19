/** Human-readable KYB / company verification labels (API uses SCREAMING_SNAKE). */

export function formatKybLabel(status: string | undefined): string {
  const s = (status ?? "NOT_STARTED").toUpperCase().replace(/ /g, "_");
  switch (s) {
    case "NOT_STARTED":
      return "Not started";
    case "PENDING":
      return "In review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "RESTRICTED":
      return "Restricted";
    default:
      return status?.replace(/_/g, " ") ?? "Unknown";
  }
}

export function isKybVerifiedStatus(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "approved" || normalized === "verified";
}

export function kybBadgeVariant(
  status: string | undefined
): "secondary" | "warning" | "success" | "destructive" | "outline" {
  const s = (status ?? "NOT_STARTED").toUpperCase().replace(/ /g, "_");
  switch (s) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
    case "RESTRICTED":
      return "destructive";
    default:
      return "secondary";
  }
}
