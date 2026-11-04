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

export function FeaturesOrbit() {
  const sectionRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const target = useRef(0);
  const smooth = useRef(0);
  const raf = useRef(0);
  const running = useRef(false);
  const visible = useRef(false);

  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(false);

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

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.35) {
          setEntered(true);
        }
      },
      { threshold: [0.25, 0.35, 0.5] },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setEntered(true);
      const row = rowRef.current;
      if (row) row.style.gap = "20px";
      const title = titleRef.current;
      if (title) {
        title.style.opacity = "1";
        title.style.transform = "translate3d(0, 0, 0)";
      }
      cardRefs.current.forEach((card) => {
        if (!card) return;
        card.style.transform = "translate3d(0, 0, 0)";
        card.style.filter = "none";
      });
      return;
    }

    const read = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const view = window.innerHeight;
      target.current = clamp((view * 0.72 - rect.top) / (rect.height * 0.55));
    };

    const paint = (progress: number) => {
      const drift = easeOutCubic(progress);
      const gap = 12 + drift * 52;
      const titleOpacity = 0.12 + easeOutCubic(clamp(progress * 1.35)) * 0.88;
      const titleY = (1 - easeOutCubic(clamp(progress * 1.15))) * 32;

      const row = rowRef.current;
      if (row) row.style.gap = `${gap}px`;

      const title = titleRef.current;
      if (title) {
        title.style.opacity = String(titleOpacity);
        title.style.transform = `translate3d(0, ${titleY}px, 0)`;
      }

      cardRefs.current.forEach((card, index) => {
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
      running.current = false;
      window.cancelAnimationFrame(raf.current);
      raf.current = 0;
    };

    const tick = () => {
      if (!visible.current) {
        stop();
        return;
      }

      read();
      smooth.current += (target.current - smooth.current) * 0.045;
      const settled = Math.abs(smooth.current - target.current) < 0.0005;
      if (settled) smooth.current = target.current;
      paint(smooth.current);

      if (settled) {
        stop();
        return;
      }
      raf.current = window.requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!visible.current || running.current) return;
      running.current = true;
      raf.current = window.requestAnimationFrame(tick);
    };

    const onScrollOrResize = () => {
      read();
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        if (visible.current) kick();
        else stop();
      },
      { rootMargin: "15% 0px" },
    );

    if (sectionRef.current) io.observe(sectionRef.current);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    read();
    paint(smooth.current);

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
      className="landing-features relative overflow-hidden bg-[#050505] px-5 py-28 sm:px-8 sm:py-36"
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
        ref={titleRef}
        className="relative mx-auto mb-16 max-w-[720px] text-center sm:mb-20"
        style={{ opacity: reduced ? 1 : 0.12 }}
      >
        <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
          Built for long thinking
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-landing)] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white">
          Quiet tools. Dense context.
        </h2>
      </div>

      <div className="relative mx-auto w-full max-w-[1120px]">
        <div
          ref={rowRef}
          className="flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-8"
        >
          {FEATURES.map((item, index) => (
            <article
              key={item.title}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className={cn(
                "landing-feature-card group relative min-w-0 flex-1 bg-transparent",
                entered && "landing-feature-card-in",
              )}
            >
              <div className="relative aspect-[5/4] overflow-hidden rounded-none">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="380px"
                  loading="lazy"
                  className={cn(
                    "landing-feature-photo rounded-none object-cover",
                    entered && "landing-feature-photo-breathe",
                  )}
                  style={{ animationDelay: `${index * 320}ms` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                <div
                  className={cn(
                    "landing-feature-meta absolute top-3 left-3 text-zinc-100",
                    entered && "landing-feature-meta-in",
                  )}
                  style={{ animationDelay: `${480 + index * 240}ms` }}
                >
                  <item.icon className="size-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                </div>
                <span
                  className={cn(
                    "landing-feature-meta absolute top-3 right-3 font-mono text-[11px] tracking-[0.18em] text-zinc-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]",
                    entered && "landing-feature-meta-in",
                  )}
                  style={{ animationDelay: `${580 + index * 240}ms` }}
                >
                  {item.index}
                </span>
              </div>

              <div className="relative pt-5">
                <h3 className="font-[family-name:var(--font-landing)] text-xl font-medium tracking-[-0.03em] text-white sm:text-[1.35rem]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-zinc-500 sm:text-[15px]">
                  {item.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
