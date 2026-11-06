"use client";

import { useEffect, useState, type FC } from "react";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "Ask anything",
  "Summarize a PDF in this project",
  "Compare Bitcoin to last week",
  "Draft a research brief",
  "Find the key claim in your docs",
  "Turn notes into next steps",
] as const;

const TYPE_MS = 38;
const HOLD_MS = 2200;
const DELETE_MS = 22;
const GAP_MS = 420;

/**
 * Cycling typewriter under the welcome brand.
 * Falls back to a static line when the user prefers reduced motion.
 */
export const WelcomeTagline: FC<{ className?: string }> = ({ className }) => {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">(
    "typing",
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const full = PROMPTS[index] ?? PROMPTS[0];
    let timer: number;

    if (phase === "typing") {
      if (text.length < full.length) {
        timer = window.setTimeout(() => {
          setText(full.slice(0, text.length + 1));
        }, TYPE_MS);
      } else {
        timer = window.setTimeout(() => setPhase("holding"), HOLD_MS);
      }
    } else if (phase === "holding") {
      timer = window.setTimeout(() => setPhase("deleting"), 0);
    } else if (text.length > 0) {
      timer = window.setTimeout(() => {
        setText(full.slice(0, text.length - 1));
      }, DELETE_MS);
    } else {
      timer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % PROMPTS.length);
        setPhase("typing");
      }, GAP_MS);
    }

    return () => window.clearTimeout(timer);
  }, [text, phase, index, reducedMotion]);

  if (reducedMotion) {
    return (
      <p className={cn("mt-2 text-sm text-zinc-500", className)}>
        Ask anything
      </p>
    );
  }

  return (
    <p
      className={cn(
        "mt-2 flex h-5 max-w-[min(100%,28rem)] items-center justify-center text-sm text-zinc-500",
        className,
      )}
      aria-live="polite"
    >
      <span className="truncate">{text}</span>
      <span
        aria-hidden
        className="ml-0.5 inline-block h-3.5 w-px translate-y-px bg-zinc-400/80 animate-pulse"
      />
    </p>
  );
};
