"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useAdmin } from "@/hooks/use-admin";
import { clearSession } from "@/store/auth-slice";
import { resetAuthSessionSyncRef } from "@/components/auth/auth-session-sync";
import { LogOut, KeyRound, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postLogout, postChangePassword, getPasskeyOptions, postPasskeyVerify } from "@/lib/auth-api";
import { clearMerchantPortalHttpOnlyCookie } from "@/lib/portal-auth-client";
import {
  formatWebAuthnClientError,
  isWebAuthnAvailable,
  runPasskeyRegistration,
} from "@/lib/webauthn-client";
import { isAuthSuccess } from "@/types/auth";
import type { Role } from "@/types/auth";

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  support: "Support",
  developer: "Developer",
  viewer: "Viewer",
};

export function AccountSettingsContent() {
  const dispatch = useDispatch();
  const admin = useAdmin();

  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasskeyLabel, setNewPasskeyLabel] = useState("");

  const handleLogout = async () => {
    resetAuthSessionSyncRef();
    dispatch(clearSession());
    try {
      await postLogout();
    } catch {
      // continue
    }
    try {
      await clearMerchantPortalHttpOnlyCookie();
    } catch {
      // non-fatal
    }
    window.location.href = "/api/auth/signout?callbackUrl=" + encodeURIComponent("/login");
  };

  const handleSetupPasskey = async () => {
    if (!admin) return;
    if (!isWebAuthnAvailable()) {
      setPasskeyError(
        "Passkeys are not supported in this browser. Try Chrome, Safari, or Edge."
      );
      return;
    }
    setPasskeyError(null);
    setPasskeyLoading(true);
    const optionsRes = await getPasskeyOptions();
    if (!isAuthSuccess(optionsRes) || !optionsRes.data.options) {
      setPasskeyLoading(false);
      setPasskeyError(
        optionsRes.success
          ? "Could not get passkey options."
          : (optionsRes as { error: string }).error
      );
      return;
    }
    try {
      const attestation = await runPasskeyRegistration(optionsRes.data.options);
      const label = newPasskeyLabel.trim().slice(0, 80);
      const verifyRes = await postPasskeyVerify({
        response: attestation,
        name: label.length > 0 ? label : undefined,
      });
      setPasskeyLoading(false);
      if (isAuthSuccess(verifyRes)) {
        setPasskeySuccess(true);
        setPasskeyError(null);
        setNewPasskeyLabel("");
      } else {
        setPasskeyError((verifyRes as { error: string }).error ?? "Verification failed");
      }
    } catch (err) {
      setPasskeyLoading(false);
      setPasskeyError(formatWebAuthnClientError(err));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    if (newPassword.length < 12) {
      setPasswordError("New password must be at least 12 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    setPasswordError(null);
    setPasswordLoading(true);
    const res = await postChangePassword({
      currentPassword,
      newPassword,
    });
    setPasswordLoading(false);
    if (isAuthSuccess(res)) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError((res as { error: string }).error ?? "Failed to change password");
    }
  };

  if (!admin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-display font-semibold tracking-tight">Account</h1>
          <p className="font-secondary text-caption text-muted-foreground mt-1">
            You are not signed in. Sign in to manage your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Account</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Your profile, security, and sign-in options.
        </p>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base">Signed in as</CardTitle>
          <CardDescription>
            This is the account used for this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            {admin.name && (
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium text-foreground">{admin.name}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium text-foreground">{admin.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role</span>
              <p className="font-medium text-foreground">{ROLE_LABELS[admin.role] ?? admin.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="size-4" />
            Passkey
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passkeySuccess ? (
            <p className="text-sm text-muted-foreground">Passkey added.</p>
          ) : null}
          {passkeyError && (
            <p className="text-sm text-destructive mb-2" role="alert">
              {passkeyError}
            </p>
          )}
          <div className="space-y-2 max-w-sm mb-4">
            <Label htmlFor="account-passkey-label">Label for this passkey (optional)</Label>
            <Input
              id="account-passkey-label"
              type="text"
              autoComplete="off"
              placeholder="e.g. Work laptop"
              maxLength={80}
              value={newPasskeyLabel}
              onChange={(e) => setNewPasskeyLabel(e.target.value)}
              disabled={passkeyLoading}
              className="h-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void handleSetupPasskey()}
            disabled={passkeyLoading}
            className="gap-2"
          >
            {passkeyLoading ? "Setting up…" : "Add passkey"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4" />
            Change password
          </CardTitle>
          <CardDescription>
            Use a password that is at least 12 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <p className="text-sm text-muted-foreground mb-4" role="status">
              Password updated.
            </p>
          )}
          {passwordError && (
            <p className="text-sm text-destructive mb-4" role="alert">
              {passwordError}
            </p>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="account-current-password">Current password</Label>
              <Input
                id="account-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-new-password">New password</Label>
              <Input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={12}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-confirm-password">Confirm new password</Label>
              <Input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
