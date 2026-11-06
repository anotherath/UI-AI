"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  PenLineIcon,
  XIcon,
} from "lucide-react";
import { useAuiState } from "@assistant-ui/react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  RAIL_WIDTH_DEFAULT,
  RAIL_WIDTH_MAX,
  RAIL_WIDTH_MIN,
  useContextRailStore,
  type ContextRailPanel,
} from "@/lib/context-rail-store";
import { useNotesStore } from "@/lib/notes-store";
import {
  useProjectsStore,
  type ProjectFile,
} from "@/lib/projects-store";
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

  if (!sessionStarted || current !== null) return null;

  return (
    <TooltipIconButton
      tooltip={tooltip}
      side="bottom"
      type="button"
      variant="ghost"
      size="icon"
      aria-label={tooltip}
      aria-pressed={false}
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

/** Top-right Files + Notes — ẩn hết khi rail đang mở. */
export const ThreadTopActions: FC = () => {
  const panel = useContextRailStore((s) => s.panel);
  const sessionStarted = useSessionStarted();

  if (!sessionStarted || panel !== null) return null;

  return (
    <div
      data-slot="aui_thread-top-actions"
      className="pointer-events-none absolute top-0 right-0 z-20 flex h-10 items-center justify-end gap-0.5 px-3 pt-1"
    >
      <div className="pointer-events-auto flex items-center gap-0.5">
        <FilesTriggerButton />
        <NotesTriggerButton />
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

/** Shared sliding rail for notes / files. */
export const ContextRail: FC = () => {
  const panel = useContextRailStore((s) => s.panel);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const width = useContextRailStore((s) => s.width);
  const setWidth = useContextRailStore((s) => s.setWidth);
  const sessionStarted = useSessionStarted();
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(width);
  const open = panel !== null && sessionStarted;

  useEffect(() => {
    if (width === 352) setWidth(RAIL_WIDTH_DEFAULT);
  }, [width, setWidth]);

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!open) return;
      event.preventDefault();
      dragStartX.current = event.clientX;
      dragStartWidth.current = width;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [open, width],
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

  if (!sessionStarted) return null;

  return (
    <aside
      data-slot="aui_context-rail"
      aria-label={panel === "files" ? "Files" : "Notes"}
      aria-hidden={!open}
      style={{ width: open ? width : 0 }}
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden bg-[#0e0e10]",
        open ? "border-l border-white/5" : "border-l border-transparent",
        !dragging &&
          "transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        !open && "pointer-events-none",
      )}
    >
      <div className="relative flex h-full flex-col" style={{ width }}>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          aria-valuemin={RAIL_WIDTH_MIN}
          aria-valuemax={RAIL_WIDTH_MAX}
          aria-valuenow={width}
          tabIndex={open ? 0 : -1}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setWidth(width + 16);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              setWidth(width - 16);
            }
          }}
          className={cn(
            "absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none",
            "after:absolute after:inset-y-0 after:left-1 after:w-px after:bg-transparent after:transition-colors",
            "hover:after:bg-white/25",
            dragging && "after:bg-white/40",
            !open && "pointer-events-none",
          )}
        />
        <div className="flex h-10 shrink-0 items-center justify-end px-2">
          <TooltipIconButton
            tooltip="Close"
            side="bottom"
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => setPanel(null)}
            className="size-8 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
          >
            <XIcon className="size-4" />
          </TooltipIconButton>
        </div>
        {panel === "notes" ? <NotesRailBody /> : null}
        {panel === "files" ? <FilesRailBody /> : null}
      </div>
    </aside>
  );
};

/** @deprecated use ContextRail */
export const NotesPanel = ContextRail;
