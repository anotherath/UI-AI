"use client";

import { ArrowUpIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { scrollLandingToTop } from "@/components/landing/smooth-scroll";
import { cn } from "@/lib/utils";

/**
 * Fixed corner control — appears after leaving the hero, scrolls to top.
 */
export function LandingBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(window.scrollY > window.innerHeight * 0.55);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => scrollLandingToTop()}
      className={cn(
        "fixed right-4 bottom-4 z-50 inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-[#121214]/90 text-zinc-200 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[opacity,transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:right-6 sm:bottom-6",
        "hover:border-white/30 hover:bg-[#1a1a1e] hover:text-white",
        "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUpIcon className="size-4" strokeWidth={2.25} />
    </button>
  );
}
