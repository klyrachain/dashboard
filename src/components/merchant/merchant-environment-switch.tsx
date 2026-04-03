"use client";

import { useDispatch, useSelector } from "react-redux";
import { Switch } from "@/components/ui/switch";
import {
  setMerchantEnvironment,
  type MerchantEnvironment,
} from "@/store/merchant-session-slice";
import { setStoredMerchantEnvironment } from "@/lib/businessAuthStorage";
import type { RootState } from "@/store";
import { cn } from "@/lib/utils";

type MerchantEnvironmentSwitchProps = {
  /** Header (dark) vs sidebar (dark) — same tokens, optional class tweaks */
  className?: string;
  labelClassName?: string;
};

export function MerchantEnvironmentSwitch({
  className,
  labelClassName,
}: MerchantEnvironmentSwitchProps) {
  const dispatch = useDispatch();
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const env = useSelector((s: RootState) => s.merchantSession.merchantEnvironment);

  if (sessionType !== "merchant") {
    return null;
  }

  const isTest = env === "TEST";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("text-xs text-white/60", labelClassName)}>
        Merchant API mode
      </span>
      <Switch
        checked={isTest}
        onCheckedChange={(v) => {
          const next: MerchantEnvironment = v ? "TEST" : "LIVE";
          dispatch(setMerchantEnvironment(next));
          setStoredMerchantEnvironment(next);
        }}
        aria-label="Toggle merchant test or live environment"
        className="data-[state=checked]:bg-amber-500 bg-slate-600"
      />
      <span className={cn("text-xs font-medium tabular-nums", labelClassName)}>
        {isTest ? "TEST" : "LIVE"}
      </span>
    </div>
  );
}
