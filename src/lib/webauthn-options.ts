/**
 * Normalize WebAuthn options from API (base64url strings) for navigator.credentials.get.
 * Many backends return challenge and allowCredentials[].id as base64url; the browser expects ArrayBuffer.
 */

function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export type PublicKeyCredentialRequestOptionsRaw = {
  challenge: string | ArrayBuffer;
  allowCredentials?: Array<{ id: string | BufferSource; type: string }>;
  rpId?: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
};

export function normalizeRequestOptions(
  raw: PublicKeyCredentialRequestOptionsRaw
): PublicKeyCredentialRequestOptions {
  const challenge =
    typeof raw.challenge === "string"
      ? base64UrlToBuffer(raw.challenge)
      : raw.challenge;
  const allowCredentials = raw.allowCredentials?.map((c) => ({
    type: "public-key" as const,
    id: typeof c.id === "string" ? base64UrlToBuffer(c.id) : c.id,
  }));
  return {
    challenge,
    allowCredentials: allowCredentials as PublicKeyCredentialDescriptor[] | undefined,
    rpId: raw.rpId,
    timeout: raw.timeout,
    userVerification: raw.userVerification,
  };
}

/** Normalize WebAuthn credential creation options from API for navigator.credentials.create. */
export function normalizeCreateOptions(raw: unknown): CredentialCreationOptions {
  if (!raw || typeof raw !== "object") throw new Error("Invalid options");
  const o = raw as Record<string, unknown>;
  const challenge = o.challenge;
  const rp = o.rp as { name?: string; id?: string } | undefined;
  const user = o.user as { id: string; name: string; displayName?: string } | undefined;
  const pubKeyCredParams = o.pubKeyCredParams as PublicKeyCredentialParameters[] | undefined;
  if (!challenge || !user) throw new Error("Missing challenge or user");
  return {
    publicKey: {
      challenge: typeof challenge === "string" ? base64UrlToBuffer(challenge) : (challenge as ArrayBuffer),
      rp: {
        name: rp?.name ?? "Klyra Admin",
        id: rp?.id ?? (typeof window !== "undefined" ? window.location.hostname : "localhost"),
      },
      user: {
        id: typeof user.id === "string" ? base64UrlToBuffer(user.id) : (user.id as ArrayBuffer),
        name: user.name,
        displayName: user.displayName ?? user.name,
      },
      pubKeyCredParams: pubKeyCredParams ?? [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: typeof o.timeout === "number" ? o.timeout : 60000,
    },
  };
}
