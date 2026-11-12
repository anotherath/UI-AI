"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FC,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AlignJustifyIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  GitBranchIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PenLineIcon,
  PlusIcon,
  PinIcon,
  PinOffIcon,
  RefreshCwIcon,
  SquareIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { useAuiState } from "@assistant-ui/react";
import { ComposerModelPicker } from "@/components/assistant-ui/elements/composer-mode-model.aui";
import {
  flushInlineComposerDraft,
  InlineChipComposerInput,
  requestSelectionChipInsert,
} from "@/components/assistant-ui/elements/inline-chip-composer-input";
import { StandaloneMarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  SelectionAwareText,
} from "@/components/assistant-ui/elements/selection-chip";
import { useFixedMenuPosition } from "@/hooks/use-fixed-menu-position";
import {
  RAIL_WIDTH_DEFAULT,
  RAIL_WIDTH_MAX,
  RAIL_WIDTH_MIN,
  isSubsessionHalfSplit,
  useContextRailStore,
  type ContextRailPanel,
  type ContextRailPanelId,
} from "@/lib/context-rail-store";
import { useAgentRunStatusStore } from "@/lib/agent-run-status-store";
import {
  abortSubsessionStream,
  hydrateOrResumeSubsession,
  runSubsessionTurn,
} from "@/lib/subsession-chat";
import type { Subsession } from "@/lib/subsessions-store";
import { useNotesStore } from "@/lib/notes-store";
import {
  useProjectsStore,
  type ProjectFile,
} from "@/lib/projects-store";
import { useSubsessionsStore } from "@/lib/subsessions-store";
import { cn } from "@/lib/utils";

function useSessionStarted() {
  return useAuiState((s) => s.thread.messages.length > 0);
}

function useActiveProjectId() {
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const threadProjects = useProjectsStore((s) => s.threadProjects);
  const selectedId = useProjectsStore((s) => s.selectedId);
  const messageCount = useAuiState((s) => s.thread.messages.length);

  const customProjectId = mainThreadId
    ? (threadItems.find((item) => item.id === mainThreadId)?.custom
        ?.projectId as string | undefined)
    : undefined;
  const bound =
    (mainThreadId ? threadProjects[mainThreadId] : undefined) ??
    customProjectId;

  if (bound) return bound;
  if (messageCount === 0) return selectedId;
  return null;
}

type ChatAttachment = {
  id: string;
  name: string;
  source: "chat";
};

