/**
 * Access API data layer — current API key context (platform vs merchant).
 * @see md/access-api.integration.md
 */

import { getCoreAccess } from "@/lib/core-api";

export type AccessKey = {
  id: string;
  name: string;
  permissions: string[];
};

export type AccessBusiness = {
  id: string;
  name: string;
  slug: string;
};

export type AccessContext = {
  type: "platform" | "merchant";
  key: AccessKey;
  business?: AccessBusiness;
};

export type AccessResult = {
  ok: boolean;
  context: AccessContext | null;
  error?: string;
};

function parseKey(raw: unknown): AccessKey | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const name = typeof o.name === "string" ? o.name : "";
  const perms = Array.isArray(o.permissions) ? o.permissions.filter((p): p is string => typeof p === "string") : [];
  if (!id) return null;
  return { id, name, permissions: perms };
}

function parseBusiness(raw: unknown): AccessBusiness | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const name = typeof o.name === "string" ? o.name : "";
  const slug = typeof o.slug === "string" ? o.slug : "";
  if (!id || !name) return null;
  return { id, name, slug };
}

/**
 * Fetch access context from GET /api/access. Use to branch UI (platform vs merchant).
 */
export async function getAccessContext(): Promise<AccessResult> {
  try {
    const { ok, status, data } = await getCoreAccess();
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 401
            ? "Unauthorized"
            : "Request failed";
      return { ok: false, context: null, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown; error?: string };
    if (envelope.success === false) {
      return { ok: false, context: null, error: envelope.error ?? "Request failed" };
    }
    const payload = envelope.data;
    if (!payload || typeof payload !== "object") {
      return { ok: false, context: null, error: "Invalid response" };
    }
    const p = payload as Record<string, unknown>;
    const type = p.type === "merchant" ? "merchant" : "platform";
    const key = parseKey(p.key);
    if (!key) return { ok: false, context: null, error: "Invalid key" };
    const business = type === "merchant" && p.business ? parseBusiness(p.business) : undefined;
    return {
      ok: true,
      context: { type, key, business: business ?? undefined },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, context: null, error: message };
  }
}
