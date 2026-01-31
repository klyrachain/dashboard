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
  postSettingsTeamInvite,
  getSettingsApi,
  patchSettingsApi,
  postSettingsApiRotateWebhookSecret,
} from "@/lib/data-settings";

const SETTINGS_PATHS = ["/settings/general", "/settings/financials", "/settings/providers", "/settings/risk", "/settings/team", "/settings/api"];

export type SettingsActionResult = { success: boolean; error?: string };

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
}): Promise<SettingsActionResult> {
  const result = await postSettingsTeamInvite(body);
  if (result.ok) {
    revalidatePath("/settings/team");
    return { success: true };
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
