"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  ChevronDownIcon,
  FolderSearchIcon,
  GlobeIcon,
  ImageIcon,
  InfinityIcon,
  ListTodoIcon,
  PlusIcon,
  PresentationIcon,
  SearchIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { useFixedMenuPosition } from "@/hooks/use-fixed-menu-position";
import {
  COMPOSER_ASPECTS,
  COMPOSER_MODES,
  useComposerPrefsStore,
  type ComposerAspectId,
  type ComposerModeId,
  type ComposerModelId,
} from "@/lib/composer-prefs-store";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { useModelsStore } from "@/lib/models-store";
import { useProjectsStore } from "@/lib/projects-store";

const MODE_ICONS: Record<ComposerModeId, LucideIcon> = {
  auto: InfinityIcon,
  flash: ZapIcon,
  search: SearchIcon,
  plan: ListTodoIcon,
  retrieve: FolderSearchIcon,
  imagine: ImageIcon,
  slides: PresentationIcon,
  website: GlobeIcon,
  research: SearchIcon,
};

function useSessionHasProject() {
  const threadProjects = useProjectsStore((s) => s.threadProjects);
  const selectedId = useProjectsStore((s) => s.selectedId);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const messageCount = useAuiState((s) => s.threads.main.messages.length);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const customProjectId = mainThreadId
    ? (threadItems.find((item) => item.id === mainThreadId)?.custom
        ?.projectId as string | undefined)
    : undefined;
  const boundProjectId = mainThreadId
    ? (threadProjects[mainThreadId] ?? customProjectId)
    : undefined;
  const projectId =
    boundProjectId ?? (messageCount === 0 ? selectedId : null);
  return Boolean(projectId);
}

function useApplyComposerMode() {
  const aui = useAui();
  const setMode = useComposerPrefsStore((s) => s.setMode);
  const openImageGen = useProjectsStore((s) => s.openImageGen);
  const closeImageGen = useProjectsStore((s) => s.closeImageGen);
  const openSlides = useProjectsStore((s) => s.openSlides);
  const closeSlides = useProjectsStore((s) => s.closeSlides);
  const openBuild = useProjectsStore((s) => s.openBuild);
  const closeBuild = useProjectsStore((s) => s.closeBuild);
  const openResearch = useProjectsStore((s) => s.openResearch);
  const closeResearch = useProjectsStore((s) => s.closeResearch);
  const startNormalChat = useProjectsStore((s) => s.startNormalChat);

  const resetComposerThread = () => {
    useChatSessionsStore.getState().clearActiveSession();
    try {
      aui.composer.setText("");
    } catch {
      // Composer may be unavailable mid-unmount.
    }
    aui.threads.switchToNewThread();
  };

  return (next: ComposerModeId) => {
    setMode(next);
    if (next === "imagine") {
      resetComposerThread();
      openImageGen();
      return;
    }
    if (next === "slides") {
      resetComposerThread();
      openSlides();
      return;
    }
    if (next === "website") {
      resetComposerThread();
      openBuild();
      return;
    }
    if (next === "research") {
      resetComposerThread();
      openResearch();
      return;
    }
    // Auto / Flash / Search / Plan / Retrieve → leave special surfaces for New chat.
    closeImageGen();
    closeSlides();
    closeBuild();
    closeResearch();
    resetComposerThread();
    startNormalChat();
  };
}

type MenuOption<T extends string> = {
  id: T;
  label: string;
};

function parseAspect(id: string): { w: number; h: number } {
  const [wRaw, hRaw] = id.split(":");
  const w = Number(wRaw);
  const h = Number(hRaw);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { w: 1, h: 1 };
  }
  return { w, h };
}

/** Tiny frame icon sized to the aspect ratio it represents. */
function AspectFrameIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const { w, h } = parseAspect(id);
  const max = 14;
  const scale = max / Math.max(w, h);
  const width = Math.max(6, Math.round(w * scale));
  const height = Math.max(6, Math.round(h * scale));

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center",
        className,
      )}
    >
      <span
        className="rounded-[2px] border border-current opacity-80"
        style={{ width, height }}
      />
    </span>
  );
}

