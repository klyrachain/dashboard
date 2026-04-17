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
  if (err instanceof Error) {
    if (err.name === "NotAllowedError") {
      return "Sign-in was cancelled or not allowed on this device.";
    }
    if (err.name === "InvalidStateError") {
      return "This authenticator is already registered or cannot be used right now.";
    }
    if (err.name === "NotSupportedError") {
      return "Passkeys are not supported in this browser.";
    }
    if (err.name === "SecurityError") {
      return "Passkey origin mismatch: Core ADMIN_RP_ID must equal this hostname; ADMIN_ALLOWED_ORIGINS must include this page’s origin. Business portal: BUSINESS_WEBAUTHN_RP_ID / BUSINESS_WEBAUTHN_ORIGINS.";
    }
    return err.message || "Passkey operation failed.";
  }
  return "Passkey operation failed.";
}
