"use client";

import Lenis from "lenis";
import { useEffect } from "react";

let landingLenis: Lenis | null = null;

/** Smooth scroll to the top of the landing page. */
export function scrollLandingToTop() {
  if (landingLenis) {
    landingLenis.scrollTo(0, { duration: 1.2 });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Calm desktop scroll; mobile a bit snappier so it doesn't feel sticky-slow.
 */
export function LandingSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches;

    const lenis = new Lenis(
      isTouch
        ? {
            duration: 1.05,
            smoothWheel: true,
            wheelMultiplier: 0.72,
            touchMultiplier: 0.95,
            syncTouch: true,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          }
        : {
            duration: 1.55,
            smoothWheel: true,
            wheelMultiplier: 0.48,
            touchMultiplier: 0.62,
            syncTouch: true,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          },
    );
    landingLenis = lenis;

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      lenis.destroy();
      if (landingLenis === lenis) landingLenis = null;
    };
  }, []);

  return null;
}