function ComposerMenu<T extends string>({
  value,
  options,
  ariaLabel,
  onChange,
  variant = "pill",
}: {
  value: T;
  options: readonly MenuOption<T>[];
  ariaLabel: string;
  onChange: (next: T) => void;
  variant?: "pill" | "plain";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Composer sits at the bottom — open upward so the list stays on screen.
  const pos = useFixedMenuPosition(open, triggerRef, {
    prefer: "above",
    estimatedHeight: Math.min(280, 44 + options.length * 40),
  });
  const selected = options.find((option) => option.id === value) ?? options[0];

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
    // Defer so the opening click cannot immediately dismiss the menu.
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
          aria-label={ariaLabel}
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            minWidth: Math.max(pos.minWidth, 148),
            zIndex: 200,
          }}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1e] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          {options.map((option) => {
            const active = option.id === value;
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
                  onChange(option.id);
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
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center font-medium transition-colors",
          variant === "pill"
            ? cn(
                "h-7 max-w-36 gap-0.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-200 hover:bg-white/8 hover:text-white",
                open && "border-white/15 bg-white/10 text-white",
              )
            : cn(
                "h-7 max-w-40 gap-2 px-0.5 text-sm text-zinc-300 hover:text-white",
                open && "text-white",
              ),
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((next) => !next);
        }}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDownIcon
          className={cn(
            "shrink-0 text-zinc-500 transition-transform",
            variant === "plain" ? "size-3.5" : "size-3",
            open && "rotate-180",
          )}
        />
      </button>
      {menu}
    </div>
  );
}

function ModeOptionsList({
  mode,
  visibleModes,
  onPick,
}: {
  mode: ComposerModeId;
  visibleModes: readonly (typeof COMPOSER_MODES)[number][];
  onPick: (next: ComposerModeId) => void;
}) {
  return (
    <>
      {visibleModes.map((option) => {
        const active = option.id === mode;
        const Icon = MODE_ICONS[option.id];
        return (
          <button
            key={option.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
              active
                ? "bg-white/8 text-white"
                : "text-zinc-300 hover:bg-white/5 hover:text-white",
            )}
            onClick={() => onPick(option.id as ComposerModeId)}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 text-zinc-400",
                option.id === "flash" && "-scale-x-100",
              )}
            />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {active ? (
              <CheckIcon className="size-3.5 shrink-0 text-zinc-300" />
            ) : null}
          </button>
        );
      })}
    </>
  );
}

/** + opens the file picker. Mode lives on the caption beside the model. */
export const ComposerModePicker: FC = () => {
  const mode = useComposerPrefsStore((s) => s.mode);
  const setMode = useComposerPrefsStore((s) => s.setMode);
  const hasProject = useSessionHasProject();

  useEffect(() => {
    if (mode === "retrieve" && !hasProject) setMode("auto");
  }, [hasProject, mode, setMode]);

  return (
    <ComposerPrimitive.AddAttachment
      multiple
      aria-label="Add photos & files"
      className="aui-composer-add-attachment inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/15 hover:text-foreground dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 active:scale-[0.96] motion-reduce:transition-none"
    >
      <PlusIcon className="size-4" />
    </ComposerPrimitive.AddAttachment>
  );
};

