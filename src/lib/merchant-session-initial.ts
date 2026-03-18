import type { AccessResult } from "@/lib/data-access";
import type { MerchantSessionState } from "@/store/merchant-session-slice";

/**
 * Maps Core GET /api/access result into Redux merchant session preload.
 */
export function merchantSessionFromAccess(access: AccessResult): Partial<MerchantSessionState> {
  if (!access.ok || !access.context) {
    return {
      sessionType: "platform",
      activeBusinessId: null,
      businesses: [],
    };
  }
  const { type, business } = access.context;
  if (type === "platform") {
    return {
      sessionType: "platform",
      activeBusinessId: null,
      businesses: [],
    };
  }
  const businesses = business
    ? [{ id: business.id, name: business.name, slug: business.slug }]
    : [];
  const activeBusinessId = businesses.length === 1 ? businesses[0].id : null;
  return {
    sessionType: "merchant",
    businesses,
    activeBusinessId,
  };
}
