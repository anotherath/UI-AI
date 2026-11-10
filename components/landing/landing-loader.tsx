"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { AiMark } from "@/components/brand/ai-mark";
import { cn } from "@/lib/utils";

type LandingLoaderProps = {
  progress: number;
  exiting?: boolean;
};

const STATUS_LINES = [
  "Aligning trajectory",
  "Warming the engines",
  "Loading the launch pad",
  "Tuning the sky",
  "Almost liftoff",
] as const;

/** Bracket cue that trails the pointer on the boot screen. */
function cueForProgress(pct: number): string {
  if (pct >= 100) return "LIFTOFF";
  if (pct >= 88) return "IGNITION";
  if (pct >= 62) return "FUELING";
  if (pct >= 28) return "ARMING";
  return "HOLD";
}

const CUE_OFFSET_X = 18;
const CUE_OFFSET_Y = 22;

function LoaderCursorCue({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevLabel = useRef(label);

  useEffect(() => {
    if (prevLabel.current === label) return;
    prevLabel.current = label;
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), 280);
    return () => window.clearTimeout(id);
  }, [label]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !active) return;

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

    const paint = () => {
      el.style.transform = `translate3d(${x + CUE_OFFSET_X}px, ${y + CUE_OFFSET_Y}px, 0)`;
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
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

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    paint();

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [active]);

  return (
    <div
      ref={elRef}
      aria-hidden
      className="landing-cursor-cue pointer-events-none absolute top-0 left-0 z-20 opacity-0 transition-opacity duration-200"
    >
      {enabled ? (
        <span
          key={label}
          className={cn(
            "landing-section-cue inline-flex items-baseline whitespace-nowrap font-mono text-[11px] tracking-[0.2em] text-lime-400 uppercase",
            flash && "landing-section-cue-flash",
          )}
        >
          <span className="text-lime-400/70">[</span>
          {label}
          <span className="text-lime-400/70">]</span>
        </span>
      ) : null}
    </div>
  );
}

export const LandingLoader: FC<LandingLoaderProps> = ({
  progress,
  exiting = false,
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const [statusIndex, setStatusIndex] = useState(0);
  const cue = cueForProgress(pct);

  useEffect(() => {
    if (exiting) return;
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [exiting]);

  const status =
    pct >= 100
      ? "Liftoff"
      : (STATUS_LINES[Math.min(statusIndex, STATUS_LINES.length - 1)] ??
        STATUS_LINES[0]);

  return (
    <div
      data-slot="landing-loader"
      aria-busy={!exiting}
      aria-live="polite"
      className={cn(
        "landing-loader fixed inset-0 z-[80] overflow-hidden bg-[#050505] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        exiting && "pointer-events-none -translate-y-3 opacity-0",
      )}
    >
      {/* Cinematic backdrop - same universe as the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-md"
          style={{ backgroundImage: "url(/landing/space/milky-way.jpg)" }}
        />
        <div className="absolute inset-0 bg-[#050505]/72" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,160,255,0.12)_0%,transparent_55%)]" />
        {/* Vertical launch plume */}
        <div className="landing-loader-plume absolute top-[-10%] left-1/2 h-[120%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
        <div className="landing-loader-plume-soft absolute top-[-10%] left-1/2 h-[120%] w-24 -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.14)_0%,transparent_70%)] blur-2xl" />
        <div className="landing-loader-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      </div>

      <LoaderCursorCue label={cue} active={!exiting} />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6">
        <div className="landing-loader-mark mb-10 flex flex-col items-center">
          <AiMark className="size-11 text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.9)] sm:size-12" />
          <p className="mt-5 font-[family-name:var(--font-landing)] text-[13px] font-medium tracking-[0.22em] text-white/55 uppercase">
            Another Intelligence
          </p>
        </div>

        <p
          key={status}
          className="landing-loader-status mb-8 h-5 text-center text-sm tracking-[-0.01em] text-zinc-300/90"
        >
          {status}
        </p>

        <div className="flex w-[min(100%,18rem)] flex-col items-stretch gap-4">
          <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="landing-loader-bar absolute inset-y-0 left-0 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)] transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-end justify-between font-mono text-[11px] tracking-[0.18em] text-zinc-500 uppercase">
            <span>Load</span>
            <span className="text-lg tabular-nums tracking-tight text-white/90">
              {String(pct).padStart(2, "0")}
              <span className="text-sm text-white/40">%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export async function fetchBlobWithProgress(
  url: string,
  onProgress: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(url, { signal, cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  if (!response.body) {
    const blob = await response.blob();
    onProgress(1);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    chunks.push(copy.buffer);
    received += value.byteLength;
    if (total > 0) onProgress(Math.min(1, received / total));
    else onProgress(Math.min(0.9, received / (8 * 1024 * 1024)));
  }

  onProgress(1);
  return new Blob(chunks, {
    type: response.headers.get("content-type") ?? "video/mp4",
  });
}
