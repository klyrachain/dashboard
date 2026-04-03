import { getBusinessAuthOrigin } from "@/config/env";

const JSON_POST_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
} as const;

const JSON_GET_HEADERS = {
  Accept: "application/json",
} as const;

export type LandingHint =
  | "docs_sdk_sandbox"
  | "dashboard_payments_flow"
  | "dashboard_payouts"
  | "docs_api_overview"
  | "dashboard_overview";

export class BusinessAuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "BusinessAuthApiError";
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (Array.isArray(body) && body.length > 0) {
    const msgs = body
      .filter(
        (item): item is { message?: string } =>
          item !== null && typeof item === "object"
      )
      .map((item) => item.message)
      .filter((m): m is string => typeof m === "string" && m.length > 0);
    if (msgs.length > 0) return msgs.join(" ");
  }
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
    const err = o.error;
    if (typeof err === "string" && err.length > 0) return err;
    if (Array.isArray(o.message) && o.message.length > 0) {
      const first = o.message[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "message" in first) {
        const joined = (o.message as { message?: string }[])
          .map((e) => e.message)
          .filter((m): m is string => typeof m === "string" && m.length > 0);
        if (joined.length > 0) return joined.join(" ");
      }
    }
  }
  return fallback;
}

/**
 * Browser: same-origin `/api/business-auth/*` proxy (avoids CORS to Core).
 * Server: direct Core URL when calling from RSC/API routes.
 */
function resolveBusinessAuthUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return normalized;
  }
  const base = getBusinessAuthOrigin();
  if (!base) {
    throw new BusinessAuthApiError(
      "Core URL not configured (set NEXT_PUBLIC_CORE_URL)",
      503,
      null
    );
  }
  return `${base}${normalized}`;
}

async function requestJson(
  path: string,
  init: RequestInit & { method?: string }
): Promise<unknown> {
  const url = resolveBusinessAuthUrl(path);
  const method = (init.method ?? "GET").toUpperCase();
  const baseHeaders = method === "GET" ? JSON_GET_HEADERS : JSON_POST_HEADERS;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...baseHeaders,
      ...init.headers,
    },
  });

  const rawText = await res.text();
  let body: unknown = null;
  if (rawText) {
    try {
      body = JSON.parse(rawText) as unknown;
    } catch {
      body = rawText;
    }
  }

  if (!res.ok) {
    throw new BusinessAuthApiError(
      extractErrorMessage(body, res.statusText || "Request failed"),
      res.status,
      body
    );
  }
  return body;
}

const ACCESS_TOKEN_KEYS = [
  "accessToken",
  "access_token",
  "token",
  "jwt",
  "accessTokenJwt",
] as const;

function pickTokenFromRecord(rec: Record<string, unknown>): string | null {
  for (const key of ACCESS_TOKEN_KEYS) {
    const v = rec[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function pickAccessToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  let found = pickTokenFromRecord(o);
  if (found) return found;
  for (const nest of ["data", "result", "session", "payload", "auth", "tokens"]) {
    const inner = o[nest];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      found = pickTokenFromRecord(inner as Record<string, unknown>);
      if (found) return found;
    }
  }
  return null;
}

export interface BusinessAuthConfig {
  googleEnabled: boolean;
}

export async function fetchBusinessAuthConfig(): Promise<BusinessAuthConfig> {
  const body = await requestJson("/api/business-auth/config", { method: "GET" });
  if (!body || typeof body !== "object") {
    return { googleEnabled: false };
  }
  const o = body as Record<string, unknown>;
  return {
    googleEnabled: o.googleEnabled === true,
  };
}

export async function registerBusinessUser(input: {
  email: string;
  password: string;
}): Promise<{ accessToken: string }> {
  const body = await requestJson("/api/business-auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
  });
  const accessToken = pickAccessToken(body);
  if (!accessToken) {
    throw new BusinessAuthApiError(
      "Invalid response: missing access token",
      500,
      body
    );
  }
  return { accessToken };
}

export async function loginBusinessWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ accessToken: string }> {
  const body = await requestJson("/api/business-auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
  });
  const accessToken = pickAccessToken(body);
  if (!accessToken) {
    throw new BusinessAuthApiError(
      "Invalid response: missing access token",
      500,
      body
    );
  }
  return { accessToken };
}

export async function fetchBusinessPasskeyLoginOptions(
  email: string
): Promise<unknown> {
  return requestJson("/api/business-auth/login/passkey/options", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function verifyBusinessPasskeyLogin(input: {
  email: string;
  response: unknown;
}): Promise<{ accessToken: string }> {
  const body = await requestJson("/api/business-auth/login/passkey/verify", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      response: input.response,
    }),
  });
  const accessToken = pickAccessToken(body);
  if (!accessToken) {
    throw new BusinessAuthApiError(
      "Invalid response: missing access token",
      500,
      body
    );
  }
  return { accessToken };
}

