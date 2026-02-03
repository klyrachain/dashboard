"use server";

import { revalidatePath } from "next/cache";
import type {
  SettingsGeneral,
  SettingsFinancials,
  SettingsRisk,
  SettingsApi,
} from "@/lib/data-settings";
import {
  getSettingsGeneral,
  patchSettingsGeneral,
  getSettingsFinancials,
  patchSettingsFinancials,
  getSettingsProviders,
  patchSettingsProviders,
  patchSettingsProviderById,
  getSettingsRisk,
  patchSettingsRisk,
  getSettingsTeamAdmins,
  postAuthInvite,
  getSettingsApi,
  patchSettingsApi,
  postSettingsApiRotateWebhookSecret,
} from "@/lib/data-settings";

const SETTINGS_PATHS = ["/settings/general", "/settings/financials", "/settings/providers", "/settings/risk", "/settings/team", "/settings/api"];

export type SettingsActionResult = { success: boolean; error?: string };

export type InviteTeamResult = SettingsActionResult & {
  inviteLink?: string;
  expiresAt?: string;
  inviteId?: string;
};

// General
export async function getGeneralAction() {
  return getSettingsGeneral();
}

export async function saveGeneralAction(
  body: Partial<SettingsGeneral>
): Promise<SettingsActionResult> {
  const result = await patchSettingsGeneral(body);
  if (result.ok) {
    SETTINGS_PATHS.forEach((p) => revalidatePath(p));
    return { success: true };
  }
  return { success: false, error: result.error };
}

// Financials
export async function getFinancialsAction() {
  return getSettingsFinancials();
}

export async function saveFinancialsAction(
  body: Partial<SettingsFinancials>
): Promise<SettingsActionResult> {
  const result = await patchSettingsFinancials(body);
  if (result.ok) {
    SETTINGS_PATHS.forEach((p) => revalidatePath(p));
    return { success: true };
  }
  return { success: false, error: result.error };
}

// Providers
export async function getProvidersAction() {
  return getSettingsProviders();
}

export async function saveProvidersAction(body: {
  maxSlippagePercent?: number;
  providers?: Array<{ id: string; enabled?: boolean; priority?: number }>;
}): Promise<SettingsActionResult> {
  const result = await patchSettingsProviders(body);
  if (result.ok) {
    SETTINGS_PATHS.forEach((p) => revalidatePath(p));
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function saveProviderByIdAction(
  id: string,
  body: { apiKey?: string; enabled?: boolean; priority?: number }
): Promise<SettingsActionResult> {
  const result = await patchSettingsProviderById(id, body);
  if (result.ok) {
    SETTINGS_PATHS.forEach((p) => revalidatePath(p));
    return { success: true };
  }
  return { success: false, error: result.error };
}

// Providers (Provider Routing API — GET /api/providers, PATCH, rotate-key)
export async function getProvidersRoutingAction() {
  const { getProvidersFromCore } = await import("@/lib/data-providers");
  return getProvidersFromCore();
}

export async function updateProviderRoutingAction(
  id: string,
  body: {
    status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
    operational?: boolean;
    enabled?: boolean;
    priority?: number;
    fee?: number | null;
    name?: string | null;
  }
): Promise<SettingsActionResult> {
  const { getSessionToken } = await import("@/lib/auth");
  const { patchCoreProvider } = await import("@/lib/core-api");
  const token = await getSessionToken();
  const result = await patchCoreProvider(id, body, token ?? undefined);
  if (result.ok) {
    revalidatePath("/settings/providers");
    return { success: true };
  }
  const err =
    result.data && typeof result.data === "object" && "error" in result.data
      ? String((result.data as { error: string }).error)
      : "Update failed";
  return { success: false, error: err };
}

export async function rotateProviderKeyRoutingAction(
  id: string,
  apiKey: string
): Promise<SettingsActionResult> {
  const { getSessionToken } = await import("@/lib/auth");
  const { postCoreProviderRotateKey } = await import("@/lib/core-api");
  const token = await getSessionToken();
  const result = await postCoreProviderRotateKey(id, { apiKey: apiKey.trim() }, token ?? undefined);
  if (result.ok) {
    revalidatePath("/settings/providers");
    return { success: true };
  }
  const err =
    result.data && typeof result.data === "object" && "error" in result.data
      ? String((result.data as { error: string }).error)
      : "Rotate key failed";
  return { success: false, error: err };
}

// Risk
export async function getRiskAction() {
  return getSettingsRisk();
}

export async function saveRiskAction(body: {
  enforceKycOver1000?: boolean;
  blockHighRiskIp?: boolean;
  blacklist?: string[];
}): Promise<SettingsActionResult> {
  const result = await patchSettingsRisk(body);
  if (result.ok) {
    SETTINGS_PATHS.forEach((p) => revalidatePath(p));
    return { success: true };
  }
  return { success: false, error: result.error };
}

// Team
export async function getTeamAdminsAction() {
  return getSettingsTeamAdmins();
}

export async function inviteTeamAdminAction(body: {
  email: string;
  role?: string;
}): Promise<InviteTeamResult> {
  const result = await postAuthInvite(body);
  if (result.ok) {
    revalidatePath("/settings/team");
    return {
      success: true,
      inviteLink: result.inviteLink,
      expiresAt: result.expiresAt,
      inviteId: result.inviteId,
    };
  }
  return { success: false, error: result.error };
}

// API & Webhooks
export async function getApiAction() {
  return getSettingsApi();
}

export async function saveApiAction(
  body: Partial<SettingsApi>
): Promise<SettingsActionResult> {
  const result = await patchSettingsApi(body);
  if (result.ok) {
    SETTINGS_PATHS.forEach((p) => revalidatePath(p));
    return { success: true };
  }
  return { success: false, error: result.error };
}

export async function rotateWebhookSecretAction(): Promise<
  SettingsActionResult & { webhookSigningSecretMasked?: string }
> {
  const result = await postSettingsApiRotateWebhookSecret();
  if (result.ok) {
    revalidatePath("/settings/api");
    return {
      success: true,
      webhookSigningSecretMasked: result.webhookSigningSecretMasked,
    };
  }
  return { success: false, error: result.error };
}
