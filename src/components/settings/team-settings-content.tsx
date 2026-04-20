"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/ui/copy-button";
import type { SettingsAdmin, TeamPendingInvite, TeamSettingsSource } from "@/lib/data-settings";
import {
  inviteTeamAdminAction,
  removeMerchantTeamMemberAction,
  resendMerchantTeamInviteAction,
} from "@/app/settings/actions";

const PLATFORM_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "support", label: "Support Agent" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
] as const;

const MERCHANT_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "FINANCE", label: "Finance" },
  { value: "SUPPORT", label: "Support" },
] as const;

type TeamSettingsContentProps = {
  initialAdmins?: SettingsAdmin[] | null;
  initialInvites?: TeamPendingInvite[];
  teamSource?: TeamSettingsSource;
};

function fullInviteUrl(inviteLink: string): string {
  if (typeof window === "undefined") return inviteLink;
  if (inviteLink.startsWith("http")) return inviteLink;
  const base = window.location.origin.replace(/\/$/, "");
  const path = inviteLink.startsWith("/") ? inviteLink : `/${inviteLink}`;
  return `${base}${path}`;
}

function roleLabel(
  role: string,
  teamSource: TeamSettingsSource
): string {
  const list = teamSource === "merchant" ? MERCHANT_ROLES : PLATFORM_ROLES;
  const hit = list.find((r) => r.value === role);
  return hit?.label ?? role;
}

function formatKyc(status: string | undefined): string {
  if (!status || status.trim() === "") return "—";
  return status.replace(/_/g, " ");
}

function inviteExpired(expiresAtIso: string): boolean {
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t)) return false;
  return Date.now() > t;
}

export function TeamSettingsContent({
  initialAdmins,
  initialInvites = [],
  teamSource = "platform",
}: TeamSettingsContentProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const defaultRole = teamSource === "merchant" ? "SUPPORT" : "viewer";
  const [inviteRole, setInviteRole] = useState<string>(defaultRole);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [lastInviteExpiresAt, setLastInviteExpiresAt] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const admins = initialAdmins ?? [];
  const pendingInvites = initialInvites ?? [];
  const roleOptions = teamSource === "merchant" ? MERCHANT_ROLES : PLATFORM_ROLES;

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Verification</CardTitle>
          <CardDescription>
            {teamSource === "merchant"
              ? "Your business runs member KYC and founding member KYB from the verification hub. Use the link below for status and next steps."
              : "Businesses run user KYC (every member) and KYB (founding member, on their dashboard when ready). Platform staff review and support from Connect."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/verification">Open verification center</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>{teamSource === "merchant" ? "Team members" : "Admin list"}</CardTitle>
          <CardDescription>
            {teamSource === "merchant"
              ? "People who can sign in to this business in the portal."
              : "Staff who can access this dashboard. Super Admin can change fees and payout keys; Support can view only; Developer can view Logs and API keys."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {teamSource === "merchant" ? (
                  <>
                    <TableHead>Person KYC</TableHead>
                    <TableHead className="w-[100px]" />
                  </>
                ) : (
                  <TableHead>2FA</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={teamSource === "merchant" ? 5 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    {teamSource === "merchant"
                      ? "No active team members yet. Send an invite below."
                      : "No admins yet. Send an invite below."}
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {roleLabel(admin.role, teamSource)}
                      </Badge>
                    </TableCell>
                    {teamSource === "merchant" ? (
                      <>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatKyc(admin.portalKycStatus)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {admin.role === "OWNER" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={removingId === admin.id}
                              onClick={async () => {
                                if (!confirm(`Remove ${admin.email} from this business?`)) return;
                                setRemovingId(admin.id);
                                const r = await removeMerchantTeamMemberAction(admin.id);
                                setRemovingId(null);
                                if (r.success) router.refresh();
                                else alert(r.error ?? "Could not remove member");
                              }}
                            >
                              {removingId === admin.id ? "Removing…" : "Remove"}
                            </Button>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell>
                        {admin.twoFaEnabled ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {teamSource === "merchant" && pendingInvites.length > 0 ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>
              These people have been emailed a link. Invites expire after 48 hours; use Resend to issue a fresh link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => {
                  const expired = inviteExpired(inv.expiresAt);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabel(inv.role, "merchant")}</Badge>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={resendingId === inv.id}
                          onClick={async () => {
                            setResendingId(inv.id);
                            const r = await resendMerchantTeamInviteAction(inv.id);
                            setResendingId(null);
                            if (r.success) {
                              if (r.inviteLink) setLastInviteLink(r.inviteLink);
                              if (r.expiresAt) setLastInviteExpiresAt(r.expiresAt);
                              router.refresh();
                            } else {
                              alert(r.error ?? "Resend failed");
                            }
                          }}
                        >
                          {resendingId === inv.id ? "Sending…" : "Resend link"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>
            {teamSource === "merchant" ? "Invite team member" : "Invite new admin"}
          </CardTitle>
          <CardDescription>
            {teamSource === "merchant"
              ? "They will join this business with the role you choose. Their Morapay account must use the same email to accept."
              : "Create an invite and send the link to the user. Role determines what they can do on the platform dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError && (
              <p className="text-sm text-destructive w-full" role="alert">
                {inviteError}
              </p>
            )}
            <Button
              disabled={inviting || !inviteEmail.trim()}
              onClick={async () => {
                setInviting(true);
                setInviteError(null);
                setLastInviteLink(null);
                setLastInviteExpiresAt(null);
                const result = await inviteTeamAdminAction({
                  email: inviteEmail.trim(),
                  role: inviteRole,
                });
                setInviting(false);
                if (result.success) {
                  setInviteEmail("");
                  if (result.inviteLink) setLastInviteLink(result.inviteLink);
                  if (result.expiresAt) setLastInviteExpiresAt(result.expiresAt);
                  router.refresh();
                } else {
                  setInviteError(result.error ?? "Invite failed");
                }
              }}
            >
              {inviting ? "Creating…" : "Create invite"}
            </Button>
          </div>
          {lastInviteLink && (
            <div className="rounded-md border border-slate-200 bg-muted p-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Share this invite link:</p>
              <div className="flex items-center gap-1 flex-wrap">
                <code className="flex-1 min-w-0 text-xs font-mono break-all py-1.5 rounded font-medium">
                  {fullInviteUrl(lastInviteLink)}
                </code>
                <CopyButton
                  value={fullInviteUrl(lastInviteLink)}
                  label="Copy invite link"
                  size="sm"
                  variant="outline"
                />
              </div>
              {lastInviteExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(lastInviteExpiresAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
