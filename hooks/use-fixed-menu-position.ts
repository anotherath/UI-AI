"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type FixedMenuPosition = {
  /** Prefer `bottom` when opening above so height need not be estimated. */
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
};

export type FixedMenuPositionOptions = {
  /** Prefer opening below or above the trigger. Default: below. */
  prefer?: "below" | "above";
  /** Used to decide flip / clip when preferring below. */
  estimatedHeight?: number;
  /** Horizontal alignment relative to the trigger. Default: right. */
  align?: "left" | "right";
  menuWidth?: number;
  gap?: number;
  /**
   * When set, vertical placement uses this ancestor (e.g. composer shell)
   * while horizontal still follows the trigger.
   */
  edgeSelector?: string;
};

/** Positions a fixed menu next to a trigger, flipping when clipped. */
export function useFixedMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  options: FixedMenuPositionOptions = {},
) {
  const {
    prefer = "below",
    estimatedHeight = 160,
    align = "right",
    menuWidth = 160,
    gap = 6,
    edgeSelector,
  } = options;
  const [pos, setPos] = useState<FixedMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const edgeEl = edgeSelector
        ? (el.closest(edgeSelector) as HTMLElement | null)
        : null;
      const edge = edgeEl?.getBoundingClientRect() ?? rect;

      const left =
        align === "left"
          ? Math.min(
              Math.max(8, rect.left),
              window.innerWidth - menuWidth - 8,
            )
          : Math.min(
              Math.max(8, rect.right - menuWidth),
              window.innerWidth - menuWidth - 8,
            );

      const belowTop = edge.bottom + gap;
      const spaceAbove = edge.top - 8;
      const spaceBelow = window.innerHeight - 8 - edge.bottom;
      const fitsBelow = spaceBelow >= estimatedHeight;
      const fitsAbove = spaceAbove >= Math.min(estimatedHeight, 120);

      let next: FixedMenuPosition;
      const openAbove =
        prefer === "above"
          ? fitsAbove || !fitsBelow
          : !fitsBelow && fitsAbove;

      if (openAbove) {
        next = {
          bottom: window.innerHeight - edge.top + gap,
          left,
          minWidth: Math.max(menuWidth, rect.width),
        };
      } else {
        next = {
          top: belowTop,
          left,
          minWidth: Math.max(menuWidth, rect.width),
        };
      }

      setPos(next);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [
    open,
    triggerRef,
    prefer,
    estimatedHeight,
    align,
    menuWidth,
    gap,
    edgeSelector,
  ]);

  return pos;
}
