import { getSessionToken } from "@/lib/auth";
import { getCoreAdminBusinessesKyb } from "@/lib/core-api";

export type KybBusinessAdminRow = {
  id: string;
  name: string;
  slug: string;
  kybStatus: string;
  kybDiditSessionId: string | null;
  updatedAt: string;
};

function parseRow(item: unknown): KybBusinessAdminRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return {
    id,
    name: String(o.name ?? ""),
    slug: String(o.slug ?? ""),
    kybStatus: String(o.kybStatus ?? ""),
    kybDiditSessionId: o.kybDiditSessionId != null ? String(o.kybDiditSessionId) : null,
    updatedAt: String(o.updatedAt ?? ""),
  };
}

function unwrapEnvelope(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  if (o.success === false) return [];
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const d = inner as Record<string, unknown>;
    if (Array.isArray(d.businesses)) return d.businesses;
  }
  return [];
}

export async function getKybBusinessesForAdmin(
  q?: string,
  limit = 80
): Promise<{ ok: boolean; businesses: KybBusinessAdminRow[]; error?: string }> {
  try {
    const token = await getSessionToken();
    const result = await getCoreAdminBusinessesKyb({ q: q?.trim() || undefined, limit }, token ?? undefined);
    if (!result.ok) {
      const err = result.data as { error?: string } | undefined;
      return { ok: false, businesses: [], error: err?.error ?? `HTTP ${result.status}` };
    }
    const raw = unwrapEnvelope(result.data);
    const businesses = raw.map(parseRow).filter((r): r is KybBusinessAdminRow => r !== null);
    return { ok: true, businesses };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Core unavailable";
    return { ok: false, businesses: [], error: message };
  }
}
