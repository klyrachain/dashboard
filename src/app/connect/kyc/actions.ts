"use server";

import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import {
  postCoreAdminPeerRampKycOverride,
  postCoreAdminPeerRampKycReset,
} from "@/lib/core-api";

const KYC_PATH = "/connect/kyc";

function readMessage(data: unknown): string | undefined {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: unknown }).error;
    return typeof e === "string" ? e : undefined;
  }
  return undefined;
}

export async function resetPeerRampKycByEmail(
  email: string
): Promise<{ ok: boolean; message?: string }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, message: "Missing email" };
  const token = await getSessionToken();
  const res = await postCoreAdminPeerRampKycReset({ email: trimmed }, token ?? undefined);
  revalidatePath(KYC_PATH);
  if (!res.ok) {
    return { ok: false, message: readMessage(res.data) ?? `Request failed (${res.status})` };
  }
  return { ok: true };
}

export async function overridePeerRampKycByEmail(
  email: string,
  status: "approved" | "declined"
): Promise<{ ok: boolean; message?: string }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, message: "Missing email" };
  const token = await getSessionToken();
  const res = await postCoreAdminPeerRampKycOverride({ email: trimmed, status }, token ?? undefined);
  revalidatePath(KYC_PATH);
  if (!res.ok) {
    return { ok: false, message: readMessage(res.data) ?? `Request failed (${res.status})` };
  }
  return { ok: true };
}
