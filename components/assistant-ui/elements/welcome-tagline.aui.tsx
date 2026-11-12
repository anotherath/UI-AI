"use client";

import { useEffect, useState, type FC } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_PROMPTS = [
  "Ask anything",
  "Summarize a PDF in this project",
  "Compare Bitcoin to last week",
  "Draft a research brief",
  "Find the key claim in your docs",
  "Turn notes into next steps",
] as const;

export const IMAGINE_PROMPTS = [
  "Paint with words. Soft light, quiet mood, fine grain.",
  "A rainy alley at dusk, neon reflections on wet stone.",
  "Portrait in window light, film still, gentle grain.",
  "Fog over a quiet lake, muted blues and silver.",
  "Sun through curtains, dust motes, warm stillness.",
  "City rooftop at blue hour, soft haze, distant glow.",
] as const;

export const SLIDES_PROMPTS = [
  "Describe a deck and generate slides.",
  "Pitch deck for a climate-tech startup.",
  "Ten slides on Q3 product strategy.",
  "Workshop outline with clear next steps.",
  "Investor update: traction, runway, ask.",
  "Keynote: why this idea matters now.",
] as const;

export const BUILD_PROMPTS = [
  "Describe a website and generate the layout.",
  "Hero, one CTA, and a product story in three beats.",
  "Marketing site for a climate-tech launch.",
  "Portfolio site with case-study highlights.",
  "SaaS homepage: problem, product, pricing teaser.",
  "Event site with date, speakers, and RSVP.",
] as const;

export const RESEARCH_PROMPTS = [
  "Ask a research question and dig into sources.",
  "Compare claims across recent papers.",
  "Summarize the evidence for a hypothesis.",
  "Find gaps in the literature on this topic.",
  "Outline a brief with citations to verify.",
  "What changed in this field in the last year?",
] as const;

const TYPE_MS = 38;
const HOLD_MS = 2200;
const DELETE_MS = 22;
const GAP_MS = 420;

/**
 * Cycling typewriter under the welcome brand.
 * Falls back to a static line when the user prefers reduced motion.
 */
export const WelcomeTagline: FC<{
  className?: string;
  prompts?: readonly string[];
  fallback?: string;
}> = ({
  className,
  prompts = DEFAULT_PROMPTS,
  fallback = prompts[0] ?? "Ask anything",
}) => {
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
    setIndex(0);
    setText("");
    setPhase("typing");
  }, [prompts]);

  useEffect(() => {
    if (reducedMotion) return;

    const full = prompts[index] ?? prompts[0] ?? "";
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
        setIndex((current) => (current + 1) % prompts.length);
        setPhase("typing");
      }, GAP_MS);
    }

    return () => window.clearTimeout(timer);
  }, [text, phase, index, reducedMotion, prompts]);

  if (reducedMotion) {
    return (
      <p className={cn("mt-2 text-sm text-zinc-500", className)}>{fallback}</p>
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
