/**
 * Access API data layer — current API key context (platform vs merchant).
 * Business portal users hold JWT in localStorage; server uses `klyra_portal_role=merchant` cookie to branch SSR.
 * @see md/access-api.integration.md
 */

import { cookies } from "next/headers";
import { getSessionToken } from "@/lib/auth";
import { getCoreAccess } from "@/lib/core-api";

async function isMerchantPortalRoleCookie(): Promise<boolean> {
  try {
    const c = await cookies();
    return c.get("klyra_portal_role")?.value === "merchant";
  } catch {
    return false;
  }
}

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
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreAccess(token ?? undefined);

    if (ok && data && typeof data === "object") {
      const envelope = data as {
        success?: boolean;
        data?: unknown;
        error?: string;
      };
      if (envelope.success !== false) {
        const payload = envelope.data;
        if (payload && typeof payload === "object") {
          const p = payload as Record<string, unknown>;
          const type = p.type === "merchant" ? "merchant" : "platform";
          const key = parseKey(p.key);
          if (key) {
            const business =
              type === "merchant" && p.business
                ? parseBusiness(p.business)
                : undefined;
            return {
              ok: true,
              context: { type, key, business: business ?? undefined },
            };
          }
        }
      }
    }

    if (await isMerchantPortalRoleCookie()) {
      return {
        ok: true,
        context: {
          type: "merchant",
          key: {
            id: "business_portal",
            name: "Business portal",
            permissions: [],
          },
        },
      };
    }

    const err =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: string }).error)
        : status === 401
          ? "Unauthorized"
          : "Request failed";
    return { ok: false, context: null, error: err };
  } catch (e) {
    if (await isMerchantPortalRoleCookie()) {
      return {
        ok: true,
        context: {
          type: "merchant",
          key: {
            id: "business_portal",
            name: "Business portal",
            permissions: [],
          },
        },
      };
    }
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, context: null, error: message };
  }
}
