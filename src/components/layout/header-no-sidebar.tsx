"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import { setTheme, setTestMode, type LayoutTheme } from "@/store/layout-slice";
import {
  setActiveBusinessId,
  type MerchantBusiness,
} from "@/store/merchant-session-slice";
import { getNavGroupsForSession, type NavGroupConfig } from "@/lib/nav-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const isActive = group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href))
  );

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
          isActive
            ? "border rounded-full p-1 px-4 border-slate-500 text-white "
            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
        )}
      >
        {group.title}
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 min-w-[180px] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {group.items.map((item) => {
            const itemActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const resolvedClass = cn(
              "flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
              itemActive && "bg-indigo-100 font-medium text-indigo-800"
            );
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={resolvedClass}
              // style={
              //   itemActive
              //     ? { backgroundColor: INDIGO_100_BG, color: INDIGO_800_TEXT }
              //     : undefined
              // }
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HeaderNoSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useSelector((s: RootState) => s.layout.theme);
  const testMode = useSelector((s: RootState) => s.layout.testMode);
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);
  const activeBusinessId = useSelector((s: RootState) => s.merchantSession.activeBusinessId);

  const navGroups = getNavGroupsForSession(sessionType);
  const activeBusiness =
    businesses.find((b: MerchantBusiness) => b.id === activeBusinessId) ??
    businesses[0];
  const workspaceLabel =
    sessionType === "merchant" && activeBusiness
      ? activeBusiness.name
      : "Klyra platform";

  const handleThemeSelect = (t: LayoutTheme) => () => dispatch(setTheme(t));
  const handleRefresh = () => router.refresh();

  return (
    <header className="flex shrink-0 flex-col border-b border-slate-200 bg-slate-900 text-white">
      {/* Row 1: logo, sandbox, theme selector, search, notification, settings, live/testnet, refresh */}
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-white"
          >
            {/* <span className="flex size-8 items-center justify-center rounded-md bg-indigo-500 font-bold">
              K
            </span> */}
            <Image src="/logo.jpg" alt="Klyra" width={32} height={32} />
            <span>Klyra</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {workspaceLabel}
                <ChevronDown className="size-3.5" aria-hidden />
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
                      onClick={() => dispatch(setActiveBusinessId(b.id))}
                    >
                      {b.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <div className="rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
                {sessionType === "merchant"
                  ? activeBusiness?.name ?? "Business"
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
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              type="search"
              placeholder="Search"
              className="h-9 w-full bg-white/10 pl-9 text-sm text-white placeholder:text-slate-400 focus-visible:ring-white/20"
              aria-label="Search"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="size-4" aria-hidden />
          </Button>
          {sessionType === "platform" ? (
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Settings"
              >
                <Settings className="size-4" aria-hidden />
              </Button>
            </Link>
          ) : (
            <Link href="/settings/general">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Business profile"
              >
                <Settings className="size-4" aria-hidden />
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2 pl-2">
            <span className="text-xs text-white/60">
              {testMode ? "Testnet" : "Live"}
            </span>
            <Switch
              checked={testMode}
              onCheckedChange={(v) => dispatch(setTestMode(v))}
              aria-label="Toggle live / testnet"
              className="data-[state=checked]:bg-indigo-600 bg-slate-600"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      {/* Row 2: parent navs (hover → children), AI assistant at end */}
      <div className="flex h-12 items-center justify-between px-4 py-2">
        <nav className="flex items-center gap-1 cursor-pointer">
          {navGroups.map((group) => (
            <NavParentDropdown key={group.title} group={group} pathname={pathname} />
          ))}
          {sessionType === "platform" ? (
            <Link
              href="/settings"
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
          className="gap-2 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="AI Assistant"
        >
          <Bot className="size-4" aria-hidden />
          AI Assistant
        </Button>
      </div>
    </header>
  );
}
