"use client";

import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Card = {
  id: string;
  label: string;
  tall?: boolean;
  preview: ReactNode;
};

/** 16:9 slide frame inside the card. */
function SlideFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-[#0a0a0c] p-3", className)}>
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {children}
      </div>
    </div>
  );
}

const CARDS: Card[] = [
  {
    id: "keynote",
    label: "Keynote Dark",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col justify-between bg-[#111114] p-3 text-white">
          <span className="text-[5px] uppercase tracking-[0.25em] text-white/40">
            Keynote
          </span>
          <p className="text-[11px] font-semibold leading-tight tracking-tight">
            The next
            <br />
            decade of AI
          </p>
          <div className="h-0.5 w-8 rounded bg-[#5b8cff]" />
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "pitch",
    label: "Pitch Deck",
    preview: (
      <SlideFrame>
        <div className="flex h-full bg-white text-[#111]">
          <div className="flex w-[38%] flex-col justify-between bg-[#111] p-2.5 text-white">
            <span className="text-[5px] text-white/40">01</span>
            <p className="text-[8px] font-semibold leading-tight">
              The
              <br />
              problem
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1.5 p-2.5">
            {["Manual ops", "Scattered data", "Slow decisions"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-[#5b8cff]" />
                <span className="text-[6px] text-black/70">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "workshop",
    label: "Workshop",
    tall: true,
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col bg-[#f3f0e8] p-3 text-[#1a1a1a]">
          <p className="text-[5px] uppercase tracking-[0.2em] text-black/40">
            Workshop
          </p>
          <p className="mt-1 font-serif text-[10px] leading-tight">
            Align on goals
            <br />
            in 45 minutes
          </p>
          <div className="mt-auto grid grid-cols-3 gap-1">
            {["Discover", "Decide", "Ship"].map((s, i) => (
              <div
                key={s}
                className="rounded border border-black/10 bg-white/70 px-1 py-1.5 text-center text-[5px]"
              >
                <span className="block text-black/30">0{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "metrics",
    label: "Metrics Slide",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col bg-[#0d0d10] p-2.5 text-white">
          <p className="text-[6px] font-medium">Q3 Snapshot</p>
          <div className="mt-2 grid flex-1 grid-cols-3 gap-1.5">
            {[
              { k: "ARR", v: "$4.2M" },
              { k: "NPS", v: "72" },
              { k: "Churn", v: "1.8%" },
            ].map((m) => (
              <div
                key={m.k}
                className="flex flex-col justify-between rounded-md border border-white/10 bg-white/[0.04] p-1.5"
              >
                <span className="text-[5px] text-white/40">{m.k}</span>
                <span className="text-[9px] font-semibold">{m.v}</span>
              </div>
            ))}
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "board",
    label: "Board Room",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col bg-[#161618] p-2.5 text-white">
          <div className="mb-2 flex items-center justify-between text-[5px] text-white/40">
            <span>Board update</span>
            <span>Confidential</span>
          </div>
          <div className="flex flex-1 items-end gap-1 rounded-md border border-white/8 bg-black/30 p-2">
            {[35, 48, 42, 60, 55, 78, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-white/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "story",
    label: "Story Frame",
    tall: true,
    preview: (
      <SlideFrame>
        <div className="relative flex h-full items-end overflow-hidden bg-[#1a1512] p-3 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(255,180,100,0.25),transparent_50%)]" />
          <div className="relative">
            <p className="text-[5px] uppercase tracking-[0.2em] text-white/45">
              Chapter 02
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-tight">
              From idea
              <br />
              to product
            </p>
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "minimal-type",
    label: "Minimal Type",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col items-center justify-center bg-white text-[#111]">
          <p className="text-[14px] font-light tracking-tight">Focus.</p>
          <div className="mt-2 h-px w-6 bg-black/20" />
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "product",
    label: "Product Demo",
    preview: (
      <SlideFrame>
        <div className="flex h-full bg-[#0c0c0e] text-white">
          <div className="flex w-[42%] flex-col justify-center p-2.5">
            <p className="text-[8px] font-semibold leading-tight">
              See it
              <br />
              in action
            </p>
            <p className="mt-1 text-[5px] text-white/40">Live product walkthrough</p>
          </div>
          <div className="m-2 flex-1 rounded-md border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02]" />
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "investor",
    label: "Investor Update",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col bg-[#101012] p-2.5 text-white">
          <p className="text-[6px] font-medium">Investor update · Sep</p>
          <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
              <p className="text-[5px] text-white/40">Growth</p>
              <p className="mt-1 text-[10px] font-semibold text-emerald-300">
                +38%
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
              <p className="text-[5px] text-white/40">Runway</p>
              <p className="mt-1 text-[10px] font-semibold">18 mo</p>
            </div>
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "vision",
    label: "Vision Slide",
    tall: true,
    preview: (
      <SlideFrame>
        <div className="relative flex h-full flex-col justify-center overflow-hidden bg-[#08080a] p-3 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(91,140,255,0.2),transparent_55%)]" />
          <p className="relative text-center text-[11px] font-semibold tracking-tight">
            Build software
            <br />
            that feels inevitable
          </p>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "team",
    label: "Team Intro",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col bg-white p-2.5 text-[#111]">
          <p className="text-[6px] font-medium">Meet the team</p>
          <div className="mt-2 grid flex-1 grid-cols-4 gap-1.5">
            {["A", "B", "C", "D"].map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <div className="aspect-square w-full rounded-full bg-[#e8e4dc]" />
                <div className="h-1 w-6 rounded bg-black/15" />
              </div>
            ))}
          </div>
        </div>
      </SlideFrame>
    ),
  },
  {
    id: "roadmap",
    label: "Roadmap",
    preview: (
      <SlideFrame>
        <div className="flex h-full flex-col bg-[#0f0f12] p-2.5 text-white">
          <p className="text-[6px] font-medium">Roadmap 2026</p>
          <div className="mt-2 flex flex-1 items-center gap-1">
            {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
              <div key={q} className="flex flex-1 flex-col gap-1">
                <span className="text-[5px] text-white/40">{q}</span>
                <div
                  className={cn(
                    "h-8 rounded-md border border-white/10",
                    i === 0 && "bg-[#5b8cff]/35",
                    i === 1 && "bg-[#5b8cff]/20",
                    i > 1 && "bg-white/[0.04]",
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </SlideFrame>
    ),
  },
];

export const SlidesInspirationGallery: FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-(--thread-max-width) px-1 pt-2",
        className,
      )}
    >
      <div className="columns-2 gap-3 sm:columns-3">
        {CARDS.map((card) => (
          <figure
            key={card.id}
            className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]"
          >
            <div
              className={cn(
                "w-full transition duration-300 group-hover:scale-[1.02]",
                card.tall ? "aspect-[3/4]" : "aspect-square",
              )}
            >
              {card.preview}
            </div>
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-2.5 pt-8 text-left text-sm font-medium text-white">
              {card.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};
