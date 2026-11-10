"use client";

import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Card = {
  id: string;
  label: string;
  tall?: boolean;
  preview: ReactNode;
};

/** Mini browser chrome shared by every landing mock. */
function BrowserChrome({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-[#0c0c0e]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-white/8 bg-[#161618] px-2.5 py-1.5">
        <span className="size-1.5 rounded-full bg-[#ff5f57]" />
        <span className="size-1.5 rounded-full bg-[#febc2e]" />
        <span className="size-1.5 rounded-full bg-[#28c840]" />
        <div className="ml-2 h-3.5 flex-1 rounded-md bg-white/6" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

const CARDS: Card[] = [
  {
    id: "saas-hero",
    label: "SaaS Hero",
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col bg-[#0a0a0c] p-3 text-white">
          <div className="mb-3 flex items-center justify-between text-[7px] text-white/50">
            <span className="font-semibold text-white/80">Orbit</span>
            <div className="flex gap-2">
              <span>Product</span>
              <span>Pricing</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-[6px] font-medium text-black">
                Start
              </span>
            </div>
          </div>
          <p className="text-[11px] font-semibold leading-tight tracking-tight">
            Ship product
            <br />
            updates faster
          </p>
          <p className="mt-1.5 max-w-[70%] text-[6px] leading-relaxed text-white/45">
            Analytics, experiments, and releases in one workspace.
          </p>
          <div className="mt-2.5 flex gap-1.5">
            <span className="rounded-md bg-[#5b8cff] px-2 py-1 text-[6px] font-medium">
              Get started
            </span>
            <span className="rounded-md border border-white/15 px-2 py-1 text-[6px] text-white/70">
              View demo
            </span>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3">
            {[72, 48, 90].map((h, i) => (
              <div
                key={i}
                className="rounded-md border border-white/8 bg-white/[0.04] p-1.5"
              >
                <div className="mb-1 h-1 w-6 rounded bg-white/20" />
                <div
                  className="rounded-sm bg-[#5b8cff]/60"
                  style={{ height: `${h * 0.28}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "waitlist",
    label: "Waitlist",
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col items-center justify-center bg-[#09090b] px-4 text-center text-white">
          <span className="mb-2 rounded-full border border-white/15 px-2 py-0.5 text-[6px] text-white/55">
            Coming soon
          </span>
          <p className="text-[12px] font-semibold tracking-tight">
            Join the waitlist
          </p>
          <p className="mt-1 text-[6px] text-white/40">
            Be first when we open access.
          </p>
          <div className="mt-3 flex w-full max-w-[85%] overflow-hidden rounded-lg border border-white/12 bg-white/[0.04]">
            <div className="h-6 flex-1 px-2 py-1.5 text-left text-[6px] text-white/30">
              you@company.com
            </div>
            <div className="flex items-center bg-white px-2.5 text-[6px] font-medium text-black">
              Notify me
            </div>
          </div>
          <div className="mt-3 flex -space-x-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="size-4 rounded-full border border-[#09090b] bg-gradient-to-br from-white/30 to-white/10"
              />
            ))}
          </div>
          <p className="mt-1 text-[5px] text-white/35">2,841 already waiting</p>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "agency",
    label: "Agency",
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col bg-[#111] text-white">
          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2 text-[6px] text-white/50">
            <span className="tracking-[0.2em] text-white">STUDIO</span>
            <span>Work · About · Contact</span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-px bg-white/8">
            <div className="bg-[#1a1a1c] p-2.5">
              <div className="mb-2 aspect-[4/3] rounded bg-gradient-to-br from-[#3d3d42] to-[#1c1c1e]" />
              <p className="text-[7px] font-medium">North Brand</p>
              <p className="text-[5px] text-white/35">Identity · Web</p>
            </div>
            <div className="bg-[#141416] p-2.5">
              <div className="mb-2 aspect-[4/3] rounded bg-gradient-to-br from-[#5a4a3a] to-[#1c1814]" />
              <p className="text-[7px] font-medium">Atlas Film</p>
              <p className="text-[5px] text-white/35">Campaign</p>
            </div>
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "studio",
    label: "Studio Site",
    tall: true,
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col bg-[#f4f1ea] text-[#1a1a1a]">
          <div className="flex items-center justify-between px-3 py-2 text-[6px]">
            <span className="font-semibold">atelier</span>
            <span className="text-black/40">Projects</span>
          </div>
          <div className="px-3">
            <p className="font-serif text-[13px] leading-[1.15] tracking-tight">
              Design for
              <br />
              quiet brands
            </p>
            <p className="mt-2 text-[6px] leading-relaxed text-black/45">
              Brand systems, websites, and print for founders who care about
              craft.
            </p>
          </div>
          <div className="mt-3 grid flex-1 grid-cols-2 gap-1.5 px-3 pb-3">
            <div className="rounded-md bg-[#ddd6c8]" />
            <div className="rounded-md bg-[#c9bfae]" />
            <div className="col-span-2 rounded-md bg-[#b8aea0]" />
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "editorial",
    label: "Editorial",
    tall: true,
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col bg-white text-[#111]">
          <div className="border-b border-black/10 px-3 py-2 text-center font-serif text-[10px] tracking-wide">
            The Daily
          </div>
          <div className="grid flex-1 grid-cols-[1.2fr_0.8fr] gap-2 p-2.5">
            <div>
              <div className="mb-1.5 aspect-[16/10] rounded-sm bg-[#e8e4dc]" />
              <p className="font-serif text-[8px] leading-snug">
                How product teams write for the web
              </p>
              <p className="mt-1 text-[5px] text-black/40">Essay · 8 min</p>
            </div>
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-1.5">
                  <div className="size-7 shrink-0 rounded-sm bg-[#ece8e0]" />
                  <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                    <div className="h-1 w-full rounded bg-black/15" />
                    <div className="h-1 w-2/3 rounded bg-black/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "mobile-first",
    label: "Mobile First",
    tall: true,
    preview: (
      <div className="flex h-full items-center justify-center bg-[#0c0c0e]">
        <div className="flex h-[92%] w-[42%] flex-col overflow-hidden rounded-[1.1rem] border border-white/15 bg-[#121214] shadow-lg">
          <div className="mx-auto mt-1.5 h-1 w-8 rounded-full bg-white/20" />
          <div className="flex flex-1 flex-col px-2.5 pt-3 text-white">
            <p className="text-[8px] font-semibold tracking-tight">
              Your next
              <br />
              workout
            </p>
            <p className="mt-1 text-[5px] text-white/40">Personalized plans</p>
            <div className="mt-2.5 space-y-1.5">
              {["Strength", "Cardio", "Mobility"].map((t, i) => (
                <div
                  key={t}
                  className={cn(
                    "rounded-lg border border-white/10 px-2 py-1.5 text-[6px]",
                    i === 0 && "bg-white text-black",
                  )}
                >
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-auto mb-2 rounded-full bg-[#5b8cff] py-1.5 text-center text-[6px] font-medium">
              Continue
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "product-launch",
    label: "Product Launch",
    preview: (
      <BrowserChrome>
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#050508] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(91,140,255,0.25),transparent_55%)]" />
          <p className="relative text-[6px] uppercase tracking-[0.25em] text-[#8eb0ff]">
            New release
          </p>
          <p className="relative mt-1.5 text-center text-[12px] font-semibold tracking-tight">
            Nova 2.0
            <br />
            is here
          </p>
          <div className="relative mt-3 h-16 w-[70%] rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[0_20px_40px_rgba(0,0,0,0.45)]" />
          <span className="relative mt-3 rounded-full bg-white px-3 py-1 text-[6px] font-medium text-black">
            Pre-order now
          </span>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "ecommerce",
    label: "Storefront",
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col bg-[#fafafa] text-[#111]">
          <div className="flex items-center justify-between px-3 py-2 text-[6px]">
            <span className="font-semibold tracking-wide">MAISON</span>
            <span className="text-black/40">Bag · Search</span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1.5 px-2.5 pb-2.5">
            {[
              "bg-[#e8ddd0]",
              "bg-[#d4cfc8]",
              "bg-[#cfc4b8]",
              "bg-[#e2e0db]",
            ].map((bg, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className={cn("aspect-[3/4] rounded-md", bg)} />
                <div className="h-1 w-10 rounded bg-black/15" />
                <div className="h-1 w-6 rounded bg-black/10" />
              </div>
            ))}
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "dashboard",
    label: "App Marketing",
    preview: (
      <BrowserChrome>
        <div className="flex h-full bg-[#0b0b0d] text-white">
          <div className="flex w-10 flex-col gap-2 border-r border-white/8 bg-[#121214] p-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded bg-white/10",
                  i === 1 && "bg-[#5b8cff]/80",
                )}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[5px] text-white/40">Revenue</p>
                <p className="text-[11px] font-semibold">$48.2k</p>
              </div>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[5px] text-emerald-300">
                +12%
              </span>
            </div>
            <div className="flex flex-1 items-end gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-2">
              {[40, 55, 35, 70, 50, 85, 60, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-[#5b8cff]/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "minimal",
    label: "Minimal Brand",
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col justify-between bg-white px-4 py-3 text-[#111]">
          <div className="flex items-center justify-between text-[6px] text-black/40">
            <span className="font-medium tracking-[0.3em] text-black">FORM</span>
            <span>Menu</span>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-light tracking-tight">Less, clearly</p>
            <p className="mx-auto mt-2 max-w-[80%] text-[6px] leading-relaxed text-black/45">
              A brand system built around type, space, and restraint.
            </p>
          </div>
          <div className="mx-auto h-px w-10 bg-black/15" />
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "portfolio",
    label: "Portfolio",
    preview: (
      <BrowserChrome>
        <div className="flex h-full flex-col bg-[#0e0e10] text-white">
          <div className="flex items-center justify-between px-3 py-2 text-[6px] text-white/45">
            <span className="text-white">Alex Rivera</span>
            <span>Selected work</span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-1 px-2 pb-2">
            <div className="col-span-2 row-span-2 rounded-md bg-gradient-to-br from-[#2a2a30] to-[#151518]" />
            <div className="rounded-md bg-[#242428]" />
            <div className="rounded-md bg-[#1c1c20]" />
          </div>
        </div>
      </BrowserChrome>
    ),
  },
  {
    id: "event",
    label: "Event Landing",
    preview: (
      <BrowserChrome>
        <div className="relative flex h-full flex-col justify-end overflow-hidden bg-[#0a0a0c] p-3 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,80,120,0.35),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(80,100,255,0.25),transparent_40%)]" />
          <p className="relative text-[6px] uppercase tracking-[0.2em] text-white/60">
            Oct 12–14 · SF
          </p>
          <p className="relative mt-1 text-[13px] font-semibold leading-tight tracking-tight">
            Summit
            <br />
            2026
          </p>
          <div className="relative mt-2.5 flex gap-1.5">
            <span className="rounded-md bg-white px-2.5 py-1 text-[6px] font-medium text-black">
              Get tickets
            </span>
            <span className="rounded-md border border-white/20 px-2.5 py-1 text-[6px]">
              Speakers
            </span>
          </div>
        </div>
      </BrowserChrome>
    ),
  },
];

export const WebsiteInspirationGallery: FC<{
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