export async function requestBusinessMagicLink(email: string): Promise<void> {
  await requestJson("/api/business-auth/magic-link/request", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export interface BusinessEmailCheckResult {
  available: boolean;
  registered: boolean;
  hasPassword: boolean;
}

function parseEmailCheckBody(body: unknown): BusinessEmailCheckResult | null {
  let o: Record<string, unknown> | null = null;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    o = body as Record<string, unknown>;
    const data = o.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      o = data as Record<string, unknown>;
    }
  }
  if (!o) return null;
  return {
    available: o.available === true,
    registered: o.registered === true,
    hasPassword: o.hasPassword === true,
  };
}

export async function checkBusinessEmail(
  email: string
): Promise<BusinessEmailCheckResult> {
  const normalized = email.trim().toLowerCase();
  const path = `/api/business-auth/email/check?email=${encodeURIComponent(normalized)}`;
  const body = await requestJson(path, { method: "GET" });
  const parsed = parseEmailCheckBody(body);
  if (!parsed) {
    throw new BusinessAuthApiError(
      "Invalid response from email check",
      500,
      body
    );
  }
  return parsed;
}

function isLikelyJwt(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 3 &&
    parts.every((segment) => segment.length > 0) &&
    !value.includes(" ")
  );
}

function parseConsumeResponse(body: unknown): { accessToken: string } {
  const accessToken = pickAccessToken(body);
  if (!accessToken) {
    throw new BusinessAuthApiError(
      "Invalid response: missing access token",
      500,
      body
    );
  }
  return { accessToken };
}

export async function consumeBusinessMagicLink(
  token: string
): Promise<{ accessToken: string }> {
  const trimmed = token.trim();

  if (isLikelyJwt(trimmed)) {
    const body = await requestJson("/api/business-auth/magic-link/consume", {
      method: "POST",
      body: JSON.stringify({ token: trimmed }),
    });
    return parseConsumeResponse(body);
  }

  try {
    const body = await requestJson("/api/business-auth/magic-link/consume", {
      method: "POST",
      body: JSON.stringify({ magic: trimmed }),
    });
    return parseConsumeResponse(body);
  } catch (first: unknown) {
    const err = first instanceof BusinessAuthApiError ? first : null;
    if (err && err.status >= 400 && err.status < 500) {
      const body = await requestJson("/api/business-auth/magic-link/consume", {
        method: "POST",
        body: JSON.stringify({ token: trimmed }),
      });
      return parseConsumeResponse(body);
    }
    throw first;
  }
}

const portalTokenPromises = new Map<
  string,
  Promise<{ accessToken: string }>
>();

export function consumePortalOrMagicTokenOnce(
  token: string
): Promise<{ accessToken: string }> {
  const key = token.trim();
  let pending = portalTokenPromises.get(key);
  if (!pending) {
    pending = consumeBusinessMagicLink(key).catch((err) => {
      portalTokenPromises.delete(key);
      throw err;
    });
    portalTokenPromises.set(key, pending);
  }
  return pending;
}

/** Full Core URL — user navigates away (not a credentialed fetch). */
export function getGoogleOAuthStartUrl(): string {
  const base = getBusinessAuthOrigin();
  if (!base) {
    return "/api/business-auth/google/start";
  }
  return `${base}/api/business-auth/google/start`;
}

export async function submitOnboardingEntity(
  accessToken: string,
  input: { companyName: string; website?: string }
): Promise<void> {
  const payload: { companyName: string; website?: string } = {
    companyName: input.companyName.trim(),
  };
  const w = input.website?.trim();
  if (w) payload.website = w;

  await requestJson("/api/business-auth/onboarding/entity", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export interface OnboardingCompleteResult {
  accessToken: string;
  landingHint: LandingHint | string;
}

export async function completeBusinessOnboarding(
  accessToken: string,
  input: { signupRole: string; primaryGoal: string }
): Promise<OnboardingCompleteResult> {
  const body = await requestJson("/api/business-auth/onboarding/complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      signupRole: input.signupRole,
      primaryGoal: input.primaryGoal,
    }),
  });

  if (!body || typeof body !== "object") {
    throw new BusinessAuthApiError(
      "Invalid response from onboarding complete",
      500,
      body
    );
  }

  const o = body as Record<string, unknown>;
  const newToken = pickAccessToken(body) ?? accessToken;
  const landingHint =
    typeof o.landingHint === "string" ? o.landingHint : "dashboard_overview";

  return {
    accessToken: newToken,
    landingHint,
  };
}

export type BusinessSessionBusiness = {
  id: string;
  name: string;
  slug: string;
  /** BusinessMember role when returned by session (portal RBAC). */
  role?: string;
};

