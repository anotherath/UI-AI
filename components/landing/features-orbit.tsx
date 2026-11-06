"use client";

import Image from "next/image";
import {
  FolderIcon,
  LibraryIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FEATURES: {
  icon: LucideIcon;
  index: string;
  title: string;
  body: string;
  image: string;
}[] = [
  {
    icon: FolderIcon,
    index: "01",
    title: "Projects that hold context",
    body: "Keep research, briefs, and threads together - without losing the chat that started it.",
    image: "/landing/space/nebula-deep.jpg",
  },
  {
    icon: LibraryIcon,
    index: "02",
    title: "Shared knowledge",
    body: "Attach PDFs once. Every conversation in the project can draw from the same library.",
    image: "/landing/space/helix-nebula.jpg",
  },
  {
    icon: SparklesIcon,
    index: "03",
    title: "A calmer canvas",
    body: "Less chrome, more room to think. The interface stays out of the way until you need it.",
    image: "/landing/space/milky-way.jpg",
  },
];

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function FeatureCard({
  item,
  index,
  entered,
  className,
}: {
  item: (typeof FEATURES)[number];
  index: number;
  entered: boolean;
  className?: string;
}) {
  return (
    <article
      data-feature-card=""
      className={cn(
        "landing-feature-card group relative min-w-0 overflow-hidden bg-transparent sm:overflow-visible",
        entered && "landing-feature-card-in",
        className,
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-2xl sm:rounded-none">
        <Image
          src={item.image}
          alt=""
          fill
          sizes="(max-width: 640px) 78vw, 380px"
          loading="lazy"
          className={cn(
            "landing-feature-photo object-cover",
            entered && "landing-feature-photo-breathe",
          )}
          style={{ animationDelay: `${index * 320}ms` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div
          className={cn(
            "landing-feature-meta absolute top-3.5 left-3.5 text-zinc-100",
            entered && "landing-feature-meta-in",
          )}
          style={{ animationDelay: `${480 + index * 240}ms` }}
        >
          <item.icon className="size-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
        </div>
        <span
          className={cn(
            "landing-feature-meta absolute top-3.5 right-3.5 font-mono text-[11px] tracking-[0.18em] text-zinc-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]",
            entered && "landing-feature-meta-in",
          )}
          style={{ animationDelay: `${580 + index * 240}ms` }}
        >
          {item.index}
        </span>
      </div>

      <div className="relative px-0.5 pt-4 sm:pt-5">
        <h3 className="font-[family-name:var(--font-landing)] text-[1.2rem] leading-snug font-medium tracking-[-0.03em] text-white sm:text-[1.35rem]">
          {item.title}
        </h3>
        <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-zinc-500 sm:mt-3 sm:text-[15px]">
          {item.body}
        </p>
      </div>
    </article>
  );
}

export function FeaturesOrbit() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const desktopRowRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const desktopCardRefs = useRef<(HTMLElement | null)[]>([]);

  const orbitTarget = useRef(0);
  const orbitSmooth = useRef(0);
  const orbitRaf = useRef(0);
  const orbitRunning = useRef(false);
  const orbitVisible = useRef(false);

  const maxShiftRef = useRef(0);
  const mobileTarget = useRef(0);
  const mobileSmooth = useRef(0);
  const mobileRaf = useRef(0);
  const mobileRunning = useRef(false);
  const mobileVisible = useRef(false);

  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const stars = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: ((i * 47) % 100) + (i % 7) * 0.3,
        top: ((i * 29) % 100) + (i % 5) * 0.4,
        size: 1 + (i % 2),
        opacity: 0.12 + (i % 4) * 0.1,
      })),
    [],
  );

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
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.28) {
          setEntered(true);
        }
      },
      { threshold: [0.2, 0.28, 0.4] },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [reduced]);

  // Desktop only: fan-out orbit (unchanged behavior).
  useEffect(() => {
    if (reduced) {
      const row = desktopRowRef.current;
      if (row) row.style.gap = "32px";
      const title = titleRef.current;
      if (title) {
        title.style.opacity = "1";
        title.style.transform = "translate3d(0, 0, 0)";
      }
      desktopCardRefs.current.forEach((card) => {
        if (!card) return;
        card.style.transform = "translate3d(0, 0, 0)";
        card.style.filter = "none";
      });
      return;
    }

    const isDesktop = () => window.matchMedia("(min-width: 640px)").matches;

    const read = () => {
      if (!isDesktop()) return;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const view = window.innerHeight;
      orbitTarget.current = clamp(
        (view * 0.72 - rect.top) / (rect.height * 0.55),
      );
    };

    const paint = (progress: number) => {
      if (!isDesktop()) return;
      const drift = easeOutCubic(progress);
      const gap = 12 + drift * 52;
      const titleOpacity = 0.12 + easeOutCubic(clamp(progress * 1.35)) * 0.88;
      const titleY = (1 - easeOutCubic(clamp(progress * 1.15))) * 32;

      const row = desktopRowRef.current;
      if (row) row.style.gap = `${gap}px`;

      const title = titleRef.current;
      if (title) {
        title.style.opacity = String(titleOpacity);
        title.style.transform = `translate3d(0, ${titleY}px, 0)`;
      }

      desktopCardRefs.current.forEach((card, index) => {
        if (!card) return;
        const side = index - 1;
        const x = side * drift * 36;
        const y = Math.abs(side) * drift * 8;
        const glow = 0.16 + drift * 0.32;
        card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        card.style.filter = `drop-shadow(0 18px 40px rgba(0,0,0,${0.25 + glow * 0.25}))`;
      });
    };

    const stop = () => {
      orbitRunning.current = false;
      window.cancelAnimationFrame(orbitRaf.current);
      orbitRaf.current = 0;
    };

    const tick = () => {
      if (!orbitVisible.current) {
        stop();
        return;
      }
      read();
      orbitSmooth.current +=
        (orbitTarget.current - orbitSmooth.current) * 0.045;
      const settled =
        Math.abs(orbitSmooth.current - orbitTarget.current) < 0.0005;
      if (settled) orbitSmooth.current = orbitTarget.current;
      paint(orbitSmooth.current);
      if (settled) {
        stop();
        return;
      }
      orbitRaf.current = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!orbitVisible.current || orbitRunning.current || !isDesktop()) return;
      orbitRunning.current = true;
      orbitRaf.current = window.requestAnimationFrame(tick);
    };

    const onScrollOrResize = () => {
      read();
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        orbitVisible.current = Boolean(entry?.isIntersecting);
        if (orbitVisible.current) kick();
        else stop();
      },
      { rootMargin: "15% 0px" },
    );

    if (sectionRef.current) io.observe(sectionRef.current);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    read();
    paint(orbitSmooth.current);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [reduced]);

  // Mobile only: sticky stage, vertical scroll → horizontal travel (like Team).
  useEffect(() => {
    if (reduced) return;

    const isMobile = () => window.matchMedia("(max-width: 639px)").matches;
    const track = mobileTrackRef.current;
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

      const viewport = track.parentElement ?? sticky;
      const viewW = viewport.clientWidth;
      const firstCard = track.querySelector<HTMLElement>("[data-feature-card]");
      // Keep card narrower than the stage so side pads can truly center it.
      const cardWidth = Math.min(
        firstCard?.offsetWidth ?? viewW * 0.72,
        viewW * 0.78,
      );
      const sidePad = Math.max((viewW - cardWidth) / 2, 12);
      track.style.paddingLeft = `${sidePad}px`;
      track.style.paddingRight = `${sidePad}px`;
      maxShiftRef.current = Math.max(track.scrollWidth - viewW, 0);

      if (section) {
        const travel = Math.max(
          maxShiftRef.current * 1.1,
          window.innerHeight * 0.9,
        );
        const hold = window.innerHeight * 0.3;
        section.style.height = `${Math.round(window.innerHeight + travel + hold)}px`;
      }
    };

    const readTarget = () => {
      const section = sectionRef.current;
      if (!section || !isMobile()) {
        mobileTarget.current = 0;
        return;
      }
      const total = section.offsetHeight - window.innerHeight;
      if (total <= 0) {
        mobileTarget.current = 0;
        return;
      }
      mobileTarget.current = clamp(
        -section.getBoundingClientRect().top / total,
        0,
        1,
      );
    };

    const paint = (progress: number) => {
      if (!isMobile()) return;
      const travelEnd = 0.88;
      const travel = clamp(progress / travelEnd, 0, 1);
      track.style.transform = `translate3d(${-maxShiftRef.current * travel}px, 0, 0)`;

      const title = titleRef.current;
      if (title) {
        title.style.opacity = "1";
        title.style.transform = "translate3d(0, 0, 0)";
      }

      const next = Math.min(
        FEATURES.length - 1,
        Math.round(travel * (FEATURES.length - 1)),
      );
      setActiveIndex((prev) => (prev === next ? prev : next));
    };

    const stop = () => {
      mobileRunning.current = false;
      window.cancelAnimationFrame(mobileRaf.current);
      mobileRaf.current = 0;
    };

    const tick = () => {
      if (!mobileVisible.current) {
        stop();
        return;
      }
      readTarget();
      mobileSmooth.current +=
        (mobileTarget.current - mobileSmooth.current) * 0.14;
      const settled =
        Math.abs(mobileSmooth.current - mobileTarget.current) < 0.0006;
      if (settled) mobileSmooth.current = mobileTarget.current;
      paint(mobileSmooth.current);
      if (settled) {
        stop();
        return;
      }
      mobileRaf.current = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!mobileVisible.current || mobileRunning.current || !isMobile())
        return;
      mobileRunning.current = true;
      mobileRaf.current = window.requestAnimationFrame(tick);
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

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(sticky);

    const io = new IntersectionObserver(
      ([entry]) => {
        mobileVisible.current = Boolean(entry?.isIntersecting);
        if (mobileVisible.current) kick();
        else stop();
      },
      { rootMargin: "20% 0px" },
    );

    if (sectionRef.current) io.observe(sectionRef.current);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    readTarget();
    paint(mobileSmooth.current);

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
      // overflow-hidden only on desktop — sticky needs it off on mobile.
      className={cn(
        "landing-features relative bg-[#050505]",
        reduced
          ? "overflow-hidden px-5 py-20 sm:px-8 sm:py-36"
          : "px-0 sm:overflow-hidden sm:px-8 sm:py-36",
      )}
      data-landing-cue="features"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
          />
        ))}
        <div className="absolute top-[-10%] left-1/2 h-[380px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(180,200,255,0.08),transparent_72%)] blur-2xl" />
      </div>

      <div
        ref={stickyRef}
        className={cn(
          "relative flex flex-col",
          reduced
            ? "gap-8 px-5"
            : "sticky top-0 h-dvh gap-5 overflow-x-clip px-5 pt-10 pb-7 sm:static sm:h-auto sm:gap-0 sm:overflow-visible sm:px-0 sm:py-0",
        )}
      >
        <div
          ref={titleRef}
          className="relative mx-auto w-full max-w-[720px] shrink-0 text-center sm:mb-20"
          style={{ opacity: reduced ? 1 : 0.12 }}
        >
          <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
            Built for long thinking
          </p>
          <h2 className="mt-2.5 font-[family-name:var(--font-landing)] text-[clamp(1.65rem,7vw,2.75rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white sm:mt-3">
            Quiet tools. Dense context.
          </h2>
        </div>

        {/* Desktop orbit row — untouched fan-out effect */}
        <div className="relative mx-auto hidden w-full max-w-[1120px] sm:block">
          <div
            ref={desktopRowRef}
            className="flex flex-row items-start gap-8"
          >
            {FEATURES.map((item, index) => (
              <div
                key={item.title}
                ref={(node) => {
                  desktopCardRefs.current[index] = node;
                }}
                className="min-w-0 flex-1"
              >
                <FeatureCard item={item} index={index} entered={entered} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: one compact stage — title above, card+dots centered as a unit */}
        <div
          className={cn(
            "relative sm:hidden",
            reduced
              ? "mt-6 flex flex-col items-center gap-8"
              : "flex min-h-0 flex-1 flex-col justify-center gap-5",
          )}
        >
          <div className={cn(!reduced && "overflow-x-clip")}>
            <div
              ref={mobileTrackRef}
              className={cn(
                reduced
                  ? "flex w-full flex-col items-center gap-8"
                  : "flex w-max items-start gap-4 will-change-transform",
              )}
            >
              {FEATURES.map((item, index) => (
                <FeatureCard
                  key={item.title}
                  item={item}
                  index={index}
                  entered={entered}
                  className={
                    reduced
                      ? "w-full max-w-[280px]"
                      : "w-[min(260px,72vw)] shrink-0"
                  }
                />
              ))}
            </div>
          </div>

          {!reduced ? (
            <div
              className="mx-auto flex shrink-0 items-center gap-2"
              aria-hidden
            >
              {FEATURES.map((item, index) => (
                <span
                  key={item.title}
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
        </div>
      </div>
    </section>
  );
}
