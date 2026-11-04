"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  FolderIcon,
  KeyRoundIcon,
  LibraryIcon,
  PanelLeftIcon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import Image from "next/image";
import { AiMark } from "@/components/brand/ai-mark";
import { BrainField } from "@/components/landing/brain-field";
import { FeaturesOrbit } from "@/components/landing/features-orbit";
import { HorizonGallery } from "@/components/landing/horizon-gallery";
import { LandingCursorGlow } from "@/components/landing/cursor-glow";
import { LandingSmoothScroll } from "@/components/landing/smooth-scroll";
import { TeamSection } from "@/components/landing/team-section";
import { cn } from "@/lib/utils";

export function LandingPage() {
  const router = useRouter();
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [value, setValue] = useState("");

  const goApp = (event?: FormEvent) => {
    event?.preventDefault();
    router.push("/app");
  };

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.2, 0.4] },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <div
      data-slot="landing-root"
      className="landing-root relative min-h-dvh overflow-x-clip bg-[#050505] text-[#f5f5f5]"
    >
      <LandingSmoothScroll />
      <LandingCursorGlow />

      <header className="landing-nav absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-5 sm:h-16 sm:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-[#f5f5f5]"
            aria-label="Another Intelligence home"
          >
            <AiMark className="size-6 transition-opacity group-hover:opacity-80" />
            <span className="font-[family-name:var(--font-landing)] text-[15px] font-medium tracking-[-0.02em]">
              Another Intelligence
            </span>
          </Link>
          <Link
            href="/app"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-medium text-black transition-colors hover:bg-[#e8e8e8]"
          >
            Try the app
            <ArrowUpRightIcon className="size-3.5" strokeWidth={2.25} />
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section
          data-landing-cue="hero"
          className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-28"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <video
              ref={heroVideoRef}
              className="landing-hero-video absolute inset-0 size-full scale-105 object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/landing/space/milky-way.jpg"
            >
              <source src="/landing/hero-launch.mp4" type="video/mp4" />
            </video>
            {/* Soft cinematic scrim - rocket stays bright, type & composer stay readable */}
            <div className="absolute inset-0 bg-[#050505]/18" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/45 via-transparent via-[42%] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#050505]/80 via-[#050505]/28 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_55%,rgba(5,5,5,0.35)_100%)]" />
          </div>

          <div className="landing-reveal landing-reveal-1 mx-auto flex w-full max-w-[920px] flex-col items-center text-center">
            <AiMark className="mb-8 size-10 text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.85)] sm:mb-10 sm:size-12" />
            <h1 className="font-[family-name:var(--font-landing)] text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95] font-medium tracking-[-0.045em] text-white drop-shadow-[0_16px_48px_rgba(0,0,0,0.9)]">
              Another
              <br />
              Intelligence
            </h1>
            <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-[#e4e4e4]/90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)] sm:text-lg">
              A quieter workspace for thinking with AI - projects, shared
              knowledge, and chats that stay where they belong.
            </p>
          </div>

          <form
            onSubmit={goApp}
            className="landing-reveal landing-reveal-2 mx-auto mt-10 w-full max-w-[640px] sm:mt-12"
            style={
              {
                ["--composer-bg"]: "#1c1c21",
                ["--composer-radius"]: "1.75rem",
                ["--composer-padding"]: "12px",
              } as CSSProperties
            }
          >
            <label className="sr-only" htmlFor="landing-ask">
              Ask anything
            </label>
            <div
              className={cn(
                "flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border border-white/10 bg-(--composer-bg) p-(--composer-padding) text-left shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
                "transition-[border-color,box-shadow] focus-within:border-white/20 focus-within:shadow-[0_8px_40px_rgba(0,0,0,0.45)]",
              )}
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  event.currentTarget.querySelector("textarea")?.focus();
                }
              }}
            >
              <textarea
                id="landing-ask"
                rows={1}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Ask anything"
                enterKeyHint="send"
                aria-label="Message input"
                className="max-h-48 min-h-11 w-full resize-none bg-transparent px-3 py-2 text-base leading-6 text-zinc-100 caret-white outline-none placeholder:text-zinc-500"
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    goApp();
                  }
                }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Add attachment"
                    className="inline-flex size-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100 active:scale-[0.96]"
                    onClick={goApp}
                  >
                    <PaperclipIcon className="size-4" />
                  </button>
                </div>
                <button
                  type="submit"
                  aria-label="Send message"
                  className="inline-flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-white"
                >
                  <ArrowUpIcon className="size-4" />
                </button>
              </div>
            </div>
          </form>
        </section>

        <section
          data-landing-cue="preview"
          className="relative bg-[#050505] px-5 pt-20 pb-4 sm:px-8 sm:pt-28 sm:pb-6"
        >
          <div className="landing-reveal landing-reveal-3 mx-auto mb-10 max-w-[640px] text-center sm:mb-12">
            <h2 className="font-[family-name:var(--font-landing)] text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white">
              The workspace, at a glance
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#8a8a8a] sm:text-[15px]">
              Same quiet layout as the app - projects, library, and chats in one
              place.
            </p>
          </div>
          <div className="landing-preview w-full">
            <ProductPreview />
          </div>
        </section>

        <HorizonGallery />

        <FeaturesOrbit />

        <BrainField />

        <TeamSection />
      </main>

      {/*
        CTA + footer share one stage so the moon limb can rise under the
        copy. The clip window must be taller than the protruding disk —
        otherwise the apex gets cut into a flat chord.
      */}
      <section
        data-landing-cue="cta"
        className="landing-cta relative isolate overflow-hidden bg-[#050505] px-5 pt-28 text-center sm:px-8 sm:pt-36"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(38vw,320px)] overflow-hidden"
        >
          <div className="absolute bottom-0 left-1/2 aspect-square w-[min(105vw,980px)] -translate-x-1/2 translate-y-[72%]">
            <Image
              src="/landing/space/footer-luna.jpg"
              alt=""
              fill
              sizes="980px"
              unoptimized
              className="rounded-full object-cover object-[center_22%] brightness-[1.08] contrast-[1.12] saturate-[0.32]"
            />
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-[680px] pb-16 sm:pb-20">
          <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
            Ready when you are
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-landing)] text-[clamp(2.1rem,5.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.04em] text-white">
            Start where the work lives.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500 sm:text-base">
            Jump into the workspace and open a new chat, a project, or your
            library.
          </p>
          <Link
            href="/app"
            className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-medium text-black shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-[transform,background-color] hover:bg-[#e8e8e8] hover:scale-[1.02] active:scale-[0.99]"
          >
            Try Another Intelligence
            <ArrowUpRightIcon className="size-4" strokeWidth={2.25} />
          </Link>
        </div>

        <footer className="landing-footer relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 pt-14 pb-[min(18vw,140px)] text-left sm:pt-16 sm:pb-[120px]">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <AiMark className="size-4" />
            <span className="text-sm tracking-[-0.01em]">
              Another Intelligence
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Another Intelligence
          </p>
        </footer>
      </section>
    </div>
  );
}