function useChatAttachments(): ChatAttachment[] {
  const messages = useAuiState((s) => s.thread.messages);
  return useMemo(() => {
    const seen = new Set<string>();
    const out: ChatAttachment[] = [];
    for (const message of messages) {
      if (message.role !== "user") continue;
      for (const attachment of message.attachments) {
        const name =
          attachment.name?.trim() ||
          (attachment.type === "image" ? "Image" : "Attachment");
        const id = `${message.id}:${attachment.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, name, source: "chat" });
      }
    }
    return out;
  }, [messages]);
}

function RailTriggerButton({
  panel,
  tooltip,
  icon: Icon,
  activeTint,
}: {
  panel: Exclude<ContextRailPanel, null>;
  tooltip: string;
  icon: FC<{ className?: string }>;
  activeTint?: string;
}) {
  const current = useContextRailStore((s) => s.panel);
  const togglePanel = useContextRailStore((s) => s.togglePanel);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const sessionStarted = useSessionStarted();

  useEffect(() => {
    if (!sessionStarted && current) setPanel(null);
  }, [sessionStarted, current, setPanel]);

  if (!sessionStarted) return null;

  return (
    <TooltipIconButton
      tooltip={tooltip}
      side="bottom"
      type="button"
      variant="ghost"
      size="icon"
      aria-label={tooltip}
      aria-pressed={false}
      tabIndex={current !== null ? -1 : 0}
      onClick={() => togglePanel(panel)}
      className={cn(
        "size-8 rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100",
        activeTint,
      )}
    >
      <Icon className="size-[17px] stroke-[1.6]" />
    </TooltipIconButton>
  );
}

export const NotesTriggerButton: FC<{ className?: string }> = () => {
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const hasNote = useNotesStore((s) =>
    mainThreadId ? Boolean(s.notesByThread[mainThreadId]?.trim()) : false,
  );
  return (
    <RailTriggerButton
      panel="notes"
      tooltip="Take notes"
      icon={PenLineIcon}
      activeTint={hasNote ? "text-amber-200/90" : undefined}
    />
  );
};

export const FilesTriggerButton: FC<{ className?: string }> = () => {
  const projectId = useActiveProjectId();
  const projects = useProjectsStore((s) => s.projects);
  const chatFiles = useChatAttachments();
  const projectFiles =
    projects.find((project) => project.id === projectId)?.files ?? [];
  const hasFiles = chatFiles.length > 0 || projectFiles.length > 0;

  return (
    <RailTriggerButton
      panel="files"
      tooltip="Files"
      icon={FolderIcon}
      activeTint={hasFiles ? "text-sky-200/90" : undefined}
    />
  );
};

export const SubsessionsTriggerButton: FC = () => {
  const panel = useContextRailStore((s) => s.panel);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const setActive = useSubsessionsStore((s) => s.setActive);
  const sessionStarted = useSessionStarted();

  if (!sessionStarted) return null;

  return (
    <TooltipIconButton
      tooltip="Subsession"
      side="bottom"
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Open subsession list"
      aria-pressed={false}
      tabIndex={panel !== null ? -1 : 0}
      onClick={() => {
        setActive(null);
        setPanel("subsessions");
      }}
      className="size-8 rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
    >
      <AlignJustifyIcon className="size-[17px] stroke-[1.6]" />
    </TooltipIconButton>
  );
};

/** Top-right Files + Notes + Subsessions — fade out like the rail close. */
export const ThreadTopActions: FC = () => {
  const panel = useContextRailStore((s) => s.panel);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const setActive = useSubsessionsStore((s) => s.setActive);
  const sessionStarted = useSessionStarted();
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const visible = panel === null && sessionStarted;
  const [mounted, setMounted] = useState(visible);

  // These controls belong to the active chat session only — close the rail
  // when switching threads so the next visit requires an explicit reopen.
  useEffect(() => {
    setPanel(null);
    setActive(null);
  }, [mainThreadId, setPanel, setActive]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const timeout = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!mounted && !visible) return null;

  return (
    <div
      data-slot="aui_thread-top-actions"
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none absolute top-0 right-0 z-20 flex h-10 items-center justify-end gap-0.5 px-3 pt-1",
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-2 opacity-0",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-0.5",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <FilesTriggerButton />
        <NotesTriggerButton />
        <SubsessionsTriggerButton />
      </div>
    </div>
  );
};

function NotesRailBody() {
  const getNote = useNotesStore((s) => s.getNote);
  const setNote = useNotesStore((s) => s.setNote);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const sessionStarted = useSessionStarted();
  const [draft, setDraft] = useState("");
  const canEdit = Boolean(mainThreadId) && sessionStarted;

  useEffect(() => {
    setDraft(getNote(mainThreadId));
  }, [mainThreadId, getNote]);

  useEffect(() => {
    if (!canEdit || !mainThreadId) return;
    const timer = window.setTimeout(() => {
      setNote(mainThreadId, draft);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, mainThreadId, canEdit, setNote]);

  return (
    <textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder="Write a note…"
      disabled={!canEdit}
      spellCheck
      className="min-h-0 w-full flex-1 resize-none border-0 bg-transparent px-4 pb-4 text-sm leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-50"
    />
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilesRailBody() {
  const projectId = useActiveProjectId();
  const projects = useProjectsStore((s) => s.projects);
  const project = projects.find((item) => item.id === projectId) ?? null;
  const projectFiles: ProjectFile[] = project?.files ?? [];
  const chatFiles = useChatAttachments();

  const empty = projectFiles.length === 0 && chatFiles.length === 0;

  if (empty) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-10"
        aria-label="No files"
      >
        <FolderOpenIcon
          className="size-12 stroke-[1.25] text-zinc-600"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      {chatFiles.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            This chat
          </h3>
          <ul className="flex flex-col gap-1">
            {chatFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-200"
              >
                <FileTextIcon className="size-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 truncate">{file.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {project ? (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
            Project · {project.name}
          </h3>
          {projectFiles.length === 0 ? (
            <p className="px-2 text-sm text-zinc-500">No project files yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {projectFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-200"
                >
                  <FileTextIcon className="size-4 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatSize(file.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function subsessionTitle(item: Subsession) {
  if (item.title?.trim()) return item.title.trim();
  const firstUser = item.messages.find((message) => message.role === "user");
  if (!firstUser) return "New subsession";
  return firstUser.content.replace(/\s+/g, " ").trim().slice(0, 72);
}

function subsessionDateLabel(
  createdAt: number,
  startOfToday: number,
  startOfYesterday: number,
): string {
  if (!(createdAt > 0)) return "Earlier";
  if (createdAt >= startOfToday) return "Today";
  if (createdAt >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const subscribeToNextDay = (onDayChange: () => void) => {
  let timeout: number;
  const scheduleNextDay = () => {
    const now = new Date();
    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    ).getTime();
    timeout = window.setTimeout(() => {
      onDayChange();
      scheduleNextDay();
    }, startOfTomorrow - now.getTime());
  };
  scheduleNextDay();
  return () => window.clearTimeout(timeout);
};

const useStartOfToday = () =>
  useSyncExternalStore(
    subscribeToNextDay,
    () => startOfLocalDay(new Date()),
    () => undefined as number | undefined,
  );

function SubsessionListItemMore({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useFixedMenuPosition(open, triggerRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground";

  const menu =
    open && mounted && pos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
            }}
            className="bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-xl border p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              <PencilIcon className="size-4" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className={cn(
                itemClass,
                "text-destructive hover:bg-destructive/10 hover:text-destructive",
              )}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <TrashIcon className="size-4" />
              Delete
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="contents">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="More options"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        className={cn(
          "absolute end-1.5 top-1/2 size-6 -translate-y-1/2 p-0 text-zinc-500 hover:bg-white/10 hover:text-zinc-200",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover/subsession:pointer-events-auto group-hover/subsession:opacity-100",
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontalIcon className="size-3.5" />
      </Button>
      {menu}
    </div>
  );
}

function SubsessionListBody() {
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const byId = useSubsessionsStore((s) => s.byId);
  const syncForParent = useSubsessionsStore((s) => s.syncForParent);
  const isSyncing = useSubsessionsStore((s) => s.isSyncing);
  const setActive = useSubsessionsStore((s) => s.setActive);
  const togglePinned = useSubsessionsStore((s) => s.togglePinned);
  const rename = useSubsessionsStore((s) => s.rename);
  const remove = useSubsessionsStore((s) => s.remove);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const startOfToday = useStartOfToday();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mainThreadId) return;
    void syncForParent(mainThreadId);
  }, [mainThreadId, syncForParent]);

  const groups = useMemo(() => {
    if (!mainThreadId) return [];
    const filtered = Object.values(byId)
      .filter(
        (item) => item.parentThreadId === mainThreadId && !item.isDraft,
      )
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return b.createdAt - a.createdAt;
      });

    if (startOfToday === undefined) {
      return [{ label: null as string | null, items: filtered }];
    }

    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = yesterday.getTime();

    const next: { label: string | null; items: Subsession[] }[] = [];
    const pinned = filtered.filter((item) => item.pinned);
    const unpinned = filtered.filter((item) => !item.pinned);
    if (pinned.length > 0) next.push({ label: "Pinned", items: pinned });

    for (const item of unpinned) {
      const label = subsessionDateLabel(
        item.createdAt,
        startOfToday,
        startOfYesterday,
      );
      const last = next[next.length - 1];
      if (last?.label === label) last.items.push(item);
      else next.push({ label, items: [item] });
    }

    return next;
  }, [byId, mainThreadId, startOfToday]);

  const itemCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.items.length, 0),
    [groups],
  );

  useEffect(() => {
    if (!renamingId) return;
    const frame = window.requestAnimationFrame(() => {
      renameRef.current?.focus();
      renameRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [renamingId]);

  const commitRename = () => {
    if (!renamingId) return;
    void rename(renamingId, renameValue);
    setRenamingId(null);
  };

  if (itemCount === 0) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-10"
        aria-label={isSyncing ? "Loading subsessions" : "No subsessions"}
      >
        <GitBranchIcon
          className="size-10 stroke-[1.25] text-zinc-600"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-4">
      <ul className="flex flex-col gap-0.5" aria-label="Subsession list">
        {groups.map((group, groupIndex) => (
          <Fragment key={`${group.label ?? "all"}-${groupIndex}`}>
            {group.label ? (
              <li
                className="text-muted-foreground px-2.5 pt-3 pb-1 text-xs font-medium"
                aria-hidden={false}
              >
                {group.label}
              </li>
            ) : null}
            {group.items.map((item) => {
              const preview = subsessionTitle(item);
              const pinned = Boolean(item.pinned);
              const isRenaming = renamingId === item.id;

              return (
                <li
                  key={item.id}
                  className="group/subsession relative flex h-8 items-center rounded-md bg-transparent transition-colors hover:bg-muted"
                >
                  {isRenaming ? (
                    <input
                      ref={renameRef}
                      aria-label="Rename subsession"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename();
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          setRenamingId(null);
                        }
                      }}
                      className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-2.5 text-sm text-zinc-100 outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActive(item.id);
                        setPanel("subsession-chat");
                      }}
                      className="flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-sm outline-none group-hover/subsession:pe-16 group-has-data-[state=open]/subsession:pe-16"
                    >
                      <span className="min-w-0 flex-1 truncate text-zinc-100">
                        {preview}
                      </span>
                    </button>
                  )}
                  {!isRenaming ? (
                    <>
                      <TooltipIconButton
                        tooltip={pinned ? "Unpin" : "Pin"}
                        side="bottom"
                        type="button"
                        aria-label={
                          pinned ? "Unpin subsession" : "Pin subsession"
                        }
                        aria-pressed={pinned}
                        className="pointer-events-none absolute end-8 top-1/2 size-6 -translate-y-1/2 rounded-md p-0 text-zinc-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-zinc-300 group-hover/subsession:pointer-events-auto group-hover/subsession:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePinned(item.id);
                        }}
                      >
                        {pinned ? (
                          <PinOffIcon className="size-3.5" />
                        ) : (
                          <PinIcon className="size-3.5" />
                        )}
                      </TooltipIconButton>
                      <SubsessionListItemMore
                        onRename={() => {
                          setRenameValue(preview);
                          setRenamingId(item.id);
                        }}
                        onDelete={() => {
                          void remove(item.id);
                        }}
                      />
                    </>
                  ) : null}
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

function SubsessionCopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <TooltipIconButton
      tooltip={isCopied ? "Copied" : "Copy"}
      side="top"
      type="button"
      aria-label="Copy"
      className={cn(
        "aui-user-action-copy size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100",
        className,
      )}
      onClick={() => {
        if (!text || isCopied) return;
        copyToClipboard(text);
      }}
    >
      {isCopied ? (
        <CheckIcon
          className="size-3.5 animate-in zoom-in-50 fade-in duration-200 ease-out"
          aria-hidden
        />
      ) : (
        <CopyIcon
          className="size-3.5 animate-in zoom-in-75 fade-in duration-150"
          aria-hidden
        />
      )}
    </TooltipIconButton>
  );
}

function SubsessionRunIndicator({
  runKey,
  label,
}: {
  runKey: string;
  label: string;
}) {
  const startedAt = useAgentRunStatusStore(
    (s) => s.startedAtByThreadId[runKey],
  );
  const isTerminal = label === "Done";
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Math.max(0, Date.now() - startedAt));
    tick();
    if (isTerminal) return;
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [startedAt, isTerminal]);

  return (
    <div
      data-slot="aui_assistant-message-indicator"
      className="mb-1.5 flex min-h-8 w-full items-center gap-2.5 font-sans text-[15px] font-medium leading-snug tracking-tight text-zinc-300"
      aria-label={
        startedAt == null ? label : `${label} ${elapsedMs}ms`
      }
      role="status"
    >
      {!isTerminal ? (
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
          <span className="size-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
        </span>
      ) : (
        <span
          className="size-1.5 shrink-0 rounded-full bg-zinc-600"
          aria-hidden
        />
      )}
      <span
        key={label}
        className={cn(
          "min-w-0 fade-in slide-in-from-left-1 animate-in fill-mode-both duration-200",
          isTerminal ? "text-zinc-500" : "text-zinc-300",
          !isTerminal && "shimmer motion-reduce:animate-none",
        )}
      >
        {label}
      </span>
      {startedAt != null ? (
        <span
          className={cn(
            "ms-auto shrink-0 tabular-nums text-xs font-normal tracking-normal",
            isTerminal ? "text-zinc-600" : "text-zinc-500",
          )}
        >
          {elapsedMs}ms
        </span>
      ) : null}
    </div>
  );
}

function SubsessionChatBody() {
  const activeId = useSubsessionsStore((s) => s.activeId);
  const byId = useSubsessionsStore((s) => s.byId);
  const pendingQuote = useSubsessionsStore((s) => s.pendingQuote);
  const setPendingQuote = useSubsessionsStore((s) => s.setPendingQuote);
  const appendMessage = useSubsessionsStore((s) => s.appendMessage);
  const patchMessage = useSubsessionsStore((s) => s.patchMessage);
  const editMessage = useSubsessionsStore((s) => s.editMessage);
  const replyQueuedFor = useSubsessionsStore((s) => s.replyQueuedFor);
  const clearReplyQueue = useSubsessionsStore((s) => s.clearReplyQueue);
  const setActive = useSubsessionsStore((s) => s.setActive);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const subsession = activeId ? byId[activeId] : null;
  const forkMessages = subsession?.messages ?? [];
  const isEmpty = forkMessages.length === 0;
  const isStreaming = forkMessages.some(
    (message) => message.status === "streaming",
  );
  const lastAssistantId = [...forkMessages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;
  const [draft, setDraft] = useState("");
  const [clearToken, setClearToken] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const canSend = Boolean(draft.trim()) && !isStreaming;
  const messageCount = forkMessages.length;
  const lastContentLen =
    forkMessages[forkMessages.length - 1]?.content.length ?? 0;
  const messagesLoaded = Boolean(subsession?.messagesLoaded);

  const runTurn = useCallback(
    (
      subsessionId: string,
      content: string,
      options?: { editMessageId?: string },
    ) => {
      stickToBottomRef.current = true;
      void runSubsessionTurn(subsessionId, content, options);
    },
    [],
  );

  // Hydrate + resume running backend turns (F5 / reopen). Do not abort on unmount.
  useEffect(() => {
    if (!activeId) return;
    void hydrateOrResumeSubsession(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!activeId || replyQueuedFor !== activeId || isStreaming) return;
    const current = useSubsessionsStore.getState().byId[activeId];
    const lastUser = [...(current?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user");
    clearReplyQueue();
    if (!lastUser?.content.trim()) return;
    runTurn(activeId, lastUser.content);
  }, [
    activeId,
    replyQueuedFor,
    isStreaming,
    clearReplyQueue,
    runTurn,
  ]);

  // Bridge store quote → Lexical chip (same delete / caret UX as main).
  useEffect(() => {
    if (!pendingQuote) return;
    requestSelectionChipInsert({
      messageId: crypto.randomUUID(),
      text: pendingQuote,
      scope: "subsession",
    });
    setPendingQuote(null);
  }, [pendingQuote, setPendingQuote]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      inputRef.current
        ?.querySelector<HTMLElement>(".aui-lexical-input")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, clearToken]);

  useEffect(() => {
    setEditingId(null);
    setEditDraft("");
  }, [activeId]);

  useEffect(() => {
    if (!editingId) return;
    const frame = window.requestAnimationFrame(() => {
      editInputRef.current?.focus({ preventScroll: true });
      editInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingId]);

  // Track whether the user is near the bottom (skip auto-scroll when reading up).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onScroll = () => {
      const distance =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      stickToBottomRef.current = distance < 80;
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [activeId]);

  // Single follower: auto pin while near bottom / streaming — no smooth-vs-auto fight.
  useEffect(() => {
    if (messageCount === 0 || editingId) return;
    if (!stickToBottomRef.current && !isStreaming) return;
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messageCount, activeId, editingId, lastContentLen, isStreaming]);

  // After hydrate when idle, pin once so Copy/Refresh sit above the composer.
  useEffect(() => {
    if (!activeId || isStreaming || messageCount === 0 || !messagesLoaded) {
      return;
    }
    stickToBottomRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, messagesLoaded]);

  const send = () => {
    if (!activeId || isStreaming) return;
    const content = flushInlineComposerDraft("subsession").trim() || draft.trim();
    if (!content) return;

    appendMessage(activeId, {
      id: crypto.randomUUID(),
      role: "user",
      content,
    });
    setDraft("");
    setClearToken((token) => token + 1);
    stickToBottomRef.current = true;
    runTurn(activeId, content);
    requestAnimationFrame(() => {
      inputRef.current
        ?.querySelector<HTMLElement>(".aui-lexical-input")
        ?.focus({ preventScroll: true });
    });
  };

  const submitEdit = (messageId: string) => {
    if (!activeId || !editDraft.trim() || isStreaming) return;
    const content = editDraft.trim();
    editMessage(activeId, messageId, content);
    setEditingId(null);
    runTurn(activeId, content, { editMessageId: messageId });
  };

  const runKey = activeId ?? "";
  const liveRunLabel = useAgentRunStatusStore((s) =>
    runKey ? s.byThreadId[runKey] : undefined,
  );
  const runDurationMs = useAgentRunStatusStore((s) =>
    runKey && lastAssistantId && !isStreaming
      ? s.durationMsByThreadId[runKey]
      : undefined,
  );

  const openSiblingSubsession = () => {
    if (!subsession?.parentThreadId || !subsession.forkedFromMessageId) return;
    void useSubsessionsStore
      .getState()
      .openFork({
        parentThreadId: subsession.parentThreadId,
        forkedFromMessageId: subsession.forkedFromMessageId,
        forceNew: true,
      })
      .then(() => setPanel("subsession-chat"))
      .catch(() => {
        // Keep current subsession usable if fork fails.
      });
  };

  return (
    <div
      data-subsession-chat=""
      className="relative flex min-h-0 flex-1 flex-col bg-[#121214]"
      style={
        {
          ["--composer-bg" as string]: "#1c1c21",
          ["--composer-radius" as string]: "1.75rem",
          ["--composer-padding" as string]: "12px",
          ["--thread-max-width" as string]: "42rem",
        } as CSSProperties
      }
    >
      {/* Same floating chrome as main ThreadTopActions — no header strip. */}
      <div
        data-slot="aui_subsession-top-actions"
        className="pointer-events-none absolute top-0 right-0 z-20 flex h-10 items-center justify-end gap-0.5 px-3 pt-1"
      >
        <div className="pointer-events-auto flex items-center gap-0.5">
          <TooltipIconButton
            tooltip="Subsessions"
            side="bottom"
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back to subsession list"
            onClick={() => {
              setActive(null);
              setPanel("subsessions");
            }}
            className="size-8 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
          >
            <AlignJustifyIcon className="size-[17px] stroke-[1.6]" />
          </TooltipIconButton>
          <TooltipIconButton
            tooltip="Close"
            side="bottom"
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => {
              setActive(null);
              setPanel(null);
            }}
            className="size-8 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
          >
            <XIcon className="size-4" />
          </TooltipIconButton>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="aui-thread-viewport relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4",
            isEmpty ? "justify-center pt-4" : "pt-12",
          )}
        >
          {isEmpty ? (
            <div
              className="flex flex-1 flex-col items-center justify-center pb-8"
              aria-label="New subsession"
            >
              <GitBranchIcon
                className="size-10 stroke-[1.25] text-zinc-600"
                aria-hidden
              />
            </div>
          ) : (
            <div
              data-slot="aui_message-group"
              className="mb-14 flex flex-col gap-y-6"
            >
              {forkMessages.map((message) =>
                message.role === "user" ? (
                  editingId === message.id ? (
                    <div
                      key={message.id}
                      data-slot="aui_edit-composer-wrapper"
                      className="flex flex-col px-2"
                    >
                      <div className="aui-edit-composer-root border-foreground/10 focus-within:border-foreground/25 ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-(--composer-radius) border bg-(--composer-bg) transition-[border-color]">
                        <textarea
                          ref={editInputRef}
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setEditingId(null);
                              return;
                            }
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              submitEdit(message.id);
                            }
                          }}
                          rows={3}
                          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 font-sans text-[16px] leading-[1.7] outline-none"
                        />
                        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3"
                            disabled={
                              !editDraft.trim() || !activeId || isStreaming
                            }
                            onClick={() => submitEdit(message.id)}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={message.id}
                      data-slot="aui_user-message-root"
                      data-role="user"
                      className="group/user-msg fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [&:where(>*)]:col-start-2"
                    >
                      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
                        <div className="aui-user-message-content peer bg-muted text-foreground w-fit max-w-full rounded-(--composer-radius) px-4 py-2.5 font-sans text-[16px] leading-[1.7] wrap-break-word whitespace-pre-wrap text-zinc-100 empty:hidden">
                          <SelectionAwareText
                            type="text"
                            text={message.content}
                            status={{ type: "complete" }}
                          />
                        </div>
                        <div className="aui-user-action-bar-wrapper absolute inset-y-0 end-full flex items-center pe-1 pl-2 opacity-0 transition-opacity peer-empty:hidden group-hover/user-msg:opacity-100 group-focus-within/user-msg:opacity-100">
                          <div className="aui-user-action-bar-root flex flex-row items-center gap-0.5">
                            <SubsessionCopyButton text={message.content} />
                            <TooltipIconButton
                              tooltip="Edit"
                              side="top"
                              type="button"
                              aria-label="Edit"
                              className="aui-user-action-edit size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                              onClick={() => {
                                setEditDraft(message.content);
                                setEditingId(message.id);
                              }}
                            >
                              <PencilIcon className="size-3.5" aria-hidden />
                            </TooltipIconButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div
                    key={message.id}
                    data-slot="aui_assistant-message-root"
                    data-role="assistant"
                    data-message-id={message.id}
                    className="fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150"
                  >
                    <div
                      data-slot="aui_assistant-message-content"
                      className="text-foreground px-2 font-sans text-[16px] leading-[1.7] wrap-break-word text-zinc-100"
                    >
                      {message.content ? (
                        <StandaloneMarkdownText
                          text={message.content}
                          animated={message.status === "streaming"}
                        />
                      ) : null}
                      {message.status === "streaming" && runKey ? (
                        <SubsessionRunIndicator
                          runKey={runKey}
                          label={
                            liveRunLabel ??
                            (message.content ? "Writing" : "Thinking")
                          }
                        />
                      ) : null}
                      {message.status === "error" && message.error ? (
                        <div className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
                          <p className="aui-message-error-message line-clamp-2">
                            {message.error}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    {message.status !== "streaming" && message.content ? (
                      <div
                        data-slot="aui_assistant-message-footer"
                        className="flex min-h-7.5 w-full min-w-0 items-center gap-2 px-2 pt-1.5"
                      >
                        <div className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in -ms-1 flex gap-1 duration-200">
                          <SubsessionCopyButton text={message.content} />
                          {message.id === lastAssistantId && !isStreaming ? (
                            <TooltipIconButton
                              tooltip="Refresh"
                              type="button"
                              className="size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                              onClick={() => {
                                if (!activeId) return;
                                const priorUser = [...forkMessages]
                                  .slice(
                                    0,
                                    forkMessages.findIndex(
                                      (row) => row.id === message.id,
                                    ),
                                  )
                                  .reverse()
                                  .find((row) => row.role === "user");
                                if (!priorUser?.content.trim()) return;
                                void runTurn(activeId, priorUser.content, {
                                  editMessageId: priorUser.id,
                                });
                              }}
                            >
                              <RefreshCwIcon className="size-3.5" />
                            </TooltipIconButton>
                          ) : null}
                          {message.id === lastAssistantId ? (
                            <TooltipIconButton
                              tooltip="New subsession"
                              type="button"
                              className="size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                              onClick={openSiblingSubsession}
                            >
                              <MessageSquareIcon className="size-3.5" />
                            </TooltipIconButton>
                          ) : null}
                        </div>
                        {message.id === lastAssistantId &&
                        typeof runDurationMs === "number" ? (
                          <span
                            data-slot="aui_assistant-message-duration"
                            className="ms-auto shrink-0 self-center text-xs tabular-nums text-zinc-500"
                            aria-label={`Generated in ${runDurationMs}ms`}
                          >
                            {runDurationMs}ms
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ),
              )}
              <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
            </div>
          )}

          <div
            className={cn(
              "aui-thread-viewport-footer flex flex-col gap-4 overflow-visible bg-gradient-to-t from-[#121214] via-[#121214]/95 to-transparent pb-5 md:pb-7",
              !isEmpty && "sticky bottom-0 mt-auto",
            )}
          >
          <div className="aui-composer-root relative flex w-full flex-col gap-2">
            <div
              data-slot="aui_composer-shell"
              className="flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border border-white/10 bg-(--composer-bg) p-(--composer-padding) shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-[border-color,box-shadow] focus-within:border-white/20 focus-within:shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
              onClick={() =>
                inputRef.current
                  ?.querySelector<HTMLElement>(".aui-lexical-input")
                  ?.focus()
              }
            >
              <div ref={inputRef}>
                <InlineChipComposerInput
                  scope="subsession"
                  placeholder="Ask anything"
                  aria-label="Subsession message"
                  autoFocus
                  onEnter={send}
                  onTextChange={setDraft}
                  clearToken={clearToken}
                  className="aui-composer-input relative max-h-48 min-h-11 w-full overflow-x-hidden overflow-y-auto px-3 py-2 text-base leading-6 text-zinc-100 caret-white"
                />
              </div>
              <div className="aui-composer-action-wrapper relative flex items-center justify-between">
                <div className="aui-composer-action-start flex min-w-0 items-center gap-1.5">
                  <TooltipIconButton
                    tooltip="Add photos & files"
                    side="bottom"
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Add photos & files"
                    className="aui-composer-add-attachment text-muted-foreground hover:text-foreground hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-7 rounded-full active:scale-[0.96] motion-reduce:transition-none"
                  >
                    <PlusIcon className="size-4" />
                  </TooltipIconButton>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <ComposerModelPicker scope="subsession" />
                  {isStreaming ? (
                    <TooltipIconButton
                      tooltip="Stop generating"
                      side="bottom"
                      type="button"
                      variant="default"
                      size="icon"
                      aria-label="Stop generating"
                      onClick={() => {
                        if (!activeId) return;
                        abortSubsessionStream(activeId);
                        const streaming = forkMessages.find(
                          (message) => message.status === "streaming",
                        );
                        if (streaming) {
                          patchMessage(activeId, streaming.id, {
                            status: "complete",
                          });
                        }
                      }}
                      className="aui-composer-cancel size-7 rounded-full"
                    >
                      <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
                    </TooltipIconButton>
                  ) : (
                    <TooltipIconButton
                      tooltip="Send message"
                      side="bottom"
                      type="button"
                      variant="default"
                      size="icon"
                      aria-label="Send message"
                      disabled={!canSend}
                      onClick={send}
                      className="aui-composer-send size-7 rounded-full"
                    >
                      <ArrowUpIcon className="aui-composer-send-icon size-4" />
                    </TooltipIconButton>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shared sliding rail for notes / files / subsession list / subsession chat. */
export const ContextRail: FC = () => {
  const panel = useContextRailStore((s) => s.panel);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const widths = useContextRailStore((s) => s.widths);
  const setWidth = useContextRailStore((s) => s.setWidth);
  const sessionStarted = useSessionStarted();
  const [dragging, setDragging] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const width =
    panel != null
      ? widths[panel as ContextRailPanelId]
      : RAIL_WIDTH_DEFAULT;
  const isSubsessionChat = panel === "subsession-chat";
  const isSubsessionList = panel === "subsessions";
  const halfSplit = isSubsessionHalfSplit(panel, width);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(width);
  const open =
    panel !== null &&
    (sessionStarted || isSubsessionList || isSubsessionChat);

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!open) return;
      event.preventDefault();
      dragStartX.current = event.clientX;
      // Half-split starts from the current rendered width, then switches to px.
      dragStartWidth.current =
        halfSplit && asideRef.current
          ? asideRef.current.offsetWidth
          : width;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [open, width, halfSplit],
  );

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const delta = dragStartX.current - event.clientX;
      setWidth(dragStartWidth.current + delta);
    },
    [setWidth],
  );

  const onResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragging(false);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;
    const previous = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = previous;
      document.body.style.userSelect = previousSelect;
    };
  }, [dragging]);

  if (!open && !sessionStarted) return null;

  const title =
    panel === "files"
      ? "Files"
      : panel === "notes"
        ? "Notes"
        : panel === "subsession-chat"
          ? "Subsession"
          : "Subsessions";

  return (
    <>
      {/* Mobile: dim chat behind the sheet */}
      <button
        type="button"
        aria-label="Close panel"
        tabIndex={open ? 0 : -1}
        onClick={() => setPanel(null)}
        className={cn(
          "absolute inset-0 z-30 bg-black/55 transition-opacity duration-300 md:hidden",
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        ref={asideRef}
        data-slot="aui_context-rail"
        aria-label={title}
        aria-hidden={!open}
        style={
          halfSplit
            ? undefined
            : ({
                "--rail-width": `${width}px`,
              } as CSSProperties)
        }
        className={cn(
          "z-40 flex flex-col overflow-hidden",
          isSubsessionChat ? "bg-[#121214]" : "bg-[#0e0e10]",
          // Mobile: overlay sheet from the right
          "absolute inset-y-0 right-0 w-full max-w-none",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
          !dragging &&
            "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          // Desktop: docked rail that resizes the chat column
          "md:relative md:inset-auto md:translate-x-0 md:shrink-0",
          open && halfSplit && "md:w-1/2 md:border-l md:border-white/5",
          open && !halfSplit && "md:w-(--rail-width) md:border-l md:border-white/5",
          !open && "md:w-0 md:border-l md:border-transparent",
          !dragging &&
            "md:transition-[width] md:duration-300 md:ease-[cubic-bezier(0.32,0.72,0,1)]",
          !open && "md:pointer-events-none",
        )}
      >
        <div
          className={cn(
            "relative flex h-full w-full flex-col",
            open && halfSplit && "md:w-full",
            open && !halfSplit && "md:w-(--rail-width)",
          )}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            aria-valuemin={RAIL_WIDTH_MIN}
            aria-valuemax={RAIL_WIDTH_MAX}
            aria-valuenow={
              halfSplit && asideRef.current
                ? asideRef.current.offsetWidth
                : width
            }
            tabIndex={open ? 0 : -1}
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
            onKeyDown={(event) => {
              if (!open) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                const base =
                  halfSplit && asideRef.current
                    ? asideRef.current.offsetWidth
                    : width;
                setWidth(base + 16);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                const base =
                  halfSplit && asideRef.current
                    ? asideRef.current.offsetWidth
                    : width;
                setWidth(base - 16);
              }
            }}
            className={cn(
              "absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize touch-none md:block",
              "after:absolute after:inset-y-0 after:left-1 after:w-px after:bg-transparent after:transition-colors",
              "hover:after:bg-white/25",
              dragging && "after:bg-white/40",
              !open && "pointer-events-none",
            )}
          />
          {!isSubsessionChat ? (
            <div
              className={cn(
                "flex h-12 shrink-0 items-center gap-2 border-b-0 px-3 md:h-10 md:px-2",
                panel === "notes" ? "justify-end" : "justify-between",
              )}
            >
              {panel !== "notes" ? (
                <p className="min-w-0 flex-1 truncate px-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  {title}
                </p>
              ) : null}
              <TooltipIconButton
                tooltip="Close"
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => setPanel(null)}
                className="size-8 shrink-0 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
              >
                <XIcon className="size-4" />
              </TooltipIconButton>
            </div>
          ) : null}
          {panel === "notes" ? <NotesRailBody /> : null}
          {panel === "files" ? <FilesRailBody /> : null}
          {panel === "subsessions" ? <SubsessionListBody /> : null}
          {panel === "subsession-chat" ? <SubsessionChatBody /> : null}
        </div>
      </aside>
    </>
  );
};

/** @deprecated use ContextRail */
export const NotesPanel = ContextRail;
