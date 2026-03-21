import type { LandingHint } from "@/lib/businessAuthApi";

const LANDING_HINT_TO_PATH: Record<string, string> = {
  docs_sdk_sandbox: "/token-playground",
  dashboard_payments_flow: "/app",
  dashboard_payouts: "/app",
  docs_api_overview: "/token-playground",
  dashboard_overview: "/app",
};

export function pathFromLandingHint(hint: string): string {
  const path = LANDING_HINT_TO_PATH[hint as LandingHint];
  return path ?? "/app";
}
