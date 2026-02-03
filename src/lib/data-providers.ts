/**
 * Provider Routing API — types and normalizers for GET /api/providers, PATCH, rotate-key.
 * @see Provider % Routing API — Frontend Integration Report
 */

export type ProviderStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type ProviderRow = {
  id: string;
  code: string;
  name: string;
  status: ProviderStatus;
  operational: boolean;
  enabled: boolean;
  apiKeyMasked: string | null;
  priority: number;
  fee: number | null;
  createdAt: string;
  updatedAt: string;
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Normalize Core API provider object to ProviderRow. */
export function parseProvider(raw: unknown): ProviderRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const code = str(o.code) || str(o.name) || "—";
  const name = str(o.name) || code;
  const status =
    o.status === "ACTIVE" || o.status === "INACTIVE" || o.status === "MAINTENANCE"
      ? o.status
      : "ACTIVE";
  const operational = o.operational === true;
  const enabled = o.enabled === true;
  const apiKeyMasked =
    o.apiKeyMasked != null && typeof o.apiKeyMasked === "string"
      ? o.apiKeyMasked
      : null;
  const priority = typeof o.priority === "number" ? Math.floor(o.priority) : 1;
  const fee =
    o.fee != null && typeof o.fee === "number" && Number.isFinite(o.fee)
      ? o.fee
      : null;
  const createdAt =
    o.createdAt instanceof Date
      ? o.createdAt.toISOString()
      : typeof o.createdAt === "string"
        ? o.createdAt
        : new Date().toISOString();
  const updatedAt =
    o.updatedAt instanceof Date
      ? o.updatedAt.toISOString()
      : typeof o.updatedAt === "string"
        ? o.updatedAt
        : createdAt;
  return {
    id,
    code,
    name,
    status,
    operational,
    enabled,
    apiKeyMasked,
    priority,
    fee,
    createdAt,
    updatedAt,
  };
}

/** Normalize envelope { success, data: [...] } or raw array to ProviderRow[]. */
export function parseProvidersList(raw: unknown): ProviderRow[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as { success?: boolean; data?: unknown[] };
  if (o.success === true && Array.isArray(o.data)) {
    return o.data.map(parseProvider).filter((p): p is ProviderRow => p != null);
  }
  if (Array.isArray(o)) {
    return (o as unknown[]).map(parseProvider).filter((p): p is ProviderRow => p != null);
  }
  if ("data" in o && Array.isArray((o as { data: unknown[] }).data)) {
    return (o as { data: unknown[] }).data
      .map(parseProvider)
      .filter((p): p is ProviderRow => p != null);
  }
  return [];
}

/** Fetch providers from Core GET /api/providers (server-side). Use for Settings > Providers. */
export async function getProvidersFromCore(): Promise<{
  ok: boolean;
  data: ProviderRow[];
  error?: string;
}> {
  const { getSessionToken } = await import("@/lib/auth");
  const { getCoreProviders } = await import("@/lib/core-api");
  const token = await getSessionToken();
  const result = await getCoreProviders(token ?? undefined);
  if (!result.ok) {
    const err =
      result.data && typeof result.data === "object" && "error" in result.data
        ? String((result.data as { error: string }).error)
        : "Request failed";
    return { ok: false, data: [], error: err };
  }
  const data = parseProvidersList(result.data);
  return { ok: true, data };
}
