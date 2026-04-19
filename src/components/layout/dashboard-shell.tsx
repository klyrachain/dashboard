"use client";

import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { setMobileSidebarOpen } from "@/store/layout-slice";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";
import { HeaderNoSidebar } from "./header-no-sidebar";
import { StatusIndicator } from "@/components/status-indicator";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.layout.theme);
  const mobileSidebarOpen = useSelector((state: RootState) => state.layout.mobileSidebarOpen);

  if (theme === "no-sidebar") {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <HeaderNoSidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <main className="scrollbar-dashboard-main min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
            {children}
          </main>
        </div>
        <StatusIndicator />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => dispatch(setMobileSidebarOpen(false))}
        />
      ) : null}
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <main className="scrollbar-dashboard-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
            {children}
          </main>
        </div>
      </div>
      <StatusIndicator />
    </div>
  );
}
