"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type FixedMenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

/** Positions a menu below (or above if clipped) the trigger, right-aligned. */
export function useFixedMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
) {
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
      const menuWidth = 160;
      const gap = 6;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      );
      const below = rect.bottom + gap;
      const estimatedHeight = 160;
      const top =
        below + estimatedHeight > window.innerHeight - 8
          ? Math.max(8, rect.top - gap - estimatedHeight)
          : below;
      setPos({ top, left, minWidth: Math.max(menuWidth, rect.width) });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef]);

  return pos;
}
