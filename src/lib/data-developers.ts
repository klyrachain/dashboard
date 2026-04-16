/**
 * Developers / Manage API — base URL and API keys for the management page.
 * Replace with real API when backend supports key management.
 */

export type DeveloperApiKeys = {
  developmentKey: string;
  productionKey: string;
};

/** Base URL for API requests (gateway). */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_CORE_URL ??
    "https://api.example.com/v1"
  ).replace(/\/$/, "");
}

/** API keys for Manage API page. Development key visible; production masked until revealed. */
export function getDeveloperApiKeys(): DeveloperApiKeys {
  return {
    developmentKey:
      process.env.NEXT_PUBLIC_DEV_API_KEY ?? "myna_dev_kWj8P2nLqT5RxZvF",
    productionKey:
      process.env.NEXT_PUBLIC_PROD_API_KEY ?? "myna_prod_••••••••••••••••",
  };
}

/** Optional: key rotation notice. Set date to show banner. */
export type KeyRotationNotice = {
  date: string;
  message: string;
} | null;

export function getKeyRotationNotice(): KeyRotationNotice {
  return {
    date: "March 15, 2025",
    message: "All API keys will be rotated on March 15, 2025. Generate new keys before this date.",
  };
}

export type RateLimitTier = {
  name: string;
  limit: string | number;
};

export const rateLimitTiers: RateLimitTier[] = [
  { name: "Free Tier", limit: "1,000" },
  { name: "Pro Tier", limit: "10,000" },
  { name: "Enterprise", limit: "∞" },
];

/** Docs URL for the Manage API page (Docs button). */
export function getApiDocsUrl(): string {
  return process.env.NEXT_PUBLIC_API_DOCS_URL ?? "https://docs.example.com";
}
