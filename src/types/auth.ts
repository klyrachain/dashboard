/**
 * Auth API types — aligned with Auth API Frontend Integration Report.
 */

export type Role = "super_admin" | "support" | "developer" | "viewer";

export type AuthAdmin = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export type LoginData = {
  token: string;
  expiresAt: string;
  sessionTtlMinutes: 15 | 30;
  admin: AuthAdmin;
};

export type InviteData = {
  email: string;
  role: Role;
  expiresAt: string;
  message: string;
};

/** Response from POST /api/auth/invite (create invite). */
export type InviteCreateData = {
  inviteId: string;
  expiresAt: string;
  inviteLink: string;
  message: string;
};

export type SetupData = {
  adminId: string;
  email: string;
  role: Role;
  totpSecret: string;
  totpUri: string;
  message: string;
};

export type AuthEnvelopeSuccess<T> = { success: true; data: T };
export type AuthEnvelopeError = {
  success: false;
  error: string;
  code?: string;
};
export type AuthEnvelope<T> = AuthEnvelopeSuccess<T> | AuthEnvelopeError;

export function isAuthSuccess<T>(
  res: AuthEnvelope<T>
): res is AuthEnvelopeSuccess<T> {
  return res.success === true;
}
