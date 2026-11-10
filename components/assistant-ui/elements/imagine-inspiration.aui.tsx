"use client";

import type { FC } from "react";
import { useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

/**
 * Inspiration cards under the Imagine composer — Unsplash photos for mood.
 * UI-only; clicking can fill the composer later when wired.
 */
const CARDS = [
  {
    id: "text-edit",
    label: "Text Edit",
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "loop",
    label: "Loop",
    src: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=640&q=80",
    tall: true,
  },
  {
    id: "precise-edit",
    label: "Precise Edit",
    src: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "photo-edit",
    label: "Photo Edit",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "smart-resize",
    label: "Smart Resize",
    src: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "reimagine",
    label: "Reimagine",
    src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "ecommerce",
    label: "E-Commerce Photos",
    src: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "bg-change",
    label: "BG Removal & Change",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "film-still",
    label: "Film Still",
    src: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "product",
    label: "Product Light",
    src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
  {
    id: "street",
    label: "Street Mood",
    src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=640&q=80",
    tall: true,
  },
  {
    id: "nature",
    label: "Quiet Landscape",
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=640&q=80",
    tall: false,
  },
] as const;

export const ImagineInspirationGallery: FC<{
  /** Standalone Imagine page always shows cards (no chat composer empty check). */
  alwaysVisible?: boolean;
}> = ({ alwaysVisible = false }) => {
  const composerEmpty = useAuiState((s) => s.composer.isEmpty);
  const visible = alwaysVisible || composerEmpty;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-(--thread-max-width) px-1 pt-2",
        !visible && "invisible pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <div className="columns-2 gap-3 sm:columns-3">
        {CARDS.map((card) => (
          <figure
            key={card.id}
            className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.src}
              alt={card.label}
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full object-cover transition duration-300 group-hover:scale-[1.02]",
                card.tall ? "aspect-[3/4]" : "aspect-square",
              )}
            />
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2.5 pt-8 text-left text-sm font-medium text-white">
              {card.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};
