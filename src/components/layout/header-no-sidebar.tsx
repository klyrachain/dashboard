"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { businessSignInHref } from "@/lib/business-portal-urls";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Bell,
  Settings,
  RefreshCw,
  ChevronDown,
  LayoutPanelLeft,
  LayoutDashboard,
  Bot,
  User,
  LogOut,
  MoreHorizontal,
  Building2,
} from "lucide-react";
import type { RootState } from "@/store";
import { useAdmin } from "@/hooks/use-admin";
import { signOut } from "next-auth/react";
import { postLogout } from "@/lib/auth-api";
import { clearSession } from "@/store/auth-slice";
import { resetAuthSessionSyncRef } from "@/components/auth/auth-session-sync";
import { MerchantEnvironmentSwitch } from "@/components/merchant/merchant-environment-switch";
import {
  clearBusinessAccessToken,
  setStoredActiveBusinessId,
} from "@/lib/businessAuthStorage";
import { cn } from "@/lib/utils";
import { setTheme, type LayoutTheme } from "@/store/layout-slice";
import {
  clearMerchantPortal,
  setActiveBusinessId,
  type MerchantBusiness,
} from "@/store/merchant-session-slice";
import { type NavGroupConfig } from "@/lib/nav-config";
import { longestMatchingNavHref } from "@/lib/nav-active";
import { useShellNav } from "@/hooks/use-shell-nav";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
import { clearMerchantPortalHttpOnlyCookie } from "@/lib/portal-auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformTestModeSwitch } from "@/components/layout/platform-test-mode-switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from "react";

