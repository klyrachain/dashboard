"use client";

import { useState } from "react";
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
import type { SettingsAdmin } from "@/lib/data-settings";
import { inviteTeamAdminAction } from "@/app/settings/actions";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "support", label: "Support Agent" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
] as const;

type TeamSettingsContentProps = {
  initialAdmins?: SettingsAdmin[] | null;
};

export function TeamSettingsContent({ initialAdmins }: TeamSettingsContentProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const admins = initialAdmins ?? [];

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Admin list</CardTitle>
          <CardDescription>
            Staff who can access this dashboard. Super Admin can change fees and payout keys; Support can view only; Developer can view Logs and API keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>2FA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No admins yet. Send an invite below.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ROLES.find((r) => r.value === admin.role)?.label ?? admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.twoFaEnabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">Off</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Invite new admin</CardTitle>
          <CardDescription>
            Send an email invite. Role determines what they can do.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
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
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {inviteError && (
            <p className="text-sm text-destructive w-full" role="alert">{inviteError}</p>
          )}
          <Button
            disabled={inviting || !inviteEmail.trim()}
            onClick={async () => {
              setInviting(true);
              setInviteError(null);
              const result = await inviteTeamAdminAction({
                email: inviteEmail.trim(),
                role: inviteRole,
              });
              setInviting(false);
              if (result.success) {
                setInviteEmail("");
                router.refresh();
              } else {
                setInviteError(result.error ?? "Invite failed");
              }
            }}
          >
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
