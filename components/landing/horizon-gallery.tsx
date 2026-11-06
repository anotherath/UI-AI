"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    src: "/landing/space/milky-way.jpg",
    alt: "Milky Way across the night sky",
    label: "Universe",
    caption: "Room enough for every thread of thought.",
  },
  {
    src: "/landing/space/black-hole.jpg",
    alt: "Black hole accretion ring",
    label: "Singularity",
    caption: "Shared knowledge, denser than noise.",
  },
  {
    src: "/landing/space/rocket-blueprint.svg",
    alt: "Rocket blueprint schematic",
    label: "Blueprint",
    caption: "Structure the system before you launch.",
    unoptimized: true,
  },
  {
    src: "/landing/space/neural-blueprint.svg",
    alt: "Neural network blueprint",
    label: "Neural",
    caption: "Connections that keep context alive.",
    unoptimized: true,
  },
  {
    src: "/landing/space/agent.jpg",
    alt: "Glowing circuit board schematic",
    label: "Agent",
    caption: "Chats that stay where they belong.",
  },
  {
    src: "/landing/space/rocket-plan.jpg",
    alt: "NASA launch vehicle schematic",
    label: "Launch",
    caption: "From quiet plan to clear signal.",
  },
] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function HorizonGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const maxShiftRef = useRef(0);
  const targetProgress = useRef(0);
  const smoothProgress = useRef(0);
  const activeIndexRef = useRef(0);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const visibleRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [rowFits, setRowFits] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReduced(media.matches);
    syncReduced();
    media.addEventListener("change", syncReduced);
    return () => media.removeEventListener("change", syncReduced);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!track || !sticky) return;

    const measure = () => {
      const stage = track.parentElement;
      const viewW = stage?.clientWidth ?? sticky.clientWidth;
      maxShiftRef.current = Math.max(track.scrollWidth - viewW, 0);
      setRowFits(maxShiftRef.current <= 0);
      // When the row fits, flex centering holds it; clear any leftover shift.
      if (maxShiftRef.current <= 0) {
        track.style.transform = "translate3d(0, 0, 0)";
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(sticky);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (reduced) return;

    const readTarget = () => {
      const section = sectionRef.current;
      if (!section) return;
      const total = section.offsetHeight - window.innerHeight;
      if (total <= 0) {
        targetProgress.current = 0;
        return;
      }
      targetProgress.current = clamp(
        -section.getBoundingClientRect().top / total,
        0,
        1,
      );
    };

    const paint = (progress: number) => {
      const track = trackRef.current;
      if (!track) return;

      const eased = easeInOutCubic(progress);
      const shift = eased * maxShiftRef.current;
      track.style.transform = `translate3d(${-shift}px, 0, 0)`;

      const last = SLIDES.length - 1;
      for (let index = 0; index <= last; index += 1) {
        const card = cardRefs.current[index];
        if (!card) continue;
        const center = index / Math.max(last, 1);
        const distance = Math.abs(progress - center);
        const focus = 1 - clamp(distance * 1.65);
        const tilt = (progress - center) * -22;
        const scale = 0.9 + focus * 0.12;
        const opacity = 0.42 + focus * 0.58;
        const lift = (1 - focus) * 18;
        card.style.transform = `perspective(1400px) translateY(${lift}px) rotateY(${tilt}deg) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(Math.round(focus * 10));
      }

      const nextIndex = Math.round(progress * last);
      if (nextIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }
    };

    const stop = () => {
      runningRef.current = false;
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    const tick = () => {
      if (!visibleRef.current) {
        stop();
        return;
      }

      readTarget();
      const next =
        smoothProgress.current +
        (targetProgress.current - smoothProgress.current) * 0.12;
      const settled = Math.abs(next - targetProgress.current) < 0.0004;
      smoothProgress.current = settled ? targetProgress.current : next;
      paint(smoothProgress.current);

      if (settled) {
        stop();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!visibleRef.current || runningRef.current) return;
      runningRef.current = true;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onScrollOrResize = () => {
      readTarget();
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = Boolean(entry?.isIntersecting);
        if (visibleRef.current) kick();
        else stop();
      },
      { rootMargin: "20% 0px" },
    );

    if (sectionRef.current) io.observe(sectionRef.current);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    readTarget();
    paint(smoothProgress.current);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "landing-horizon relative bg-[#050505]",
        // Taller runway so the gallery travels slower while Lenis is calm.
        reduced ? "py-20 sm:py-28" : "h-[180vh]",
      )}
      data-landing-cue="horizon"
      aria-label="A quieter orbit"
    >
      <div
        ref={stickyRef}
        className={cn(
          "flex flex-col",
          reduced
            ? "relative gap-8"
            : "sticky top-0 h-dvh justify-between gap-6 overflow-x-clip overflow-y-hidden py-10 sm:gap-8 sm:py-14",
        )}
      >
        <div className="mx-auto w-full max-w-[920px] shrink-0 px-5 text-center sm:px-8">
          <h2 className="font-[family-name:var(--font-landing)] text-[clamp(1.5rem,3.8vw,2.5rem)] leading-[1.12] font-medium tracking-[-0.035em] text-balance">
            <span className="text-white">
              This isn&apos;t about rushing answers.
            </span>{" "}
            <span className="text-zinc-500">
              It&apos;s about staying locked on the work.
            </span>
          </h2>
        </div>

        <div
          className={cn(
            "landing-horizon-stage relative flex min-h-0 flex-1 items-center",
            rowFits ? "justify-center" : "justify-start",
          )}
        >
          <div
            ref={trackRef}
            className="landing-horizon-track flex w-max max-w-none items-center gap-5 px-5 sm:gap-6 sm:px-8"
          >
            {SLIDES.map((slide, index) => (
              <figure
                key={slide.src}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                className="landing-horizon-card relative h-[min(52vh,420px)] w-[min(58vw,270px)] shrink-0 overflow-hidden rounded-[22px] sm:w-[250px] sm:rounded-[26px]"
                style={
                  reduced
                    ? undefined
                    : {
                        opacity: 0.42,
                        transform: "perspective(1400px) scale(0.9)",
                      }
                }
              >
                <div className="relative size-full overflow-hidden bg-[#10131a] ring-1 ring-white/10">
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="270px"
                    className="object-cover"
                    priority={index < 2}
                    loading={index < 2 ? "eager" : "lazy"}
                    unoptimized={"unoptimized" in slide && slide.unoptimized}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
                      {slide.label}
                    </p>
                    <p className="mt-1.5 text-sm leading-snug text-zinc-100 sm:text-[15px]">
                      {slide.caption}
                    </p>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>

        <div
          className="mx-auto flex w-full shrink-0 justify-center px-5 sm:px-8"
          aria-hidden
        >
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, index) => (
              <span
                key={slide.src}
                className={cn(
                  "h-1 rounded-full transition-[width,background-color] duration-300",
                  index === activeIndex
                    ? "w-6 bg-zinc-200"
                    : "w-1.5 bg-zinc-700",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
