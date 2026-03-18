export const env = {
  /**
   * Origin for the business auth API (e.g. http://localhost:4000).
   * Used by business auth helpers; safe to expose as it is just a base URL.
   */
  businessApiOrigin:
    process.env.NEXT_PUBLIC_BUSINESS_API_ORIGIN ??
    process.env.BUSINESS_API_ORIGIN ??
    "",
} as const;

