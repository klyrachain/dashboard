/**
 * Peer Ramp app KYC — Core admin API (platform session).
 */
import { getSessionToken } from "@/lib/auth";
import { getCoreAdminPeerRampKycUsers } from "@/lib/core-api";

export type PeerRampKycUserRow = {
  email: string;
  cliSessionId: string;
  kycStatus: string | null;
  kycProvider: string | null;
  kycVerifiedAt: string | null;
  profileCompletedAt: string | null;
  updatedAt: string;
  sessions: { provider: string; status: string; externalId: string; updatedAt: string }[];
};

function parseRow(item: unknown): PeerRampKycUserRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const email = typeof o.email === "string" ? o.email : "";
  if (!email) return null;
  const sessionsRaw = Array.isArray(o.sessions) ? o.sessions : [];
  const sessions = sessionsRaw
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const r = s as Record<string, unknown>;
      return {
        provider: String(r.provider ?? ""),
        status: String(r.status ?? ""),
        externalId: String(r.externalId ?? ""),
        updatedAt: String(r.updatedAt ?? ""),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  return {
    email,
    cliSessionId: String(o.cliSessionId ?? ""),
    kycStatus: o.kycStatus != null ? String(o.kycStatus) : null,
    kycProvider: o.kycProvider != null ? String(o.kycProvider) : null,
    kycVerifiedAt: o.kycVerifiedAt != null ? String(o.kycVerifiedAt) : null,
    profileCompletedAt: o.profileCompletedAt != null ? String(o.profileCompletedAt) : null,
    updatedAt: String(o.updatedAt ?? ""),
    sessions,
  };
}

export async function getPeerRampKycUsersForAdmin(
  q?: string,
  limit = 80
): Promise<{ ok: boolean; users: PeerRampKycUserRow[]; error?: string }> {
  try {
    const token = await getSessionToken();
    const result = await getCoreAdminPeerRampKycUsers({ q: q?.trim() || undefined, limit }, token ?? undefined);
    if (!result.ok) {
      const err = result.data as { error?: string } | undefined;
      return { ok: false, users: [], error: err?.error ?? `HTTP ${result.status}` };
    }
    const body = result.data as { success?: boolean; data?: { users?: unknown[] } };
    const raw = Array.isArray(body.data?.users) ? body.data.users : [];
    const users = raw.map(parseRow).filter((r): r is PeerRampKycUserRow => r !== null);
    return { ok: true, users };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Core unavailable";
    return { ok: false, users: [], error: message };
  }
}
