"use client";

import { useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ImageIcon,
} from "lucide-react";
import { ComposerAspectPicker } from "@/components/assistant-ui/elements/composer-mode-model.aui";
import { ImagineInspirationGallery } from "@/components/assistant-ui/elements/imagine-inspiration.aui";
import {
  IMAGINE_PROMPTS,
  WelcomeTagline,
} from "@/components/assistant-ui/elements/welcome-tagline.aui";
import { useFixedMenuPosition } from "@/hooks/use-fixed-menu-position";
import {
  useComposerPrefsStore,
  type ComposerModelId,
} from "@/lib/composer-prefs-store";
import { useModelsStore } from "@/lib/models-store";
import { cn } from "@/lib/utils";

/** Local model menu — Imagine page only, no chat Thread coupling. */
function ImagineModelPicker() {
  const model = useComposerPrefsStore((s) => s.model);
  const setModel = useComposerPrefsStore((s) => s.setModel);
  const modelOptions = useModelsStore((s) => s.options);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useFixedMenuPosition(open, triggerRef, {
    prefer: "above",
    estimatedHeight: Math.min(280, 44 + modelOptions.length * 40),
  });
  const selected =
    modelOptions.find((option) => option.id === model) ?? modelOptions[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointerDown);
    }, 0);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && mounted && pos ? (
      createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Select model"
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            minWidth: Math.max(pos.minWidth, 168),
            zIndex: 200,
          }}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1e] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          {modelOptions.map((option) => {
            const active = option.id === model;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-white/8 text-white"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => {
                  setModel(option.id as ComposerModelId);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active ? (
                  <CheckIcon className="size-3.5 shrink-0 text-zinc-300" />
                ) : null}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Select model"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-7 max-w-40 items-center gap-2 px-0.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white",
          open && "text-white",
        )}
        onClick={() => setOpen((next) => !next)}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {menu}
    </div>
  );
}

/**
 * Standalone Imagine surface — same centered hero as New chat, gallery below.
 */
export const ImageGenPage: FC = () => {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Thread viewport may keep prior scroll; pin Imagine to the top on open.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.closest(
      '[data-slot="aui_thread-viewport"]',
    ) as HTMLElement | null;
    if (viewport) viewport.scrollTop = 0;
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = prompt.trim();
    if (!next || busy) return;
    setBusy(true);
    // Placeholder until image-gen API is connected.
    window.setTimeout(() => setBusy(false), 600);
  };

  return (
    <div
      ref={rootRef}
      className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4"
    >
      {/* Same centering shell as empty New chat — hero only, no gallery inside. */}
      <div className="flex min-h-[calc(100dvh-4.5rem)] w-full shrink-0 flex-col justify-center pt-4">
        <div className="mb-2 flex w-full flex-col items-center">
          <div className="mb-8 flex flex-col items-center px-2 text-center">
            <p className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-3xl font-semibold tracking-tight text-zinc-100 duration-200">
              Imagine
            </p>
            <WelcomeTagline
              prompts={IMAGINE_PROMPTS}
              fallback={IMAGINE_PROMPTS[0]}
            />
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex w-full flex-col gap-2 rounded-[1.75rem] border border-white/10 bg-[#1c1c21] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-white/15"
        >
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={1}
            placeholder="Describe an image..."
            className="max-h-48 min-h-11 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-base leading-6 text-zinc-100 caret-white outline-none placeholder:text-zinc-500"
          />
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              aria-label="Upload image"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/15 hover:text-foreground active:scale-[0.96]"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="size-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
              tabIndex={-1}
              aria-hidden
              onChange={() => {
                // UI-only until Imagine upload is wired.
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="flex min-w-0 items-center gap-2">
              <ComposerAspectPicker />
              <ImagineModelPicker />
              <button
                type="submit"
                aria-label="Generate"
                disabled={busy || !prompt.trim()}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full bg-white text-black transition-opacity",
                  (busy || !prompt.trim()) && "opacity-40",
                )}
              >
                <ArrowUpIcon className="size-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/*
        Pull gallery into the empty lower half under the centered hero.
        Negative margin only — does not change the hero centering box above.
        14rem ≈ title + tagline + composer height.
      */}
      <div className="relative z-0 -mt-[calc((100dvh-4.5rem-14rem)/2-1.5rem)] pb-8 pt-6">
        <ImagineInspirationGallery alwaysVisible />
      </div>
    </div>
  );
};
