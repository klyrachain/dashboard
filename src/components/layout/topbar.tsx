"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { businessSignInHref } from "@/lib/business-portal-urls";
import { Search, Bell, ChevronDown, User, LogOut, Settings, LayoutPanelLeft } from "lucide-react";
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
import { signOut } from "next-auth/react";
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
import { setTestMode, toggleMobileSidebar } from "@/store/layout-slice";
import { useShellNav } from "@/hooks/use-shell-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Topbar({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnPath =
    (pathname || "/") +
    (searchParams.toString() ? `?${searchParams.toString()}` : "");
  const shellBusinessSignInHref = businessSignInHref(returnPath);
  const dispatch = useDispatch();
  const openMobileNav = () => {
    dispatch(toggleMobileSidebar());
  };
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
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);
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
    /** Avoid GET `/api/auth/signout` (NextAuth interstitial); go straight to business portal sign-in. */
    await signOut({ callbackUrl: "/business/signin", redirect: true });
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
        <>
          <div className="flex shrink-0 flex-col gap-3 bg-platform-primary px-4 py-3 text-sm text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <p className="min-w-0 text-slate-300">
              {isSandbox
                ? "You are currently in test mode. Actions are sandboxed."
                : "You are currently in live mode."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 bg-white/10 text-white hover:bg-white/20"
              type="button"
              onClick={() => {
                if (!isSandbox) return;
                setLiveConfirmOpen(true);
              }}
              disabled={!isSandbox}
            >
              {isSandbox ? "Switch to live account" : "Live mode active"}
            </Button>
          </div>
          <Dialog open={liveConfirmOpen} onOpenChange={setLiveConfirmOpen}>
            <DialogContent className="sm:max-w-md border-none" showClose>
              <DialogHeader>
                <DialogTitle>Switch to live mode?</DialogTitle>
                <DialogDescription>
                  {isMerchant
                    ? "Live mode uses production merchant APIs and can affect real money. Confirm you are ready to leave the sandbox."
                    : "Live mode uses production platform data. Confirm you intend to leave testnet."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setLiveConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (isMerchant) {
                      dispatch(setMerchantEnvironment("LIVE"));
                      setStoredMerchantEnvironment("LIVE");
                    } else {
                      dispatch(setTestMode(false));
                    }
                    setLiveConfirmOpen(false);
                  }}
                >
                  Switch to live
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      <header
        className={cn(
          "relative z-[45] flex h-14 shrink-0 items-center justify-between gap-2 px-4 text-white sm:gap-4 sm:px-6",
          className
        )}
        style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={openMobileNav}
            aria-label="Open navigation menu"
          >
            <LayoutPanelLeft className="size-5" aria-hidden />
          </Button>
          <div className="relative min-w-0 max-w-full flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search"
              className="h-9 w-full bg-white/10 pl-9 text-sm text-white placeholder:text-slate-400 focus-visible:ring-white/20"
              aria-label="Search"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
              <Link href={shellBusinessSignInHref}>Sign in</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-sm text-white/90 hover:bg-white/10 hover:text-white"
                  aria-label="Account menu"
                >
                  <User className="size-4 shrink-0 md:hidden" aria-hidden />
                  <span className="hidden max-w-[120px] truncate md:inline">{triggerLabel}</span>
                  <ChevronDown className="hidden size-4 shrink-0 md:block" aria-hidden />
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