/** Clickable mode caption — opens the mode list. */
const ComposerModeCaption: FC = () => {
  const mode = useComposerPrefsStore((s) => s.mode);
  const applyMode = useApplyComposerMode();
  const hasProject = useSessionHasProject();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visibleModes = COMPOSER_MODES.filter(
    (option) => option.id !== "retrieve" || hasProject,
  );
  const pos = useFixedMenuPosition(open, triggerRef, {
    prefer: "above",
    estimatedHeight: Math.min(320, 44 + visibleModes.length * 40),
  });
  const modeLabel =
    COMPOSER_MODES.find((option) => option.id === mode)?.label ?? "Auto";
  const modeCaption = `${modeLabel.charAt(0).toUpperCase()}${modeLabel.slice(1)} Mode`;
  const ModeIcon = MODE_ICONS[mode] ?? InfinityIcon;

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
    // Defer so the opening click cannot immediately dismiss the menu.
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
          role="menu"
          aria-label="Select mode"
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
          <ModeOptionsList
            mode={mode}
            visibleModes={visibleModes}
            onPick={(next) => {
              applyMode(next);
              setOpen(false);
            }}
          />
        </div>,
        document.body,
      )
    ) : null;

  const lit = open || mode !== "auto";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Select mode"
        aria-haspopup="menu"
        aria-expanded={open}
        title={modeCaption}
        className={cn(
          "inline-flex h-7 max-w-32 shrink-0 items-center gap-2 truncate px-0.5 text-xs font-medium transition-colors hover:text-zinc-200",
          lit ? "text-zinc-100" : "text-zinc-400",
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((next) => !next);
        }}
      >
        <ModeIcon
          className={cn(
            "size-3.5 shrink-0 transition-[color,filter]",
            lit
              ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.55)]"
              : "text-current",
            mode === "flash" && "-scale-x-100",
          )}
        />
        <span className="truncate">{modeCaption}</span>
      </button>
      {menu}
    </div>
  );
};

/** Aspect picker — Imagine only, left of model. Frame icon matches ratio. */
export const ComposerAspectPicker: FC = () => {
  const aspect = useComposerPrefsStore((s) => s.aspect);
  const setAspect = useComposerPrefsStore((s) => s.setAspect);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useFixedMenuPosition(open, triggerRef, {
    prefer: "above",
    estimatedHeight: Math.min(320, 44 + COMPOSER_ASPECTS.length * 40),
  });
  const selected =
    COMPOSER_ASPECTS.find((option) => option.id === aspect) ??
    COMPOSER_ASPECTS[0];

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
    // Defer so the opening click cannot immediately dismiss the menu.
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
          aria-label="Select aspect ratio"
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            minWidth: Math.max(pos.minWidth, 148),
            zIndex: 200,
          }}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1e] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          {COMPOSER_ASPECTS.map((option) => {
            const active = option.id === aspect;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-white/8 text-white"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => {
                  setAspect(option.id as ComposerAspectId);
                  setOpen(false);
                }}
              >
                <AspectFrameIcon id={option.id} className="text-zinc-400" />
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
        aria-label="Select aspect ratio"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-7 max-w-40 items-center gap-1.5 px-0.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white",
          open && "text-white",
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((next) => !next);
        }}
      >
        <AspectFrameIcon
          id={selected?.id ?? "1:1"}
          className="text-zinc-500"
        />
        <span className="min-w-0 truncate">{selected?.label}</span>
      </button>
      {menu}
    </div>
  );
};

/** Model picker — right of composer actions, before send. Plain text, no pill. */
export const ComposerModelPicker: FC<{
  /** Main and subsession keep independent model prefs. */
  scope?: "main" | "subsession";
}> = ({ scope = "main" }) => {
  const mainModel = useComposerPrefsStore((s) => s.model);
  const subsessionModel = useComposerPrefsStore((s) => s.subsessionModel);
  const setModel = useComposerPrefsStore((s) => s.setModel);
  const setSubsessionModel = useComposerPrefsStore((s) => s.setSubsessionModel);
  const mode = useComposerPrefsStore((s) => s.mode);
  const modelOptions = useModelsStore((s) => s.options);
  const model = scope === "subsession" ? subsessionModel : mainModel;
  const onChange =
    scope === "subsession" ? setSubsessionModel : setModel;
  // Imagine has its own page chrome — don't repeat "Imagine Mode" beside model.
  // Slides keeps the caption so "Slides Mode" stays visible / selectable.
  const showModeCaption = mode !== "imagine";
  const showAspect = mode === "imagine";

  return (
    <div className="mr-2 flex min-w-0 items-center gap-2">
      {showModeCaption ? <ComposerModeCaption /> : null}
      {showAspect ? <ComposerAspectPicker /> : null}
      <ComposerMenu<ComposerModelId>
        value={model}
        options={modelOptions}
        ariaLabel="Select model"
        onChange={onChange}
        variant="plain"
      />
    </div>
  );
};
