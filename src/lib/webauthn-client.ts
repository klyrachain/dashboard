import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

/** Shown for most passkey failures (details go to server logs only). */
export const PASSKEY_GENERIC_ERROR =
  "We couldn’t complete that with your passkey. Try again, or sign in with your password and authenticator code.";

export const PASSKEY_GENERIC_SETUP_ERROR =
  "We couldn’t add this passkey. Try again, or continue without a passkey for now.";

const SAFE_API_MESSAGES = new Set([
  "Too many passkey sign-in attempts. Try again shortly.",
  "No passkey found for this email.",
  "No passkey on file for this account.",
  "Challenge expired. Request options again.",
  "Challenge expired or missing. Request options again.",
  "Challenge expired. Open registration options again.",
  "Passkeys are not supported in this browser. Try Chrome, Safari, or Edge.",
  "Passkeys are not supported in this browser. Use a current version of Chrome, Safari, or Edge.",
]);

function looksLikeInternalPasskeyMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /admin_|rp_id|webauthn|allowed_origins|business_webauthn|hostname|x-webauthn|origin mismatch/i.test(
      message
    ) ||
    m.includes("verifyregistrationresponse") ||
    m.includes("verifyauthenticationresponse") ||
    message.length > 220
  );
}

/**
 * Safe text for API error strings returned from Core / BFF. Never forwards internal WebAuthn hints.
 */
export function sanitizePasskeyApiError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  if (!raw) return PASSKEY_GENERIC_ERROR;
  if (SAFE_API_MESSAGES.has(raw)) return raw;
  if (looksLikeInternalPasskeyMessage(raw)) return PASSKEY_GENERIC_ERROR;
  return PASSKEY_GENERIC_ERROR;
}

export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/**
 * Admin / dashboard passkey sign-in: produces JSON the Core API can verify with @simplewebauthn/server.
 */
export async function runPasskeyAuthentication(
  optionsFromServer: unknown
): Promise<AuthenticationResponseJSON> {
  const optionsJSON = optionsFromServer as PublicKeyCredentialRequestOptionsJSON;
  return startAuthentication({ optionsJSON });
}

/**
 * Admin / dashboard passkey registration (authenticated session).
 */
export async function runPasskeyRegistration(
  optionsFromServer: unknown
): Promise<RegistrationResponseJSON> {
  const optionsJSON = optionsFromServer as PublicKeyCredentialCreationOptionsJSON;
  return startRegistration({ optionsJSON });
}

export function formatWebAuthnClientError(err: unknown): string {
  if (!(err instanceof Error)) {
    return PASSKEY_GENERIC_ERROR;
  }
  if (err.name === "NotAllowedError") {
    return "Sign-in was cancelled or not allowed on this device.";
  }
  if (err.name === "InvalidStateError") {
    return "This authenticator is already registered or cannot be used right now.";
  }
  if (err.name === "NotSupportedError") {
    return "Passkeys are not supported in this browser.";
  }
  // SecurityError: rpId / secure context — do not leak config; ops diagnose via server logs.
  if (err.name === "SecurityError" || err.name === "AbortError") {
    return PASSKEY_GENERIC_ERROR;
  }
  return PASSKEY_GENERIC_ERROR;
}
