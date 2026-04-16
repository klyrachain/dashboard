export const BUSINESS_ROLES = [
  { value: "developer", label: "Developer" },
  { value: "founder_executive", label: "Founder / Executive" },
  { value: "finance_ops", label: "Finance / Ops" },
  { value: "product", label: "Product" },
] as const;

export const PRIMARY_GOALS = [
  { value: "accept_payments", label: "Accept payments" },
  { value: "send_payouts", label: "Send payouts" },
  { value: "integrate_sdk", label: "Integrate the SDK" },
  { value: "exploring", label: "Just exploring" },
] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number]["value"];
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number]["value"];

/** API expects SCREAMING_SNAKE enums on onboarding/complete. */
export function toApiSignupRole(role: BusinessRole): string {
  const map: Record<BusinessRole, string> = {
    developer: "DEVELOPER",
    founder_executive: "FOUNDER_EXECUTIVE",
    finance_ops: "FINANCE_OPS",
    product: "PRODUCT",
  };
  return map[role];
}

export function toApiPrimaryGoal(goal: PrimaryGoal): string {
  const map: Record<PrimaryGoal, string> = {
    accept_payments: "ACCEPT_PAYMENTS",
    send_payouts: "SEND_PAYOUTS",
    integrate_sdk: "INTEGRATE_SDK",
    exploring: "EXPLORING",
  };
  return map[goal];
}

export interface BusinessOnboardingProfile {
  email?: string;
  companyName: string;
  companyWebsite: string;
  role: BusinessRole;
  primaryGoal: PrimaryGoal;
  displayName?: string;
  completedAt: string;
}

const STORAGE_KEY = "klyra_business_onboarding";

export function persistBusinessOnboarding(profile: BusinessOnboardingProfile): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Use when gating "Go Live", bank linking, or limit increases (deferred KYC/KYB). */
export function readBusinessOnboardingProfile(): BusinessOnboardingProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as BusinessOnboardingProfile;
  } catch {
    return null;
  }
}
