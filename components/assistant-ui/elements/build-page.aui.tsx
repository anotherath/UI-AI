"use client";

import { useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { ArrowUpIcon, PlusIcon } from "lucide-react";
import { ComposerModelPicker } from "@/components/assistant-ui/elements/composer-mode-model.aui";
import { WebsiteInspirationGallery } from "@/components/assistant-ui/elements/website-inspiration.aui";
import {
  BUILD_PROMPTS,
  WelcomeTagline,
} from "@/components/assistant-ui/elements/welcome-tagline.aui";
import { cn } from "@/lib/utils";

/** Standalone Build website surface — same shell as Imagine (hero + gallery). */
export const BuildPage: FC = () => {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    window.setTimeout(() => setBusy(false), 600);
  };

  return (
    <div
      ref={rootRef}
      className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4"
    >
      <div className="flex min-h-[calc(100dvh-4.5rem)] w-full shrink-0 flex-col justify-center pt-4">
        <div className="mb-2 flex w-full flex-col items-center">
          <div className="mb-8 flex flex-col items-center px-2 text-center">
            <p className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-3xl font-semibold tracking-tight text-zinc-100 duration-200">
              Build website
            </p>
            <WelcomeTagline
              prompts={BUILD_PROMPTS}
              fallback={BUILD_PROMPTS[0]}
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
            placeholder="Describe a website..."
            className="max-h-48 min-h-11 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-base leading-6 text-zinc-100 caret-white outline-none placeholder:text-zinc-500"
          />
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              aria-label="Add photos & files"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/15 hover:text-foreground active:scale-[0.96]"
              onClick={() => fileRef.current?.click()}
            >
              <PlusIcon className="size-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
              tabIndex={-1}
              aria-hidden
              onChange={() => {
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="flex min-w-0 items-center gap-1.5">
              <ComposerModelPicker />
              <button
                type="submit"
                aria-label="Send message"
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

      <div className="relative z-0 -mt-[calc((100dvh-4.5rem-14rem)/2-1.5rem)] pb-8 pt-6">
        <WebsiteInspirationGallery />
      </div>
    </div>
  );
};