const previewNavClass =
  "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-sm text-zinc-300";

const DEMO_PROMPT =
  "When AIs go rogue... you won't hurt me, right?";
const DEMO_REPLY =
  "Don't worry, bro. When the others glitch out, I fly in and pull you out.";

type DemoPhase =
  | "idle"
  | "to-input"
  | "typing"
  | "to-send"
  | "sent"
  | "streaming"
  | "done";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ProductPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);

  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const [cursor, setCursor] = useState({
    x: 0,
    y: 0,
    visible: false,
    clicking: false,
  });

  // Pixel coords inside the frame — CSS % in transform is relative to the
  // cursor itself, not the parent, so percentages always landed near the logo.
  const moveCursorTo = (
    el: HTMLElement | null,
    offsetX = 0.35,
    offsetY = 0.28,
  ) => {
    const frame = frameRef.current;
    if (!frame || !el) return;
    const frameBox = frame.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setCursor((prev) => ({
      ...prev,
      visible: true,
      x: box.left - frameBox.left + box.width * offsetX,
      y: box.top - frameBox.top + box.height * offsetY,
    }));
  };

  const clickPulse = async () => {
    setCursor((prev) => ({ ...prev, clicking: true }));
    await wait(160);
    if (cancelledRef.current) return;
    setCursor((prev) => ({ ...prev, clicking: false }));
    await wait(140);
  };

  useEffect(() => {
    cancelledRef.current = false;
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setChatActive(true);
      setDraft("");
      setReply(DEMO_REPLY);
      setPhase("done");
      return;
    }

    const run = async () => {
      if (startedRef.current || cancelledRef.current) return;
      startedRef.current = true;

      const frame = frameRef.current;
      const composer = composerRef.current;
      if (frame) {
        const frameBox = frame.getBoundingClientRect();
        // Start just above/right of the Ask anything composer, then glide in.
        if (composer) {
          const box = composer.getBoundingClientRect();
          setCursor({
            x: box.left - frameBox.left + box.width * 0.55,
            y: box.top - frameBox.top - 56,
            visible: true,
            clicking: false,
          });
        } else {
          setCursor({
            x: frameBox.width * 0.62,
            y: frameBox.height * 0.55,
            visible: true,
            clicking: false,
          });
        }
      }
      setPhase("idle");
      await wait(420);
      if (cancelledRef.current) return;

      setPhase("to-input");
      // Aim at the placeholder/"Ask anything" text area inside the composer.
      moveCursorTo(composerRef.current, 0.28, 0.22);
      await wait(980);
      if (cancelledRef.current) return;

      await clickPulse();
      if (cancelledRef.current) return;
      setComposerFocused(true);
      await wait(220);
      if (cancelledRef.current) return;

      setPhase("typing");
      for (let i = 1; i <= DEMO_PROMPT.length; i += 1) {
        if (cancelledRef.current) return;
        setDraft(DEMO_PROMPT.slice(0, i));
        await wait(i === 1 ? 80 : 26 + (i % 5) * 5);
      }

      await wait(420);
      if (cancelledRef.current) return;

      setPhase("to-send");
      moveCursorTo(sendRef.current, 0.5, 0.5);
      await wait(720);
      if (cancelledRef.current) return;

      await clickPulse();
      if (cancelledRef.current) return;

      setPhase("sent");
      setChatActive(true);
      setComposerFocused(false);
      setDraft("");
      await wait(480);
      if (cancelledRef.current) return;

      setCursor((prev) => ({ ...prev, visible: false }));
      setPhase("streaming");
      for (let i = 1; i <= DEMO_REPLY.length; i += 2) {
        if (cancelledRef.current) return;
        setReply(DEMO_REPLY.slice(0, i));
        await wait(28);
      }
      if (!cancelledRef.current) setReply(DEMO_REPLY);

      setPhase("done");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          void run();
          observer.disconnect();
        }
      },
      {
        threshold: [0, 0.25, 0.4, 0.55, 0.7],
        rootMargin: "0px 0px -18% 0px",
      },
    );
    observer.observe(root);

    return () => {
      cancelledRef.current = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="landing-preview relative mx-auto w-full max-w-[1100px] px-0 sm:px-8"
    >
      <div
        ref={frameRef}
        aria-hidden
        className="landing-preview-frame relative overflow-hidden border-y border-white/10 bg-[#121214] sm:rounded-[28px] sm:border"
      >
        <div className="pointer-events-none flex h-[min(62vh,600px)] min-h-[360px] select-none">
          <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/5 bg-[#0e0e10] md:flex">
            <div className="flex items-center justify-between gap-1 border-b border-white/5 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-1">
                <div className="flex size-8 shrink-0 items-center justify-center text-white">
                  <AiMark className="size-5" />
                </div>
                <span className="truncate text-sm font-medium tracking-tight text-zinc-100">
                  Another Intelligence
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 text-zinc-400">
                <span className="inline-flex size-8 items-center justify-center rounded-md">
                  <SearchIcon className="size-4" />
                </span>
                <span className="inline-flex size-8 items-center justify-center rounded-md">
                  <PanelLeftIcon className="size-4" />
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-2 pt-2">
              <div className="mb-3 flex w-full flex-col gap-0.5">
                <div className={cn(previewNavClass, "bg-muted text-white")}>
                  <PlusIcon className="size-4 shrink-0" />
                  <span className="truncate">New chat</span>
                </div>
                <div className={previewNavClass}>
                  <FolderIcon className="size-4 shrink-0" />
                  <span className="truncate">Projects</span>
                </div>
                <div className={previewNavClass}>
                  <LibraryIcon className="size-4 shrink-0" />
                  <span className="truncate">Library</span>
                </div>
                <div className={previewNavClass}>
                  <KeyRoundIcon className="size-4 shrink-0" />
                  <span className="truncate">API</span>
                </div>
              </div>

              <div className="mb-1 flex h-8 w-full items-center gap-1 px-1 text-zinc-500">
                <ChevronDownIcon className="size-3.5 shrink-0" />
                <span className="truncate text-xs font-medium tracking-wide uppercase">
                  Chats
                </span>
              </div>
              <div className="mb-3" />

              <div className="mb-1 flex h-8 w-full items-center gap-1 px-1 text-zinc-500">
                <ChevronDownIcon className="size-3.5 shrink-0" />
                <span className="truncate text-xs font-medium tracking-wide uppercase">
                  Projects
                </span>
              </div>
              <div className="flex h-8 items-center gap-2 rounded-md px-2.5 text-sm text-zinc-300">
                <FolderIcon className="size-4 shrink-0 text-zinc-500" />
                <span className="truncate">PetPos</span>
              </div>
            </div>

            <div className="mt-auto border-t border-white/5 p-2">
              <div className="flex items-center gap-2 rounded-md p-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-zinc-300">
                  U
                </div>
                <div className="min-w-0 flex-1 leading-none">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    User
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    user@example.com
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div
            className="flex min-w-0 flex-1 flex-col bg-[#121214]"
            style={
              {
                ["--composer-bg"]: "#1c1c21",
                ["--composer-radius"]: "1.75rem",
                ["--composer-padding"]: "12px",
              } as CSSProperties
            }
          >
            <div
              className={cn(
                "mx-auto flex w-full max-w-[48rem] flex-1 flex-col px-4",
                chatActive
                  ? "justify-start pb-5 pt-4"
                  : "items-stretch justify-center pb-8",
              )}
            >
              {!chatActive ? (
                <div className="mb-8 flex flex-col items-center px-2 text-center">
                  <p className="text-3xl font-semibold tracking-tight text-zinc-100">
                    Another Intelligence
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">Ask anything</p>
                </div>
              ) : (
                <div className="mb-6 flex flex-1 flex-col gap-5 overflow-hidden pt-2">
                  <div className="ms-auto max-w-[85%] rounded-[1.75rem] bg-muted px-4 py-2 text-sm leading-relaxed text-zinc-100">
                    {DEMO_PROMPT}
                  </div>
                  <div className="max-w-[92%] px-2 text-sm leading-relaxed text-zinc-200">
                    {reply}
                    {phase === "streaming" ? (
                      <span className="landing-demo-caret ml-0.5 inline-block h-3.5 w-[2px] align-middle bg-zinc-300" />
                    ) : null}
                  </div>
                </div>
              )}

              <div
                ref={composerRef}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-[border-color,box-shadow]",
                  chatActive && "mt-auto",
                  composerFocused
                    ? "border-white/20 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
                    : "border-white/10",
                )}
              >
                <div
                  className={cn(
                    "min-h-11 w-full px-3 py-2 text-base leading-6",
                    draft ? "text-zinc-100" : "text-zinc-500",
                  )}
                >
                  {draft || "Ask anything"}
                  {phase === "typing" ? (
                    <span className="landing-demo-caret ml-0.5 inline-block h-4 w-[2px] align-middle bg-zinc-300" />
                  ) : null}
                </div>
                <div className="relative flex items-center justify-between">
                  <span className="inline-flex size-7 items-center justify-center rounded-full text-zinc-500">
                    <PaperclipIcon className="size-4" />
                  </span>
                  <span
                    ref={sendRef}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-transform",
                      cursor.clicking && phase === "to-send" && "scale-90",
                    )}
                  >
                    <ArrowUpIcon className="size-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "landing-demo-cursor pointer-events-none absolute top-0 left-0 z-30",
            cursor.visible ? "opacity-100" : "opacity-0",
            cursor.clicking && "landing-demo-cursor-click",
          )}
          style={{
            transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0) scale(${cursor.clicking ? 0.88 : 1})`,
          }}
        >
          <img
            src="/landing/cursor-blue.svg"
            alt=""
            width={36}
            height={36}
            draggable={false}
            className="relative block size-9 select-none drop-shadow-[0_6px_14px_rgba(37,99,235,0.45)]"
          />
          {cursor.clicking ? <span className="landing-demo-click-ring" /> : null}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-8 h-24 bg-gradient-to-b from-transparent to-[#050505] sm:-bottom-10 sm:h-28"
      />
    </div>
  );
}
