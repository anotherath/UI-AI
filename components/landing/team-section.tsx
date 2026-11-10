"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TEAM = [
  {
    name: "Hoang",
    role: "UI/UX · Fullstack · AI engineer",
    photo: "/landing/team/member-1.jpg",
    line: "Not ex-SpaceX.",
    tag: "01 / Design-build",
    note: "Pixels → product",
  },
  {
    name: "Hiro",
    role: "Head of AI",
    photo: "/landing/team/member-2.jpg",
    line: "Not ex-Google DeepMind.",
    tag: "02 / Models",
    note: "Research → shipping",
  },
  {
    name: "Mike",
    role: "AI engineer · Software systems",
    photo: "/landing/team/member-3.jpg",
    line: "Not ex-OpenAI.",
    tag: "03 / Systems",
    note: "Keep it running",
  },
] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function TeamCard({
  person,
  index,
  entered,
  className,
}: {
  person: (typeof TEAM)[number];
  index: number;
  entered: boolean;
  className?: string;
}) {
  const side = index === 0 ? "left" : index === 2 ? "right" : "center";

  return (
    <article
      data-team-card=""
      className={cn(
        "landing-team-card group relative flex flex-col items-center text-center",
        entered && "landing-team-card-in",
        className,
      )}
      style={{
        animationDelay: entered ? `${140 + index * 150}ms` : undefined,
      }}
    >
      <div
        aria-hidden
        className={cn(
          "landing-team-callout pointer-events-none absolute z-20 hidden font-mono text-[9px] tracking-[0.14em] text-zinc-500 uppercase lg:block",
          side === "left" && "-top-1 -left-2 text-left",
          side === "center" && "-top-2 left-1/2 -translate-x-1/2 text-center",
          side === "right" && "-top-1 -right-2 text-right",
          entered && "landing-team-callout-in",
        )}
        style={{
          animationDelay: entered ? `${420 + index * 160}ms` : undefined,
        }}
      >
        <p className="text-sky-300/70">{person.tag}</p>
        <p className="mt-0.5 text-zinc-600 normal-case tracking-normal">
          {person.note}
        </p>
        <span
          className={cn(
            "mt-2 block h-6 w-px bg-gradient-to-b from-sky-400/50 to-transparent",
            side === "center" && "mx-auto",
            side === "right" && "ml-auto",
          )}
        />
      </div>

      <div className="landing-team-frame relative mt-2 aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#10131a] ring-1 ring-white/10 transition-[box-shadow,ring-color] duration-500 group-hover:ring-sky-400/35 group-hover:shadow-[0_0_40px_rgba(56,189,248,0.14)] sm:mt-10 sm:rounded-none">
        <span
          aria-hidden
          className="pointer-events-none absolute top-2.5 left-2.5 z-10 size-2.5 border-t border-l border-white/25 transition-colors duration-300 group-hover:border-sky-300/70"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-2.5 right-2.5 z-10 size-2.5 border-t border-r border-white/25 transition-colors duration-300 group-hover:border-sky-300/70"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 size-2.5 border-b border-l border-white/25 transition-colors duration-300 group-hover:border-sky-300/70"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 bottom-2.5 z-10 size-2.5 border-r border-b border-white/25 transition-colors duration-300 group-hover:border-sky-300/70"
        />

        <Image
          src={person.photo}
          alt={person.name}
          fill
          sizes="(max-width: 640px) 72vw, 240px"
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="landing-team-sheen pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      <div aria-hidden className="mt-2.5 flex items-center gap-2 lg:hidden">
        <span className="h-px w-4 bg-sky-400/40" />
        <span className="font-mono text-[9px] tracking-[0.14em] text-zinc-600 uppercase">
          {person.tag}
        </span>
        <span className="h-px w-4 bg-sky-400/40" />
      </div>

      <h3 className="mt-3 font-[family-name:var(--font-landing)] text-lg font-medium tracking-[-0.03em] text-white sm:text-xl lg:mt-5">
        {person.name}
      </h3>
      <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
        {person.role}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:mt-3">
        {person.line}
      </p>
    </article>
  );
}

function TeamHeading({
  entered,
  className,
}: {
  entered: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "landing-team-heading relative mx-auto max-w-[640px] text-center",
        entered && "landing-team-heading-in",
        className,
      )}
    >
      <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
        Ground crew
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-landing)] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white">
        Built by people with normal LinkedIns.
      </h2>
      <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-zinc-500 sm:mt-3">
        No FAANG flex. A small crew shipping instruments for sharp minds.
      </p>
    </div>
  );
}

function TeamFooter({
  entered,
  className,
}: {
  entered: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex max-w-md flex-col items-center text-center",
        entered && "landing-team-heading-in",
        className,
      )}
      style={{ animationDelay: entered ? "700ms" : undefined }}
    >
      <div
        aria-hidden
        className="mb-3 h-6 w-px bg-gradient-to-b from-sky-400/40 to-transparent sm:mb-4 sm:h-8"
      />
      <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
        Cohort signal · VinUniversity
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Same campus. Different obsessions. One product.
      </p>
    </div>
  );
}