export interface BusinessSession {
  /** Portal user email (Core `getBusinessPortalSession`). */
  email: string | null;
  portalDisplayName: string | null;
  hasPassword: boolean;
  passkeyCount: number;
  profileComplete: boolean;
  /** Active memberships — use first `id` as X-Business-Id when calling /api/v1/merchant/* */
  businesses: BusinessSessionBusiness[];
}

function unwrapSessionPayload(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const o = body as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return o;
}

function parseBusinessesFromSession(raw: unknown): BusinessSessionBusiness[] {
  if (!Array.isArray(raw)) return [];
  const out: BusinessSessionBusiness[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const id = typeof b.id === "string" ? b.id : "";
    if (!id) continue;
    const roleRaw = b.role;
    const role =
      typeof roleRaw === "string" && roleRaw.trim().length > 0
        ? roleRaw.trim()
        : undefined;
    out.push({
      id,
      name: typeof b.name === "string" ? b.name : "",
      slug: typeof b.slug === "string" ? b.slug : "",
      ...(role ? { role } : {}),
    });
  }
  return out;
}

export async function fetchBusinessSession(
  accessToken: string
): Promise<BusinessSession> {
  const body = await requestJson("/api/business-auth/session", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!body || typeof body !== "object") {
    throw new BusinessAuthApiError(
      "Invalid response from business session",
      500,
      body
    );
  }

  const d = unwrapSessionPayload(body);
  const user =
    d.user && typeof d.user === "object" && !Array.isArray(d.user)
      ? (d.user as Record<string, unknown>)
      : null;
  const displayFromUser =
    user && typeof user.portalDisplayName === "string"
      ? user.portalDisplayName
      : user && typeof user.displayName === "string"
        ? user.displayName
        : null;

  const emailRaw = d.email;
  const email =
    typeof emailRaw === "string" && emailRaw.includes("@")
      ? emailRaw.trim().toLowerCase()
      : user && typeof user.email === "string" && user.email.includes("@")
        ? String(user.email).trim().toLowerCase()
        : null;

  return {
    email,
    portalDisplayName:
      typeof d.portalDisplayName === "string"
        ? d.portalDisplayName
        : displayFromUser,
    hasPassword: d.hasPassword === true,
    passkeyCount:
      typeof d.passkeyCount === "number" && Number.isFinite(d.passkeyCount)
        ? d.passkeyCount
        : 0,
    profileComplete: d.profileComplete === true,
    businesses: parseBusinessesFromSession(d.businesses),
  };
}

export async function submitBusinessProfileSetup(
  accessToken: string,
  input: { displayName: string; password?: string }
): Promise<void> {
  const payload: { displayName: string; password?: string } = {
    displayName: input.displayName.trim(),
  };

  if (input.password && input.password.length > 0) {
    payload.password = input.password;
  }

  await requestJson("/api/business-auth/profile/setup", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchBusinessPasskeyRegistrationOptions(
  accessToken: string
): Promise<unknown> {
  return requestJson("/api/business-auth/passkey/registration-options", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function registerBusinessPasskey(
  accessToken: string,
  input: { response: unknown; passkeyName?: string }
): Promise<void> {
  const payload: { response: unknown; passkeyName?: string } = {
    response: input.response,
  };

  const name = input.passkeyName?.trim();
  if (name) {
    payload.passkeyName = name;
  }

  await requestJson("/api/business-auth/passkey/register", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

function parseLoginCodeCreateBody(body: unknown): {
  code: string;
  redirectUrl?: string;
} {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const data =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const code = typeof data.code === "string" ? data.code.trim() : "";
  if (!code) {
    throw new BusinessAuthApiError(
      "Invalid response: missing login code",
      500,
      body
    );
  }
  const redirectUrl =
    typeof data.redirectUrl === "string" && data.redirectUrl.length > 0
      ? data.redirectUrl
      : undefined;
  return { code, redirectUrl };
}

/**
 * Exchange portal JWT for a one-time code; dashboard opens `/?login_code=`.
 * Core: POST /api/business-auth/login/code
 */
export async function createBusinessLoginCode(
  accessToken: string,
  dashboardBaseUrl: string
): Promise<{ code: string; redirectUrl?: string }> {
  const payload: { accessToken: string; redirectUrl?: string } = {
    accessToken,
  };
  const base = dashboardBaseUrl.trim().replace(/\/$/, "");
  if (base) payload.redirectUrl = base;

  const body = await requestJson("/api/business-auth/login/code", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return parseLoginCodeCreateBody(body);
}

export async function consumeBusinessLoginCode(
  code: string
): Promise<{ accessToken: string }> {
  const body = await requestJson("/api/business-auth/login/code/consume", {
    method: "POST",
    body: JSON.stringify({ code: code.trim() }),
  });
  const accessToken = pickAccessToken(body);
  if (!accessToken) {
    throw new BusinessAuthApiError(
      "Invalid response: missing access token",
      500,
      body
    );
  }
  return { accessToken };
}

