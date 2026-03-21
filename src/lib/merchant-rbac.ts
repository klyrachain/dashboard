/**
 * Portal JWT role checks for merchant dashboard UI (§2.1 merchant.v1.md).
 * When `role` is unknown, prefer hiding privileged actions.
 */

export function canMerchantRefund(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN" || r === "FINANCE";
}

export function canManageBusinessProfile(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

export function canManageApiKeysOrWebhooks(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN" || r === "DEVELOPER";
}

export function canManageFinanceExports(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN" || r === "FINANCE";
}

/** Payout methods + withdrawal requests (merchant.v1.md §2.1). */
export function canManagePayoutMethods(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN" || r === "FINANCE";
}
