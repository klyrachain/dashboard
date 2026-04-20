"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useAnimationControls } from "framer-motion";
import {
  NetworkArbitrumOne,
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkEthereum,
  NetworkPolygon,
  NetworkTron,
} from "@web3icons/react";
import type { IconComponent } from "@web3icons/react";
import { cn } from "@/lib/utils";

const BASE_CHAINS: { id: string; label: string; Icon: IconComponent }[] = [
  { id: "ethereum", label: "Ethereum", Icon: NetworkEthereum },
  { id: "tron", label: "Tron", Icon: NetworkTron },
  { id: "polygon", label: "Polygon", Icon: NetworkPolygon },
  { id: "arbitrum", label: "Arbitrum", Icon: NetworkArbitrumOne },
  { id: "base", label: "Base", Icon: NetworkBase },
  { id: "bsc", label: "BNB Chain", Icon: NetworkBinanceSmartChain },
];

const CHAIN_COUNT = BASE_CHAINS.length;
const REPEAT_MULTIPLIER = 5;
const EXTENDED_CHAINS = Array.from({ length: REPEAT_MULTIPLIER }).flatMap(() => BASE_CHAINS);

const MIDDLE_ARRAY_START = Math.floor(REPEAT_MULTIPLIER / 2) * CHAIN_COUNT;

const DEFAULT_ITEM_PX = 64;
const DEFAULT_GAP_PX = 16;
const DEFAULT_ICON_SIZE = 48;

export type SupportedNetworksCarouselProps = {
  /** When false, animation pauses and position resets on next enable (e.g. dialog closed). */
  enabled: boolean;
  /** Width/height of each chain hit target in px. */
  itemPx?: number;
  gapPx?: number;
  iconSize?: number;
  /** Spotlight frame in the center (QR dialog). */
  showCenterFrame?: boolean;
  showEdgeGradient?: boolean;
  /** Autoplay interval in ms. */
  intervalMs?: number;
  className?: string;
  trackClassName?: string;
};

export function SupportedNetworksCarousel({
  enabled,
  itemPx = DEFAULT_ITEM_PX,
  gapPx = DEFAULT_GAP_PX,
  iconSize = DEFAULT_ICON_SIZE,
  showCenterFrame = true,
  showEdgeGradient = true,
  intervalMs = 2500,
  className,
  trackClassName,
}: SupportedNetworksCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(MIDDLE_ARRAY_START);
  const currentIndexRef = useRef(MIDDLE_ARRAY_START);
  const isAnimatingRef = useRef(false);
  const controls = useAnimationControls();

  const stride = itemPx + gapPx;

  const calculateX = useCallback(
    (index: number) => {
      return -(index * stride + itemPx / 2);
    },
    [stride, itemPx]
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    controls.set({ x: calculateX(MIDDLE_ARRAY_START) });
    currentIndexRef.current = MIDDLE_ARRAY_START;
    queueMicrotask(() => {
      setActiveIndex(MIDDLE_ARRAY_START);
    });
  }, [enabled, controls, calculateX]);

  const glideTo = useCallback(
    async (targetIndex: number) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      setActiveIndex(targetIndex);
      currentIndexRef.current = targetIndex;

      await controls.start({
        x: calculateX(targetIndex),
        transition: { type: "spring", stiffness: 220, damping: 28 },
      });

      let snapIndex = targetIndex;
      if (targetIndex >= MIDDLE_ARRAY_START + CHAIN_COUNT) {
        snapIndex = targetIndex - CHAIN_COUNT;
      } else if (targetIndex < MIDDLE_ARRAY_START) {
        snapIndex = targetIndex + CHAIN_COUNT;
      }

      if (snapIndex !== targetIndex) {
        controls.set({ x: calculateX(snapIndex) });
        setActiveIndex(snapIndex);
        currentIndexRef.current = snapIndex;
      }

      isAnimatingRef.current = false;
    },
    [calculateX, controls]
  );

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      void glideTo(currentIndexRef.current + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, glideTo, intervalMs]);

  const frameSize = itemPx + 2;
  const trackHeight = Math.max(72, itemPx + 24);

  return (
    <div
      className={cn("relative isolate w-full max-w-full overflow-hidden", className)}
      style={{ height: trackHeight }}
      role="group"
      aria-label="Supported payment networks"
    >
      <motion.div
        className={cn(
          "absolute left-[50%] top-1/2 flex w-max -translate-y-1/2 items-center",
          trackClassName
        )}
        style={{ gap: gapPx, willChange: "transform" }}
        animate={controls}
      >
        {EXTENDED_CHAINS.map((chain, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={`${index}-${chain.id}`}
              type="button"
              style={{ width: itemPx, height: itemPx }}
              className={cn(
                "relative flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected ? "z-[1]" : "z-0"
              )}
              onClick={() => void glideTo(index)}
              aria-pressed={isSelected}
              aria-label={chain.label}
            >
              <motion.span
                className="flex items-center justify-center"
                animate={{
                  scale: isSelected ? 1 : 0.75,
                  opacity: isSelected ? 1 : 0.4,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <chain.Icon variant="background" size={iconSize} aria-hidden />
              </motion.span>
            </button>
          );
        })}
      </motion.div>

      {showEdgeGradient ? (
        <div
          className="pointer-events-none absolute inset-0 z-2 bg-gradient-to-x from-background/20 via-transparent to-background/0"
          aria-hidden
        />
      ) : null}

      {showCenterFrame ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-3 box-border -translate-x-1/2 -translate-y-1/2 border border-primary bg-primary/[0.04] ring-1 ring-primary/20"
          style={{ width: frameSize, height: frameSize }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
