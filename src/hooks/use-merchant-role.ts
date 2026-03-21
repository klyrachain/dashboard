"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store";

/** Active business membership role for portal RBAC (merchant session only). */
export function useMerchantRole(): string | null {
  return useSelector((s: RootState) => s.merchantSession.activeBusinessRole);
}

export function useMerchantEnvironment(): "TEST" | "LIVE" {
  return useSelector((s: RootState) => s.merchantSession.merchantEnvironment);
}
