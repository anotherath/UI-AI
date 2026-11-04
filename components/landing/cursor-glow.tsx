"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Inner labels only — brackets are rendered as literal typography. */
const CUES = [
  { id: "hero", text: "SCROLL" },
  { id: "preview", text: "PSYCH" },
  { id: "horizon", text: "DRIFT" },
  { id: "features", text: "SHH" },
  { id: "brain", text: "SYNCING…" },
  { id: "team", text: "REAL PEOPLE" },
  { id: "cta", text: "TOUCH DOWN" },
] as const;

/** Offset so the OS cursor tip never sits on top of the cue. */
const OFFSET_X = 18;
const OFFSET_Y = 22;

/**
 * Bracket cue that trails the pointer — landing only.
 * Renders as literal [TEXT], not a bordered chip.
 */
export function LandingCursorGlow() {
  const elRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const flashTimer = useRef(0);
  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduce.matches || !fine.matches) {
      el.hidden = true;
      return;
    }
    setEnabled(true);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;
    let running = false;
    let visible = false;

    const nodes = CUES.map((cue) =>
      document.querySelector<HTMLElement>(`[data-landing-cue="${cue.id}"]`),
    );

    const readCue = () => {
      const gate = window.innerHeight * 0.42;
      let next = 0;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (!node) continue;
        if (node.getBoundingClientRect().top <= gate) {
          next = i;
          break;
        }
      }
      if (next === indexRef.current) return;
      indexRef.current = next;
      setIndex(next);
      setFlash(true);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(false), 280);
    };

    const paint = () => {
      el.style.transform = `translate3d(${x + OFFSET_X}px, ${y + OFFSET_Y}px, 0)`;
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      paint();
      if (Math.abs(tx - x) < 0.2 && Math.abs(ty - y) < 0.2) {
        x = tx;
        y = ty;
        paint();
        stop();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      tx = event.clientX;
      ty = event.clientY;
      if (!visible) {
        visible = true;
        x = tx;
        y = ty;
        el.style.opacity = "1";
        paint();
      }
      kick();
    };

    const onLeave = () => {
      visible = false;
      el.style.opacity = "0";
      stop();
    };

    readCue();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", readCue, { passive: true });
    window.addEventListener("resize", readCue);
    document.documentElement.addEventListener("mouseleave", onLeave);
    paint();

    return () => {
      stop();
      window.clearTimeout(flashTimer.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", readCue);
      window.removeEventListener("resize", readCue);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const cue = CUES[index] ?? CUES[0];

  return (
    <div
      ref={elRef}
      aria-hidden
      className="landing-cursor-cue pointer-events-none fixed top-0 left-0 z-40 opacity-0 transition-opacity duration-200"
    >
      {enabled ? (
        <span
          key={cue.id}
          className={cn(
            "landing-section-cue inline-flex items-baseline whitespace-nowrap font-mono text-[11px] tracking-[0.2em] text-lime-400 uppercase",
            flash && "landing-section-cue-flash",
          )}
        >
          <span className="text-lime-400/70">[</span>
          {cue.text}
          <span className="text-lime-400/70">]</span>
        </span>
      ) : null}
    </div>
  );
}