function NavParentDropdown({
  group,
  pathname,
}: {
  group: NavGroupConfig;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    timeoutRef.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => () => cancelClose(), []);

  const groupHrefs = group.items.map((i) => i.href);
  const activeInGroup = longestMatchingNavHref(pathname, groupHrefs);
  const isActive = activeInGroup != null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            isActive
              ? "border border-slate-500 px-4 py-1 text-white"
              : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
          )}
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
        >
          {group.title}
          <ChevronDown className="ml-0.5 inline size-3.5 align-middle" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-[180px]"
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {group.items.map((item) => {
          const itemActive = activeInGroup === item.href;
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href + item.label} asChild>
              <Link
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex cursor-pointer items-center gap-2",
                  itemActive && "bg-indigo-100 font-medium text-indigo-800 focus:bg-indigo-100 focus:text-indigo-800"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HeaderNoSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnPath =
    (pathname || "/") +
    (searchParams.toString() ? `?${searchParams.toString()}` : "");
  const shellBusinessSignInHref = businessSignInHref(returnPath);
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useSelector((s: RootState) => s.layout.theme);
  const admin = useAdmin();
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);
  const activeBusinessId = useSelector((s: RootState) => s.merchantSession.activeBusinessId);
  const portalUserEmail = useSelector((s: RootState) => s.merchantSession.portalUserEmail);
  const portalUserDisplayName = useSelector(
    (s: RootState) => s.merchantSession.portalUserDisplayName
  );

  const { navGroups, isUnauthedShell } = useShellNav();
  const activeBusiness =
    businesses.find((b: MerchantBusiness) => b.id === activeBusinessId) ??
    businesses[0];
  const workspaceLabel = isUnauthedShell
    ? "Not signed in"
    : sessionType !== "merchant"
      ? "Morapay platform"
      : activeBusiness
        ? activeBusiness.name?.trim() || "Your business"
        : "Morapay platform";

  const handleThemeSelect = (t: LayoutTheme) => () => dispatch(setTheme(t));
  const handleRefresh = () => router.refresh();

  const handleLogout = async () => {
    resetAuthSessionSyncRef();
    if (sessionType === "merchant") {
      dispatch(clearMerchantPortal());
      clearBusinessAccessToken();
      try {
        await fetch("/api/portal/merchant-session", { method: "DELETE" });
      } catch {
        /* continue */
      }
      window.location.href = "/business/signin";
      return;
    }
    dispatch(clearSession());
    try {
      await postLogout();
    } catch {
      // continue to clear client session
    }
    try {
      await clearMerchantPortalHttpOnlyCookie();
    } catch {
      // non-fatal
    }
    await signOut({ callbackUrl: "/business/signin", redirect: true });
  };

  const displayName = isUnauthedShell
    ? "Sign in"
    : admin?.name?.trim() || admin?.email || "Account";

  return (
    <header
      className="relative z-[70] flex shrink-0 flex-col border-b border-slate-200 text-white"
      style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
    >
      {/* Row 1: logo, sandbox, theme selector, search, notification, settings, live/testnet, refresh */}
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2 text-lg font-semibold text-white"
          >
            {/* <span className="flex size-8 items-center justify-center rounded-md bg-indigo-500 font-bold">
              K
            </span> */}
            <Image src="/logo.jpg" alt="morapay" width={32} height={32} />
            <span>morapay</span>
          </Link>
          {isUnauthedShell ? (
            <span className="text-sm text-white/70">{workspaceLabel}</span>
          ) : (
            <>
              <div className="hidden items-center gap-2 lg:flex lg:gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex max-w-[200px] items-center gap-1 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      <Building2 className="size-4 shrink-0 opacity-80" aria-hidden />
                      <span className="truncate">{workspaceLabel}</span>
                      <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-medium text-slate-500">
                      {sessionType === "merchant" ? "Business" : "Workspace"}
                    </div>
                    {sessionType === "merchant" && businesses.length > 0 ? (
                      <>
                        {businesses.map((b: MerchantBusiness) => (
                          <DropdownMenuItem
                            key={b.id}
                            onClick={() => {
                              dispatch(setActiveBusinessId(b.id));
                              setStoredActiveBusinessId(b.id);
                            }}
                          >
                            {b.name?.trim() || "Your business"}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    <div className="rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
                      {sessionType === "merchant"
                        ? activeBusiness?.name?.trim() || "Your business"
                        : "Platform admin"}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      {theme === "sidebar" ? (
                        <LayoutPanelLeft className="size-4" aria-hidden />
                      ) : (
                        <LayoutDashboard className="size-4" aria-hidden />
                      )}
                      <span className="text-sm">
                        {theme === "sidebar" ? "Sidebar" : "Topnav"}
                      </span>
                      <ChevronDown className="size-3.5" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleThemeSelect("sidebar")}>
                      <LayoutPanelLeft className="size-4" aria-hidden />
                      Sidebar layout
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleThemeSelect("no-sidebar")}>
                      <LayoutDashboard className="size-4" aria-hidden />
                      Top nav layout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
                    aria-label="Workspace, layout, and tools"
                  >
                    <MoreHorizontal className="size-5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Workspace
                  </DropdownMenuLabel>
                  {sessionType === "merchant" && businesses.length > 0 ? (
                    <>
                      {businesses.map((b: MerchantBusiness) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => {
                            dispatch(setActiveBusinessId(b.id));
                            setStoredActiveBusinessId(b.id);
                          }}
                        >
                          {b.name?.trim() || "Your business"}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <div className="rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
                    {sessionType === "merchant"
                      ? activeBusiness?.name?.trim() || "Your business"
                      : "Platform admin"}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Layout
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleThemeSelect("sidebar")}>
                    <LayoutPanelLeft className="size-4" aria-hidden />
                    Sidebar layout
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleThemeSelect("no-sidebar")}>
                    <LayoutDashboard className="size-4" aria-hidden />
                    Top nav layout
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="opacity-60">
                    <Bell className="size-4" aria-hidden />
                    Notifications (soon)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.refresh()}>
                    <RefreshCw className="size-4" aria-hidden />
                    Refresh page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center px-2 sm:px-4 lg:px-8">
          <div className="relative w-full min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
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
              className="hidden size-9 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer lg:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="size-4" aria-hidden />
            </Button>
          ) : null}
          {isUnauthedShell ? (
            <Button variant="secondary" size="sm" className="bg-white/15 text-white hover:bg-white/25" asChild>
              <Link href={shellBusinessSignInHref}>Sign in</Link>
            </Button>
          ) : sessionType === "platform" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Account menu"
                >
                  <User className="size-4 shrink-0 lg:hidden" aria-hidden />
                  <span className="hidden max-w-[140px] truncate lg:inline">{displayName}</span>
                  <ChevronDown className="size-3.5 shrink-0 max-lg:hidden" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
                  <Link href="/settings/account" prefetch={false} className="flex items-center gap-2 cursor-pointer">
                    <User className="size-4" />
                    Account & security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/general" prefetch={false} className="flex items-center gap-2 cursor-pointer">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Business account menu"
                >
                  <User className="size-4 shrink-0 lg:hidden" aria-hidden />
                  <span className="hidden max-w-[140px] truncate lg:inline">
                    {portalUserDisplayName?.trim() ||
                      portalUserEmail?.trim() ||
                      "Account"}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 max-lg:hidden" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="size-4" />
                    Business settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {sessionType === "merchant" ? (
            <MerchantEnvironmentSwitch className="pl-2" />
          ) : sessionType === "platform" && !isUnauthedShell ? (
            <PlatformTestModeSwitch variant="header" />
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer lg:inline-flex"
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      {/* Row 2: parent navs (hover → children), AI assistant at end */}
      <div className="flex h-12 min-w-0 items-center justify-between gap-2 overflow-hidden px-4">
        <nav
          className="-mx-1 flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-visible px-1 py-1 [scrollbar-width:thin]"
          aria-label="Primary"
        >
          {navGroups.map((group) => (
            <NavParentDropdown key={group.title} group={group} pathname={pathname} />
          ))}
          {isUnauthedShell ? (
            <Link
              href={shellBusinessSignInHref}
              prefetch={false}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white"
            >
              Sign in
            </Link>
          ) : null}
          {sessionType === "platform" && !isUnauthedShell ? (
            <Link
              href="/settings"
              prefetch={false}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/settings" || pathname.startsWith("/settings/")
                  ? "border rounded-full p-1 px-4 border-slate-500 text-white "
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              Settings
            </Link>
          ) : null}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-2 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="AI Assistant"
        >
          <Bot className="size-4" aria-hidden />
          <span className="hidden sm:inline">AI Assistant</span>
        </Button>
      </div>
    </header>
  );
}
