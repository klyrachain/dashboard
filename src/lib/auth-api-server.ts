/**
 * Server-side auth API — proxy to Core /api/auth (no x-api-key).
 * Used by Next.js API route handlers only.
 */

const AUTH_TIMEOUT_MS = 15000;

function getCoreBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_CORE_URL ?? process.env.CORE_URL ?? "").replace(
    /\/$/,
    ""
  );
}

/** API key for protected auth routes (e.g. create invite). Server-only. */
function getCoreApiKey(): string | undefined {
  return process.env.CORE_API_KEY?.trim() || undefined;
}

async function fetchAuth<T>(
  path: string,
  options?: RequestInit & { timeout?: number }
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 0,
      data: { success: false, error: "Core URL not configured" } as T,
    };
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const timeout = options?.timeout ?? AUTH_TIMEOUT_MS;
  const { timeout: _t, ...rest } = options ?? {};
  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(rest?.headers as Record<string, string>),
      },
      signal: AbortSignal.timeout(timeout),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return {
      ok: false,
      status: 0,
      data: { success: false, error: message } as T,
    };
  }
}

/** GET /api/auth/invite/:token */
export async function getCoreAuthInvite(token: string) {
  return fetchAuth<unknown>(`api/auth/invite/${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

/**
 * POST /api/auth/invite — create invite (super_admin only).
 * Uses Bearer token if provided, else x-api-key from env.
 */
export async function postCoreAuthInviteCreate(
  body: { email: string; role: string },
  options?: { bearerToken?: string }
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const base = getCoreBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 0,
      data: { success: false, error: "Core URL not configured" },
    };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.bearerToken?.trim()) {
    headers["Authorization"] = `Bearer ${options.bearerToken.trim()}`;
  } else {
    const key = getCoreApiKey();
    if (key) headers["x-api-key"] = key;
  }
  try {
    const res = await fetch(`${base}/api/auth/invite`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => ({}))) as unknown;
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return {
      ok: false,
      status: 0,
      data: { success: false, error: message },
    };
  }
}

/** POST /api/auth/setup */
export async function postCoreAuthSetup(body: {
  inviteToken: string;
  password: string;
}) {
  return fetchAuth<unknown>("api/auth/setup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/setup/confirm-totp */
export async function postCoreAuthSetupConfirmTotp(body: {
  adminId: string;
  code: string;
}) {
  return fetchAuth<unknown>("api/auth/setup/confirm-totp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/login */
export async function postCoreAuthLogin(body: {
  email: string;
  password: string;
  code: string;
  sessionTtlMinutes?: 15 | 30;
}) {
  return fetchAuth<unknown>("api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/login/passkey/options */
export async function postCoreAuthLoginPasskeyOptions(
  body: { email: string },
  browserOrigin?: string
) {
  const headers: Record<string, string> = {};
  if (browserOrigin) headers["X-WebAuthn-Origin"] = browserOrigin;
  return fetchAuth<unknown>("api/auth/login/passkey/options", {
    method: "POST",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/login/passkey/verify */
export async function postCoreAuthLoginPasskeyVerify(body: {
  email: string;
  response: unknown;
  sessionTtlMinutes?: 15 | 30;
}, browserOrigin?: string) {
  const headers: Record<string, string> = {};
  if (browserOrigin) headers["X-WebAuthn-Origin"] = browserOrigin;
  return fetchAuth<unknown>("api/auth/login/passkey/verify", {
    method: "POST",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: JSON.stringify(body),
  });
}

/** GET /api/auth/me — requires Authorization: Bearer <token> */
export async function getCoreAuthMe(bearerToken: string) {
  return fetchAuth<unknown>("api/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
}

/** POST /api/auth/logout */
export async function postCoreAuthLogout(bearerToken: string) {
  return fetchAuth<unknown>("api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
}

/** GET /api/auth/passkey/options — requires Bearer */
export async function getCoreAuthPasskeyOptions(
  bearerToken: string,
  browserOrigin?: string
) {
  const headers: Record<string, string> = { Authorization: `Bearer ${bearerToken}` };
  if (browserOrigin) headers["X-WebAuthn-Origin"] = browserOrigin;
  return fetchAuth<unknown>("api/auth/passkey/options", {
    method: "GET",
    headers,
  });
}

/** POST /api/auth/passkey/verify — requires Bearer */
export async function postCoreAuthPasskeyVerify(
  bearerToken: string,
  body: { response: unknown; name?: string },
  browserOrigin?: string
) {
  const headers: Record<string, string> = { Authorization: `Bearer ${bearerToken}` };
  if (browserOrigin) headers["X-WebAuthn-Origin"] = browserOrigin;
  return fetchAuth<unknown>("api/auth/passkey/verify", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/change-password — requires Bearer */
export async function postCoreAuthChangePassword(
  bearerToken: string,
  body: { currentPassword: string; newPassword: string }
) {
  return fetchAuth<unknown>("api/auth/change-password", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
    body: JSON.stringify(body),
  });
}
