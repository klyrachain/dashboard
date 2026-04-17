"use server";

import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/auth";
import {
  postCoreAdminBusinessKybOverride,
  postCoreAdminBusinessKybReset,
} from "@/lib/core-api";

const KYC_PATH = "/connect/kyc";

function readMessage(data: unknown): string | undefined {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: unknown }).error;
    return typeof e === "string" ? e : undefined;
  }
  return undefined;
}

export async function resetBusinessKybById(
  businessId: string
): Promise<{ ok: boolean; message?: string }> {
  const id = businessId.trim();
  if (!id) return { ok: false, message: "Missing id" };
  const token = await getSessionToken();
  const res = await postCoreAdminBusinessKybReset({ businessId: id }, token ?? undefined);
  revalidatePath(KYC_PATH);
  if (!res.ok) {
    return { ok: false, message: readMessage(res.data) ?? `Request failed (${res.status})` };
  }
  return { ok: true };
}

export async function overrideBusinessKybById(
  businessId: string,
  status: "approved" | "declined"
): Promise<{ ok: boolean; message?: string }> {
  const id = businessId.trim();
  if (!id) return { ok: false, message: "Missing id" };
  const token = await getSessionToken();
  const res = await postCoreAdminBusinessKybOverride({ businessId: id, status }, token ?? undefined);
  revalidatePath(KYC_PATH);
  if (!res.ok) {
    return { ok: false, message: readMessage(res.data) ?? `Request failed (${res.status})` };
  }
  return { ok: true };
}
