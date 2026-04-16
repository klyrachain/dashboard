"use client";

import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { Search, Bell, ChevronDown, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "@/hooks/use-admin";
import { postLogout } from "@/lib/auth-api";
import { clearSession } from "@/store/auth-slice";
import { resetAuthSessionSyncRef } from "@/components/auth/auth-session-sync";
import { clearMerchantPortalHttpOnlyCookie } from "@/lib/portal-auth-client";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
import type { RootState } from "@/store";
import { clearMerchantPortal } from "@/store/merchant-session-slice";
import {
  clearBusinessAccessToken,
  setStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import { setMerchantEnvironment } from "@/store/merchant-session-slice";
import { setTestMode } from "@/store/layout-slice";
import { useShellNav } from "@/hooks/use-shell-nav";

export function Topbar({ className }: { className?: string }) {
  const dispatch = useDispatch();
  const admin = useAdmin();
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const merchantEnvironment = useSelector(
    (s: RootState) => s.merchantSession.merchantEnvironment
  );
  const platformTestMode = useSelector((s: RootState) => s.layout.testMode);
  const portalUserEmail = useSelector((s: RootState) => s.merchantSession.portalUserEmail);
  const portalUserDisplayName = useSelector(
    (s: RootState) => s.merchantSession.portalUserDisplayName
  );

  const isMerchant = sessionType === "merchant";
  const { isUnauthedShell } = useShellNav();
  const isSandbox = isUnauthedShell
    ? false
    : isMerchant
      ? merchantEnvironment === "TEST"
      : platformTestMode === true;

  const handleLogout = async () => {
    if (isMerchant) {
      resetAuthSessionSyncRef();
      dispatch(clearMerchantPortal());
      clearBusinessAccessToken();
      try {
        await fetch("/api/portal/merchant-session", {
          method: "DELETE",
          credentials: "include",
        });
      } catch {
        /* continue */
      }
      window.location.href = "/business/signin";
      return;
    }

    resetAuthSessionSyncRef();
    dispatch(clearSession());
    try {
      await postLogout();
    } catch {
      // continue to clear client session
    }
    try {
      await clearMerchantPortalHttpOnlyCookie();
    } catch {
      // non-fatal — NextAuth sign-out still runs
    }
    window.location.href = "/api/auth/signout?callbackUrl=" + encodeURIComponent("/login");
  };

  const triggerLabel = isUnauthedShell
    ? "Sign in"
    : isMerchant
      ? portalUserDisplayName?.trim() ||
        portalUserEmail?.trim() ||
        "Account"
      : admin?.name?.trim() || admin?.email || "Account";

  return (
    <>
      {/* Sandbox banner — hidden when not authenticated */}
      {!isUnauthedShell ? (
        <div className="flex shrink-0 items-center justify-between gap-4 bg-platform-primary px-6 py-3 text-sm text-white">
          <p className="text-slate-300">
            {isSandbox
              ? "You are currently in test mode. Actions are sandboxed."
              : "You are currently in live mode."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 bg-white/10 text-white hover:bg-white/20"
            onClick={() => {
              if (isMerchant) {
                dispatch(setMerchantEnvironment("LIVE"));
                setStoredMerchantEnvironment("LIVE");
                return;
              }
              dispatch(setTestMode(false));
            }}
            disabled={!isSandbox}
          >
            {isSandbox ? "Switch to live account" : "Live mode active"}
          </Button>
        </div>
      ) : null}

      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-between gap-4 px-6 text-white",
          className
        )}
        style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
      >
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search"
              className="h-9 w-full bg-white/10 pl-9 text-sm text-white placeholder:text-slate-400 focus-visible:ring-white/20"
              aria-label="Search"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isUnauthedShell ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </Button>
          ) : null}
          {isUnauthedShell ? (
            <Button variant="secondary" size="sm" className="bg-white/15 text-white hover:bg-white/25" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-sm text-white/90 hover:bg-white/10 hover:text-white"
                  aria-label="Account menu"
                >
                  {triggerLabel}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isMerchant ? (
                  <>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        {portalUserDisplayName?.trim() ? (
                          <span className="font-medium text-foreground">
                            {portalUserDisplayName.trim()}
                          </span>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {portalUserEmail?.trim() ?? "—"}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings/general"
                        prefetch={false}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Settings className="size-4" />
                        Business settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="size-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        {admin?.name && (
                          <span className="font-medium text-foreground">{admin.name}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {admin?.email ?? "—"}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings/account"
                        prefetch={false}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <User className="size-4" />
                        Account & security
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings/general"
                        prefetch={false}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Settings className="size-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="size-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </>
  );
}
