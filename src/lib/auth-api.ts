/**
 * Client-side auth API — calls Next.js /api/auth (same origin).
 * Session key (Bearer token from Core login) is in NextAuth JWT cookie; API routes read it via getServerSession.
 */

import type {
  AuthEnvelope,
  InviteData,
  SetupData,
  LoginData,
  AuthAdmin,
} from "@/types/auth";

const AUTH_TIMEOUT_MS = 15000;

async function fetchAuth<T>(
  path: string,
  options?: RequestInit & { token?: string; timeout?: number }
): Promise<AuthEnvelope<T>> {
  const { token, timeout = AUTH_TIMEOUT_MS, ...rest } = options ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(path, {
      ...rest,
      credentials: rest.credentials ?? "include",
      headers,
      signal: AbortSignal.timeout(timeout),
    });
    const data = (await res.json().catch(() => ({}))) as AuthEnvelope<T>;
    if (res.ok && data && typeof data === "object" && "success" in data) {
      return data as AuthEnvelope<T>;
    }
    if (res.ok) {
      return { success: true, data: data as T };
    }
    return {
      success: false,
      error: (data && typeof data === "object" && "error" in data)
        ? String((data as { error: string }).error)
        : "Request failed",
      code:
        data && typeof data === "object" && "code" in data
          ? String((data as { code: string }).code)
          : undefined,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return { success: false, error: message };
  }
}

/** GET /api/auth/invite/:token */
export async function getInvite(token: string): Promise<AuthEnvelope<InviteData>> {
  return fetchAuth<InviteData>(`/api/auth/invite/${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

/** POST /api/auth/setup */
export async function postSetup(body: {
  inviteToken: string;
  password: string;
}): Promise<AuthEnvelope<SetupData>> {
  return fetchAuth<SetupData>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/setup/confirm-totp */
export async function postSetupConfirmTotp(body: {
  adminId: string;
  code: string;
}): Promise<AuthEnvelope<{ message: string }>> {
  return fetchAuth<{ message: string }>("/api/auth/setup/confirm-totp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/login */
export async function postLogin(body: {
  email: string;
  password: string;
  code: string;
  sessionTtlMinutes?: 15 | 30;
}): Promise<AuthEnvelope<LoginData>> {
  return fetchAuth<LoginData>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/login/passkey/options */
export async function postLoginPasskeyOptions(body: {
  email: string;
}): Promise<AuthEnvelope<{ options: unknown }>> {
  return fetchAuth<{ options: unknown }>("/api/auth/login/passkey/options", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/login/passkey/verify */
export async function postLoginPasskeyVerify(body: {
  email: string;
  response: unknown;
  sessionTtlMinutes?: 15 | 30;
}): Promise<AuthEnvelope<LoginData>> {
  return fetchAuth<LoginData>("/api/auth/login/passkey/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** GET /api/auth/me — uses session cookie (NextAuth). */
export async function getMe(): Promise<
  AuthEnvelope<AuthAdmin & { expiresAt: string }>
> {
  return fetchAuth("/api/auth/me", { method: "GET", credentials: "include" });
}

/** POST /api/auth/logout — uses session cookie; call signOut() after to clear NextAuth cookie. */
export async function postLogout(): Promise<
  AuthEnvelope<{ message: string }>
> {
  return fetchAuth("/api/auth/logout", { method: "POST", credentials: "include" });
}

/** GET /api/auth/passkey/options (authenticated via session cookie). */
export async function getPasskeyOptions(): Promise<
  AuthEnvelope<{ options: unknown }>
> {
  return fetchAuth("/api/auth/passkey/options", { method: "GET", credentials: "include" });
}

/** POST /api/auth/passkey/verify (authenticated via session cookie). */
export async function postPasskeyVerify(body: {
  response: unknown;
  name?: string;
}): Promise<AuthEnvelope<{ message: string }>> {
  return fetchAuth("/api/auth/passkey/verify", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/change-password (authenticated via session cookie). */
export async function postChangePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthEnvelope<{ message: string }>> {
  return fetchAuth("/api/auth/change-password", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(body),
  });
}
