"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { businessSignInHref } from "@/lib/business-portal-urls";
import { useDispatch, useSelector } from "react-redux";
import { Settings, ChevronDown, ChevronRight, LayoutPanelLeft, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import { setTheme, setMobileSidebarOpen, type LayoutTheme } from "@/store/layout-slice";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlatformTestModeSwitch } from "@/components/layout/platform-test-mode-switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useShellNav } from "@/hooks/use-shell-nav";
import { longestMatchingNavHref } from "@/lib/nav-active";
import { MerchantEnvironmentSwitch } from "@/components/merchant/merchant-environment-switch";
import { setStoredActiveBusinessId } from "@/lib/businessAuthStorage";
import {
  setActiveBusinessId,
  type MerchantBusiness,
} from "@/store/merchant-session-slice";

function NavGroup({
  title,
  items,
  pathname,
  onItemClick,
}: {
  title: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  onItemClick?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80"
      >
        {title}
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
      </button>
      {open && (
        <nav className="space-y-0.5">
          {(() => {
            const hrefs = items.map((i) => i.href);
            const activeHref = longestMatchingNavHref(pathname, hrefs);
            return items.map((item) => {
              const isActive = activeHref === item.href;
              return (
              <Link
                key={item.href + item.label}
                href={item.href}
                prefetch={false}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-500/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
            });
          })()}
        </nav>
      )}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mobileSidebarOpen = useSelector((s: RootState) => s.layout.mobileSidebarOpen);
  const returnPath =
    (pathname || "/") +
    (searchParams.toString() ? `?${searchParams.toString()}` : "");
  const shellBusinessSignInHref = businessSignInHref(returnPath);
  const dispatch = useDispatch();
  const theme = useSelector((s: RootState) => s.layout.theme);
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);
  const activeBusinessId = useSelector((s: RootState) => s.merchantSession.activeBusinessId);

  const { navGroups, isUnauthedShell } = useShellNav();
  const activeBusiness =
    businesses.find((b: MerchantBusiness) => b.id === activeBusinessId) ?? businesses[0];
  const workspaceLabel = isUnauthedShell
    ? "Not signed in"
    : sessionType === "merchant"
      ? activeBusiness
        ? activeBusiness.name?.trim() || "Your business"
        : "Morapay platform"
      : "Morapay platform";

  const closeMobileSidebar = () => {
    dispatch(setMobileSidebarOpen(false));
  };

  useEffect(() => {
    dispatch(setMobileSidebarOpen(false));
  }, [pathname, dispatch]);

  return (
    <aside
      data-dashboard-sidebar
      className={cn(
        "flex h-full min-h-0 w-64 max-w-[85vw] shrink-0 flex-col bg-platform-primary text-white transition-transform duration-200 ease-out",
        "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-xl",
        mobileSidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        "lg:relative lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none",
        !mobileSidebarOpen && "max-lg:pointer-events-none"
      )}
    >
      {/* Workspace / business switcher */}
      <div className="px-3 py-3">
        {isUnauthedShell ? (
          <div className="space-y-2">
            <p className="px-2 text-sm text-white/80">{workspaceLabel}</p>
            <Button variant="secondary" className="w-full bg-white/15 text-white hover:bg-white/25" asChild>
              <Link href={shellBusinessSignInHref}>Sign in</Link>
            </Button>
          </div>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <Avatar className="size-8 rounded-md">
                  <AvatarFallback className="rounded-md bg-indigo-500/80 text-white">
                    {(activeBusiness?.name ?? "K").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{workspaceLabel}</span>
                <ChevronDown className="size-4 shrink-0 text-white/60" />
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
                      className={b.id === activeBusinessId ? "bg-slate-100 font-medium" : ""}
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
        )}
      </div>

      <nav className="scrollbar-dashboard-sidebar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-3">
        {navGroups.map((group) => (
          <NavGroup
            key={group.title}
            title={group.title}
            items={group.items}
            pathname={pathname}
            onItemClick={closeMobileSidebar}
          />
        ))}
      </nav>

      <div className="space-y-1 p-3">
        {sessionType === "platform" && !isUnauthedShell ? (
          <Link
            href="/settings"
            onClick={closeMobileSidebar}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "bg-indigo-500/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Settings className="size-4 shrink-0" aria-hidden />
            Settings
          </Link>
        ) : null}
        {!isUnauthedShell ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white/70 hover:bg-white/10 hover:text-white"
              >
                {theme === "sidebar" ? (
                  <LayoutPanelLeft className="size-4 shrink-0" aria-hidden />
                ) : (
                  <LayoutDashboard className="size-4 shrink-0" aria-hidden />
                )}
                <span className="text-sm">
                  {theme === "sidebar" ? "Sidebar layout" : "Top nav layout"}
                </span>
                <ChevronDown className="size-4 shrink-0" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onSelect={() => {
                  dispatch(setTheme("sidebar" as LayoutTheme));
                  closeMobileSidebar();
                }}
              >
                <LayoutPanelLeft className="size-4" aria-hidden />
                Sidebar layout
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  dispatch(setTheme("no-sidebar" as LayoutTheme));
                  closeMobileSidebar();
                }}
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Top nav layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {sessionType === "merchant" ? (
          <div className="flex items-center justify-between rounded-md px-3 py-2">
            <MerchantEnvironmentSwitch />
          </div>
        ) : sessionType === "platform" && !isUnauthedShell ? (
          <PlatformTestModeSwitch variant="sidebar" />
        ) : null}
      </div>
    </aside>
  );
}