export function TeamSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const maxShiftRef = useRef(0);
  const targetProgress = useRef(0);
  const smoothProgress = useRef(0);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const visibleRef = useRef(false);

  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (reduced) {
      setEntered(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.2) {
          setEntered(true);
          io.disconnect();
        }
      },
      { threshold: [0.15, 0.2, 0.35] },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [reduced]);

  // Mobile only: pin the stage and map vertical scroll → horizontal travel.
  useEffect(() => {
    if (reduced) return;

    const isMobile = () => window.matchMedia("(max-width: 639px)").matches;
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!track || !sticky) return;

    const measure = () => {
      const section = sectionRef.current;
      if (!isMobile()) {
        maxShiftRef.current = 0;
        track.style.transform = "translate3d(0,0,0)";
        track.style.paddingLeft = "";
        track.style.paddingRight = "";
        if (section) section.style.height = "";
        return;
      }

      // Side pads so the first & last cards can sit centered in the viewport.
      const viewport = track.parentElement ?? sticky;
      const viewW = viewport.clientWidth;
      const firstCard = track.querySelector<HTMLElement>("[data-team-card]");
      const cardWidth = firstCard?.offsetWidth ?? viewW * 0.72;
      const sidePad = Math.max((viewW - cardWidth) / 2, 16);
      track.style.paddingLeft = `${sidePad}px`;
      track.style.paddingRight = `${sidePad}px`;

      maxShiftRef.current = Math.max(track.scrollWidth - viewW, 0);

      // Vertical runway: finish horizontal travel, brief hold on #3, then release.
      if (section) {
        const travel = Math.max(
          maxShiftRef.current * 1.05,
          window.innerHeight * 0.85,
        );
        const hold = window.innerHeight * 0.28;
        section.style.height = `${Math.round(window.innerHeight + travel + hold)}px`;
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(sticky);

    const readTarget = () => {
      const section = sectionRef.current;
      if (!section || !isMobile()) {
        targetProgress.current = 0;
        return;
      }
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
      if (!isMobile()) return;
      // Most of the section drives travel; short tail holds on #3.
      const travelEnd = 0.88;
      const travel = clamp(progress / travelEnd, 0, 1);
      const shift = maxShiftRef.current * travel;
      track.style.transform = `translate3d(${-shift}px, 0, 0)`;
      const next = Math.min(
        TEAM.length - 1,
        Math.round(travel * (TEAM.length - 1)),
      );
      setActiveIndex((prev) => (prev === next ? prev : next));
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
      smoothProgress.current +=
        (targetProgress.current - smoothProgress.current) * 0.14;
      const settled =
        Math.abs(smoothProgress.current - targetProgress.current) < 0.0006;
      if (settled) smoothProgress.current = targetProgress.current;
      paint(smoothProgress.current);
      if (settled) {
        stop();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!visibleRef.current || runningRef.current || !isMobile()) return;
      runningRef.current = true;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onScrollOrResize = () => {
      measure();
      readTarget();
      kick();
      if (!isMobile()) {
        track.style.transform = "translate3d(0,0,0)";
        track.style.paddingLeft = "";
        track.style.paddingRight = "";
        if (sectionRef.current) sectionRef.current.style.height = "";
      }
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
    measure();
    readTarget();
    paint(smoothProgress.current);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      // Do NOT put overflow-hidden here - it breaks position:sticky on mobile.
      className={cn(
        "landing-team relative bg-[#050505]",
        reduced
          ? "overflow-hidden px-5 py-20 sm:px-8 sm:py-32"
          : // Mobile height is set in JS from measured track travel + hold.
            "sm:h-auto sm:overflow-hidden sm:px-8 sm:py-32",
      )}
      data-landing-cue="team"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.06),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-[18%] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block"
      />
      <div
        aria-hidden
        className="landing-team-orbit pointer-events-none absolute top-1/2 left-1/2 hidden size-[720px] rounded-full border border-dashed border-sky-400/10 lg:block"
      />

      {/* Mobile: sticky stage - vertical scroll drives left→right travel */}
      <div
        ref={stickyRef}
        className={cn(
          "relative flex flex-col",
          reduced
            ? "gap-8 px-5"
            : "sticky top-0 flex h-dvh flex-col justify-between gap-5 px-5 py-8 sm:static sm:h-auto sm:justify-start sm:gap-0 sm:overflow-visible sm:px-0 sm:py-0",
        )}
      >
        <TeamHeading entered={entered} className="mb-0 shrink-0 sm:mb-14" />

        {/* Desktop grid */}
        <div className="relative mx-auto hidden w-full max-w-[1040px] grid-cols-3 gap-8 sm:grid">
          {TEAM.map((person, index) => (
            <TeamCard
              key={person.name}
              person={person}
              index={index}
              entered={entered}
            />
          ))}
        </div>

        {/* Mobile track */}
        <div
          className={cn(
            "relative sm:hidden",
            reduced
              ? "flex flex-col items-center gap-8"
              : "flex min-h-0 w-full flex-1 items-center overflow-x-clip",
          )}
        >
          <div
            ref={trackRef}
            className={cn(
              "landing-team-track",
              reduced
                ? "flex w-full flex-col items-center gap-8"
                : "flex w-max items-start gap-5 will-change-transform",
            )}
          >
            {TEAM.map((person, index) => (
              <TeamCard
                key={person.name}
                person={person}
                index={index}
                entered={entered}
                className={
                  reduced
                    ? "w-full max-w-[240px]"
                    : "w-[min(72vw,240px)] shrink-0"
                }
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            "mx-auto w-full shrink-0 flex-col items-center gap-5 sm:mt-14 sm:hidden",
            reduced ? "mt-8 flex" : "flex",
          )}
        >
          {!reduced ? (
            <div className="flex items-center gap-2" aria-hidden>
              {TEAM.map((person, index) => (
                <span
                  key={person.name}
                  className={cn(
                    "h-1 rounded-full transition-[width,background-color] duration-300",
                    index === activeIndex
                      ? "w-6 bg-zinc-200"
                      : "w-1.5 bg-zinc-700",
                  )}
                />
              ))}
            </div>
          ) : null}
          <TeamFooter entered={entered} className="mt-0" />
        </div>

        <TeamFooter entered={entered} className="mt-14 hidden sm:flex" />
      </div>
    </section>
  );
}
