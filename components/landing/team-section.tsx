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

export function TeamSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setEntered(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.28) {
          setEntered(true);
          io.disconnect();
        }
      },
      { threshold: [0.2, 0.28, 0.4] },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-team relative overflow-hidden bg-[#050505] px-5 py-24 sm:px-8 sm:py-32"
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

      <div
        className={cn(
          "landing-team-heading relative mx-auto mb-12 max-w-[640px] text-center sm:mb-14",
          entered && "landing-team-heading-in",
        )}
      >
        <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
          The humans
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-landing)] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white">
          Built by people with normal LinkedIns.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-500">
          No FAANG flex. Just a small crew that ships calm tools.
        </p>
      </div>

      <div className="relative mx-auto grid w-full max-w-[1040px] gap-12 sm:grid-cols-3 sm:gap-8">
        {TEAM.map((person, index) => {
          const side = index === 0 ? "left" : index === 2 ? "right" : "center";
          return (
            <article
              key={person.name}
              className={cn(
                "landing-team-card group relative flex flex-col items-center text-center",
                entered && "landing-team-card-in",
              )}
              style={{
                animationDelay: entered ? `${140 + index * 150}ms` : undefined,
              }}
            >
              {/* Callout pointers */}
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

              <div className="landing-team-frame relative mt-8 aspect-[3/4] w-full max-w-[240px] overflow-hidden bg-[#10131a] ring-1 ring-white/10 transition-[box-shadow,ring-color] duration-500 group-hover:ring-sky-400/35 group-hover:shadow-[0_0_40px_rgba(56,189,248,0.14)] sm:mt-10">
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
                  sizes="240px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="landing-team-sheen pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>

              {/* Mobile/desktop under-photo pointer label */}
              <div
                aria-hidden
                className="mt-3 flex items-center gap-2 lg:hidden"
              >
                <span className="h-px w-4 bg-sky-400/40" />
                <span className="font-mono text-[9px] tracking-[0.14em] text-zinc-600 uppercase">
                  {person.tag}
                </span>
                <span className="h-px w-4 bg-sky-400/40" />
              </div>

              <h3 className="mt-4 font-[family-name:var(--font-landing)] text-xl font-medium tracking-[-0.03em] text-white lg:mt-5">
                {person.name}
              </h3>
              <p className="mt-1.5 font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
                {person.role}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                {person.line}
              </p>
            </article>
          );
        })}
      </div>

      {/* Bottom connector note */}
      <div
        className={cn(
          "relative mx-auto mt-14 flex max-w-md flex-col items-center text-center",
          entered && "landing-team-heading-in",
        )}
        style={{ animationDelay: entered ? "700ms" : undefined }}
      >
        <div
          aria-hidden
          className="mb-4 h-8 w-px bg-gradient-to-b from-sky-400/40 to-transparent"
        />
        <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
          Cohort signal · VinUniversity
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Same campus. Different obsessions. One product.
        </p>
      </div>
    </section>
  );
}
