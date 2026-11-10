"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AlignJustifyIcon,
  ArrowUpIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  GitBranchIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PencilIcon,
  PenLineIcon,
  PinIcon,
  SquareIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { useAuiState } from "@assistant-ui/react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  formatSelectionDirective,
  SelectionAwareText,
  selectionDirectiveLabel,
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
import { streamSubsessionReply } from "@/lib/subsession-chat";
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
  const setActive = useSubsessionsStore((s) => s.setActive);
  const togglePinned = useSubsessionsStore((s) => s.togglePinned);
  const rename = useSubsessionsStore((s) => s.rename);
  const remove = useSubsessionsStore((s) => s.remove);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    if (!mainThreadId) return [];
    return Object.values(byId)
      .filter((item) => item.parentThreadId === mainThreadId)
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return b.createdAt - a.createdAt;
      });
  }, [byId, mainThreadId]);

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
    rename(renamingId, renameValue);
    setRenamingId(null);
  };

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-10"
        aria-label="No subsessions"
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
        {items.map((item) => {
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
                  <button
                    type="button"
                    aria-label={pinned ? "Unpin subsession" : "Pin subsession"}
                    aria-pressed={pinned}
                    className={cn(
                      "absolute end-8 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md p-0 text-zinc-500 transition-opacity hover:bg-white/10 hover:text-zinc-200",
                      pinned
                        ? "opacity-100 text-zinc-200"
                        : "pointer-events-none opacity-0 group-hover/subsession:pointer-events-auto group-hover/subsession:opacity-100",
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      togglePinned(item.id);
                    }}
                  >
                    <PinIcon
                      className={cn("size-3.5", pinned && "fill-current")}
                    />
                  </button>
                  <SubsessionListItemMore
                    onRename={() => {
                      setRenameValue(preview);
                      setRenamingId(item.id);
                    }}
                    onDelete={() => remove(item.id)}
                  />
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function threadPartText(
  message: {
    role: string;
    id: string;
    content: ReadonlyArray<{ type: string; text?: string }>;
  },
): { id: string; role: "user" | "assistant"; content: string } | null {
  if (message.role !== "user" && message.role !== "assistant") return null;
  const content = message.content
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
  if (!content.trim()) return null;
  return {
    id: message.id,
    role: message.role,
    content,
  };
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
  const parentMessages = useAuiState((s) => s.thread.messages);
  const subsession = activeId ? byId[activeId] : null;
  const forkMessages = subsession?.messages ?? [];
  const isEmpty = forkMessages.length === 0;
  const isStreaming = forkMessages.some(
    (message) => message.status === "streaming",
  );
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const canSend = Boolean(draft.trim() || pendingQuote) && !isStreaming;
  const messageCount = forkMessages.length;
  const lastContent =
    forkMessages[forkMessages.length - 1]?.content.length ?? 0;

  const buildHistory = useCallback(
    (forkTurns: typeof forkMessages, assistantId?: string) => {
      const forkAtCount = subsession?.forkAtCount ?? 0;
      const inherited = parentMessages
        .slice(0, forkAtCount)
        .map(threadPartText)
        .filter(
          (
            turn,
          ): turn is {
            id: string;
            role: "user" | "assistant";
            content: string;
          } => turn !== null,
        );
      const local = forkTurns
        .filter((message) => message.id !== assistantId)
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }));
      return [...inherited, ...local];
    },
    [parentMessages, subsession?.forkAtCount],
  );

  const runAssistant = useCallback(
    async (subsessionId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = crypto.randomUUID();
      appendMessage(subsessionId, {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
      });

      const current = useSubsessionsStore.getState().byId[subsessionId];
      if (!current) return;

      await streamSubsessionReply({
        chatId: subsessionId,
        assistantId,
        messages: buildHistory(current.messages, assistantId),
        abortSignal: controller.signal,
        onUpdate: (content) => {
          patchMessage(subsessionId, assistantId, {
            content,
            status: "streaming",
            error: undefined,
          });
        },
        onError: (error) => {
          patchMessage(subsessionId, assistantId, {
            status: "error",
            error,
          });
        },
      });

      const latest =
        useSubsessionsStore.getState().byId[subsessionId]?.messages.find(
          (message) => message.id === assistantId,
        );
      if (latest?.status === "streaming") {
        patchMessage(subsessionId, assistantId, { status: "complete" });
      }
    },
    [appendMessage, buildHistory, patchMessage],
  );

  useEffect(() => {
    if (!activeId || replyQueuedFor !== activeId || isStreaming) return;
    clearReplyQueue();
    void runAssistant(activeId);
  }, [
    activeId,
    replyQueuedFor,
    isStreaming,
    clearReplyQueue,
    runAssistant,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingQuote, activeId]);

  useEffect(() => {
    setEditingId(null);
    setEditDraft("");
    abortRef.current?.abort();
    abortRef.current = null;
  }, [activeId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const frame = window.requestAnimationFrame(() => {
      editInputRef.current?.focus({ preventScroll: true });
      editInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingId]);

  // Smooth scroll / turn motion when a new message lands — same feel as main chat.
  useEffect(() => {
    if (messageCount === 0 || editingId) return;
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messageCount, activeId, editingId, lastContent]);

  const send = () => {
    if (!activeId || isStreaming) return;
    const text = draft.trim();
    if (!text && !pendingQuote) return;

    let content = text;
    if (pendingQuote) {
      const chip = formatSelectionDirective(pendingQuote, crypto.randomUUID());
      content = text ? `${chip} ${text}` : chip;
      setPendingQuote(null);
    }

    appendMessage(activeId, {
      id: crypto.randomUUID(),
      role: "user",
      content,
    });
    setDraft("");
    void runAssistant(activeId);
  };

  const submitEdit = (messageId: string) => {
    if (!activeId || !editDraft.trim() || isStreaming) return;
    editMessage(activeId, messageId, editDraft.trim());
    setEditingId(null);
    void runAssistant(activeId);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-[#121214]"
      style={
        {
          ["--composer-bg" as string]: "#1c1c21",
          ["--composer-radius" as string]: "1.75rem",
          ["--composer-padding" as string]: "12px",
          ["--thread-max-width" as string]: "42rem",
        } as CSSProperties
      }
    >
      <div className="flex h-10 shrink-0 items-center justify-end gap-0.5 px-2">
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

      <div className="aui-thread-viewport relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto scroll-smooth [scrollbar-gutter:stable]">
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
                          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
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
                    className="group/user-msg fade-in slide-in-from-bottom-2 animate-in fill-mode-both grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-300 ease-out [&:where(>*)]:col-start-2"
                  >
                    <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
                      <div className="aui-user-message-content peer bg-muted text-foreground rounded-(--composer-radius) px-4 py-2 wrap-break-word">
                        <SelectionAwareText
                          type="text"
                          text={message.content}
                          status={{ type: "complete" }}
                        />
                      </div>
                      <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 opacity-0 transition-opacity group-hover/user-msg:opacity-100 focus-within:opacity-100">
                        <TooltipIconButton
                          tooltip="Edit"
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          className="aui-user-action-edit size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                          onClick={() => {
                            setEditDraft(message.content);
                            setEditingId(message.id);
                          }}
                        >
                          <PencilIcon className="size-3.5" />
                        </TooltipIconButton>
                      </div>
                    </div>
                  </div>
                  )
                ) : (
                  <div
                    key={message.id}
                    data-slot="aui_assistant-message-root"
                    data-role="assistant"
                    className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both relative duration-300 ease-out"
                  >
                    <div
                      data-slot="aui_assistant-message-content"
                      className="text-foreground px-2 leading-relaxed wrap-break-word whitespace-pre-wrap"
                    >
                      {message.content ? (
                        message.content
                      ) : message.status === "streaming" ? (
                        <span
                          className="animate-pulse font-sans"
                          aria-label="Assistant is working"
                        >
                          ●
                        </span>
                      ) : null}
                      {message.status === "error" && message.error ? (
                        <div className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
                          <p className="aui-message-error-message line-clamp-2">
                            {message.error}
                          </p>
                        </div>
                      ) : null}
                    </div>
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
              onClick={() => inputRef.current?.focus()}
            >
              <div className="aui-composer-input relative flex max-h-48 min-h-11 w-full flex-wrap items-center gap-x-1.5 gap-y-1 px-3 py-2 text-base leading-6 text-zinc-100">
                {pendingQuote ? (
                  <span
                    className="aui-selection-chip inline-flex h-5 max-w-[min(100%,14rem)] items-center gap-1 rounded-md bg-[#1b3f5c] py-0 ps-1.5 pe-0.5 align-middle text-[13px] leading-none text-[#b7d4ea]"
                    contentEditable={false}
                    data-selection-chip=""
                  >
                    <MessageSquareIcon
                      className="size-3.5 shrink-0 text-[#6fa8cc]"
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0 truncate">
                      {selectionDirectiveLabel(pendingQuote)}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove selection"
                      className="flex size-4 shrink-0 items-center justify-center rounded-sm text-[#6fa8cc] transition-colors hover:bg-white/10 hover:text-[#d7ebf7]"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingQuote(null);
                      }}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ) : null}
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={pendingQuote ? "" : "Ask anything"}
                  aria-label="Subsession message"
                  className="min-h-[1.5rem] min-w-[8rem] flex-1 resize-none bg-transparent py-0 text-base leading-6 text-zinc-100 caret-white outline-none placeholder:text-zinc-500"
                />
              </div>
              <div className="aui-composer-action-wrapper relative flex items-center justify-between">
                <div className="aui-composer-action-start flex min-w-0 items-center gap-1.5">
                  <TooltipIconButton
                    tooltip="Add Attachment"
                    side="bottom"
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Add Attachment"
                    className="aui-composer-add-attachment text-muted-foreground hover:text-foreground hover:bg-muted-foreground/15 size-7 rounded-full"
                  >
                    <PaperclipIcon className="size-4" />
                  </TooltipIconButton>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isStreaming ? (
                    <TooltipIconButton
                      tooltip="Stop generating"
                      side="bottom"
                      type="button"
                      variant="default"
                      size="icon"
                      aria-label="Stop generating"
                      onClick={() => {
                        abortRef.current?.abort();
                        if (!activeId) return;
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
