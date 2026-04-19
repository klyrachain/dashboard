"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Glass surface + motion for TooltipContent (above dropdown menus at z 120). */
export const actionTooltipContentClassName =
  "z-[130] border border-white/15 bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-md backdrop-saturate-150 transition-[opacity,transform,filter] duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5";

export interface ActionTooltipProps {
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  label: string;
  actionLabel?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void | Promise<void>;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
}

const ACTION_MS = 2000;

export function ActionTooltip({
  children,
  label,
  actionLabel,
  onClick,
  side = "top",
  sideOffset = 6,
  className,
}: ActionTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [isActionState, setIsActionState] = React.useState(false);

  const lockCloseRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActionStateRef = React.useRef(false);

  React.useEffect(() => {
    isActionStateRef.current = isActionState;
  }, [isActionState]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!newOpen && (lockCloseRef.current || isActionStateRef.current)) {
      return;
    }

    setOpen(newOpen);

    if (!newOpen) {
      setIsActionState(false);
      isActionStateRef.current = false;
      lockCloseRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, []);

  const handleWrapperClick = React.useCallback(
    (event: React.MouseEvent<HTMLSpanElement>) => {
      if (event.defaultPrevented) return;
      const showAction = Boolean(actionLabel);
      if (showAction) {
        lockCloseRef.current = true;
      }
      void onClick?.(event as React.MouseEvent<HTMLElement>);
      if (!showAction) return;

      setIsActionState(true);
      isActionStateRef.current = true;
      setOpen(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setIsActionState(false);
        isActionStateRef.current = false;
        lockCloseRef.current = false;
        setOpen(false);
      }, ACTION_MS);
    },
    [actionLabel, onClick]
  );

  const triggerChild = React.Children.only(children);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0" onClick={handleWrapperClick}>
            {triggerChild}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          aria-live={isActionState ? "polite" : undefined}
          className={cn(actionTooltipContentClassName, className)}
        >
          {isActionState && actionLabel ? actionLabel : label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
