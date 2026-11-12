"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";
import {
  ThreadListItemMorePrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  ImageIcon,
  LibraryIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  PresentationIcon,
  SearchIcon,
  GlobeIcon,
  TrashIcon,
} from "lucide-react";
import {
  deleteChatSession,
  pinChatSession,
  unpinChatSession,
  updateChatSessionTitle,
  type ChatSession,
} from "@/lib/chat-api";
import {
  clearBackendSessionId,
  getBackendSessionId,
  getThreadIdForBackendSession,
} from "@/lib/chat-session-map";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { openBackendChatSession } from "@/lib/open-chat-session";
import { usePinnedThreadsStore } from "@/lib/pinned-threads-store";
import { useComposerPrefsStore } from "@/lib/composer-prefs-store";
import { useProjectsStore } from "@/lib/projects-store";
import {
  forwardRef,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type FC,
} from "react";

export type ThreadListProps = Record<string, never>;

const navItemClass =
  "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-sm text-zinc-300 transition-colors hover:bg-muted hover:text-white group-data-[sidebar-mode=icon]:size-8! group-data-[sidebar-mode=icon]:justify-center group-data-[sidebar-mode=icon]:px-0!";

export const ThreadList: FC = () => {
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const openLibrary = useProjectsStore((s) => s.openLibrary);
  const openBrowseProjects = useProjectsStore((s) => s.openBrowseProjects);
  const openImageGen = useProjectsStore((s) => s.openImageGen);
  const openSlides = useProjectsStore((s) => s.openSlides);
  const openBuild = useProjectsStore((s) => s.openBuild);
  const openResearch = useProjectsStore((s) => s.openResearch);
  const startNormalChat = useProjectsStore((s) => s.startNormalChat);
  const newChatSpotlight = useProjectsStore((s) => s.newChatSpotlight);
  const isBrowsing = useProjectsStore((s) => s.isBrowsing);
  const isCreating = useProjectsStore((s) => s.isCreating);
  const isLibrary = useProjectsStore((s) => s.isLibrary);
  const isImageGen = useProjectsStore((s) => s.isImageGen);
  const isSlides = useProjectsStore((s) => s.isSlides);
  const isBuild = useProjectsStore((s) => s.isBuild);
  const isResearch = useProjectsStore((s) => s.isResearch);
  const closeBrowseProjects = useProjectsStore((s) => s.closeBrowseProjects);
  const closeCreateProject = useProjectsStore((s) => s.closeCreateProject);
  const closeLibrary = useProjectsStore((s) => s.closeLibrary);
  const closeImageGen = useProjectsStore((s) => s.closeImageGen);
  const closeSlides = useProjectsStore((s) => s.closeSlides);
  const closeBuild = useProjectsStore((s) => s.closeBuild);
  const closeResearch = useProjectsStore((s) => s.closeResearch);
  const aui = useAui();
  // Side panes own the active pill — never keep New chat lit.
  const isNewChatActive =
    newChatSpotlight &&
    !isCreating &&
    !isBrowsing &&
    !isLibrary &&
    !isImageGen &&
    !isSlides &&
    !isBuild &&
    !isResearch;

  const goToNormalChat = () => {
    closeLibrary();
    closeImageGen();
    closeSlides();
    closeBuild();
    closeResearch();
    closeCreateProject();
    closeBrowseProjects();
    useComposerPrefsStore.getState().setMode("auto");
    useChatSessionsStore.getState().clearActiveSession();
    // Drop any leftover draft so New chat never re-sends old paste/content.
    try {
      aui.composer.setText("");
    } catch {
      // Composer may be unavailable mid-unmount.
    }
    // Switch first, then force top New chat spotlight last so nothing
    // in the thread-switch path can steal highlight back to a project chat.
    aui.threads.switchToNewThread();
    startNormalChat();
  };

  const goToBuild = () => {
    closeLibrary();
    closeImageGen();
    closeSlides();
    closeResearch();
    closeCreateProject();
    closeBrowseProjects();
    useComposerPrefsStore.getState().setMode("website");
    useChatSessionsStore.getState().clearActiveSession();
    try {
      aui.composer.setText("");
    } catch {
      // Composer may be unavailable mid-unmount.
    }
    aui.threads.switchToNewThread();
    openBuild();
  };

  const goToImagine = () => {
    closeLibrary();
    closeSlides();
    closeBuild();
    closeResearch();
    closeCreateProject();
    closeBrowseProjects();
    useComposerPrefsStore.getState().setMode("imagine");
    useChatSessionsStore.getState().clearActiveSession();
    try {
      aui.composer.setText("");
    } catch {
      // Composer may be unavailable mid-unmount.
    }
    aui.threads.switchToNewThread();
    // Same empty chat surface as New chat; Imagine owns the sidebar pill.
    openImageGen();
  };

  const goToSlides = () => {
    closeLibrary();
    closeImageGen();
    closeBuild();
    closeResearch();
    closeCreateProject();
    closeBrowseProjects();
    useComposerPrefsStore.getState().setMode("slides");
    useChatSessionsStore.getState().clearActiveSession();
    try {
      aui.composer.setText("");
    } catch {
      // Composer may be unavailable mid-unmount.
    }
    aui.threads.switchToNewThread();
    openSlides();
  };

  const goToResearch = () => {
    closeLibrary();
    closeImageGen();
    closeSlides();
    closeBuild();
    closeCreateProject();
    closeBrowseProjects();
    useComposerPrefsStore.getState().setMode("research");
    useChatSessionsStore.getState().clearActiveSession();
    try {
      aui.composer.setText("");
    } catch {
      // Composer may be unavailable mid-unmount.
    }
    aui.threads.switchToNewThread();
    openResearch();
  };

  return (
    <ThreadListRoot className="w-full group-data-[sidebar-mode=icon]:items-start">
      <div className="mb-3 flex w-full flex-col gap-0.5 group-data-[sidebar-mode=icon]:mb-2 group-data-[sidebar-mode=icon]:items-start">
        <button
          type="button"
          aria-label="New chat"
          aria-current={isNewChatActive ? "page" : undefined}
          className={cn(
            navItemClass,
            isNewChatActive && "bg-muted text-white",
          )}
          onClick={goToNormalChat}
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            New chat
          </span>
        </button>
        <button
          type="button"
          aria-label="Imagine"
          aria-current={isImageGen ? "page" : undefined}
          className={cn(navItemClass, isImageGen && "bg-muted text-white")}
          onClick={goToImagine}
        >
          <ImageIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            Imagine
          </span>
        </button>
        <button
          type="button"
          aria-label="Build website"
          aria-current={isBuild ? "page" : undefined}
          className={cn(navItemClass, isBuild && "bg-muted text-white")}
          onClick={goToBuild}
        >
          <GlobeIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            Build website
          </span>
        </button>
        <button
          type="button"
          aria-label="Slides"
          aria-current={isSlides ? "page" : undefined}
          className={cn(navItemClass, isSlides && "bg-muted text-white")}
          onClick={goToSlides}
        >
          <PresentationIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            Slides
          </span>
        </button>
        <button
          type="button"
          aria-label="Research"
          aria-current={isResearch ? "page" : undefined}
          className={cn(navItemClass, isResearch && "bg-muted text-white")}
          onClick={goToResearch}
        >
          <SearchIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            Research
          </span>
        </button>
        <button
          type="button"
          aria-label="Projects"
          aria-current={isBrowsing ? "page" : undefined}
          className={cn(navItemClass, isBrowsing && "bg-muted text-white")}
          onClick={openBrowseProjects}
        >
          <FolderIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            Projects
          </span>
        </button>
        <button
          type="button"
          aria-label="Library"
          aria-current={isLibrary ? "page" : undefined}
          className={cn(navItemClass, isLibrary && "bg-muted text-white")}
          onClick={() => openLibrary()}
        >
          <LibraryIcon className="size-4 shrink-0" />
          <span className="truncate group-data-[sidebar-mode=icon]:hidden">
            Library
          </span>
        </button>
      </div>

      {/* CHATS header stays fixed; list scrolls so PROJECTS below is not pushed. */}
      <div className="mb-1 flex h-8 w-full min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden px-1 group-data-[sidebar-mode=icon]:hidden">
        <button
          type="button"
          className="flex h-8 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-md text-zinc-500 transition-colors hover:text-zinc-300"
          aria-expanded={chatsExpanded}
          aria-label={chatsExpanded ? "Collapse chats" : "Expand chats"}
          onClick={() => setChatsExpanded((open) => !open)}
        >
          {chatsExpanded ? (
            <ChevronDownIcon className="size-3.5 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-3.5 shrink-0" />
          )}
          <h2 className="truncate text-xs font-medium leading-none tracking-wide uppercase">
            Chats
          </h2>
        </button>
        <ThreadListNew />
      </div>
      <div
        className={cn(
          "grid w-full min-h-0 transition-[grid-template-rows,opacity] duration-300 ease-out",
          chatsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          "group-data-[sidebar-mode=icon]:hidden",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ThreadListItems />
        </div>
      </div>
    </ThreadListRoot>
  );
};

export function ThreadListSearchTrigger({
  open,
  onOpenChange,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  return (
    <TooltipIconButton
      tooltip="Search chats"
      side="bottom"
      type="button"
      aria-label="Search chats"
      aria-expanded={open}
      aria-haspopup="dialog"
      data-slot="aui_thread-list-search-trigger"
      className={cn("size-8 shrink-0 text-zinc-400 hover:text-white", className)}
      onClick={() => onOpenChange(true)}
    >
      <SearchIcon className="size-4" />
    </TooltipIconButton>
  );
}

export const ThreadListRoot: FC<
  ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root>
> = ({ className, ...props }) => {
  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      className={cn(
        "flex min-h-0 w-full flex-col gap-0.5 group-data-[sidebar-mode=icon]:gap-0",
        className,
      )}
      {...props}
    />
  );
};


export const ThreadListItems: FC<
  ComponentPropsWithoutRef<"div"> & { searchQuery?: string }
> = ({ className, searchQuery = "", ...props }) => {
  return (
    <div
      data-slot="aui_thread-list-items"
      className={cn("flex min-h-0 flex-col gap-0.5", className)}
      {...props}
    >
      <ChatSessionList searchQuery={searchQuery} />
    </div>
  );
};

export const ThreadListNew = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { labelClassName?: string }
>(({ className, labelClassName: _labelClassName, children, onClick, ...props }, ref) => {
  const startNormalChat = useProjectsStore((s) => s.startNormalChat);
  const aui = useAui();
  return (
    <ThreadListPrimitive.New
      render={
        <TooltipIconButton
          ref={ref}
          tooltip="New chat"
          side="bottom"
          aria-label="New session"
          data-slot="aui_thread-list-new"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-transparent p-0 text-zinc-400 hover:bg-muted hover:text-white data-active:bg-transparent data-active:text-zinc-300",
            className,
          )}
          {...props}
          onClick={(event) => {
            useChatSessionsStore.getState().clearActiveSession();
            try {
              aui.composer.setText("");
            } catch {
              // ignore
            }
            aui.threads.switchToNewThread();
            startNormalChat();
            onClick?.(event);
          }}
        />
      }
    >
      {children ?? (
        <PlusIcon
          data-slot="aui_thread-list-new-icon"
          className="size-4 shrink-0"
        />
      )}
    </ThreadListPrimitive.New>
  );
});

ThreadListNew.displayName = "ThreadListNew";


type ChatListEntry =
  | {
      kind: "session";
      id: string;
      title: string;
      updatedAt: number;
      session: ChatSession;
      threadId: string | null;
    }
  | {
      kind: "draft";
      id: string;
      title: string;
      updatedAt: number;
      threadId: string;
    };

const dateGroupLabel = (
  date: Date | undefined,
  startOfToday: number,
  startOfYesterday: number,
): string => {
  // Missing timestamps sort to the bottom — don't call them "Today"
  // or consecutive grouping splits into duplicate Today sections.
  if (!date) return "Earlier";
  if (date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfYesterday) return "Yesterday";
  return "Earlier";
};

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

const getStartOfToday = () => startOfLocalDay(new Date());
const getServerStartOfToday = () => undefined;

const useStartOfToday = () =>
  useSyncExternalStore<number | undefined>(
    subscribeToNextDay,
    getStartOfToday,
    getServerStartOfToday,
  );

export type ThreadListGroup = { label: string; indices: number[] };

function useChatListEntries(searchQuery = "") {
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const sessions = useChatSessionsStore((s) => s.sessions);
  const pinnedIds = usePinnedThreadsStore((s) => s.pinnedIds);
  const query = searchQuery.trim().toLowerCase();
  const startOfToday = useStartOfToday();

  return useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const mappedThreadIds = new Set<string>();

    const entries: ChatListEntry[] = sessions.map((session) => {
      const threadId = getThreadIdForBackendSession(session.id);
      if (threadId) mappedThreadIds.add(threadId);
      const activity =
        session.last_message_at || session.updated_at || session.created_at;
      const ts = Date.parse(activity);
      return {
        kind: "session" as const,
        id: session.id,
        title: session.title?.trim() || "New Chat",
        updatedAt: Number.isNaN(ts) ? 0 : ts,
        session,
        threadId,
      };
    });

    for (const threadId of threadIds) {
      if (mappedThreadIds.has(threadId)) continue;
      if (getBackendSessionId(threadId)) continue;
      const item = itemsById.get(threadId);
      const lastAt = item?.lastMessageAt?.getTime() ?? 0;
      // Active New Chat draft has no backend last_message_at yet — keep it at
      // the top while createChatSession is in flight (otherwise sinks to 0).
      const updatedAt =
        lastAt > 0
          ? lastAt
          : threadId === mainThreadId
            ? Date.now()
            : 0;
      entries.push({
        kind: "draft",
        id: `draft:${threadId}`,
        title: item?.title?.trim() || "New Chat",
        updatedAt,
        threadId,
      });
    }

    const filtered = entries.filter((entry) =>
      query ? entry.title.toLowerCase().includes(query) : true,
    );

    const isPinned = (entry: ChatListEntry) =>
      entry.kind === "session"
        ? entry.session.is_pinned
        : Boolean(pinnedIds[entry.threadId]);
    const pinRank = (entry: ChatListEntry) => (isPinned(entry) ? 1 : 0);
    const pinnedAt = (entry: ChatListEntry) =>
      entry.kind === "session" ? entry.session.pinned_at ?? "" : "";

    filtered.sort(
      (a, b) =>
        pinRank(b) - pinRank(a) ||
        (pinRank(a) === 1
          ? pinnedAt(b).localeCompare(pinnedAt(a))
          : b.updatedAt - a.updatedAt) ||
        a.id.localeCompare(b.id),
    );

    if (startOfToday === undefined || !filtered.some((e) => e.updatedAt > 0)) {
      return { entries: filtered, groups: null as null | { label: string; entries: ChatListEntry[] }[] };
    }

    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = yesterday.getTime();

    const groups: { label: string; entries: ChatListEntry[] }[] = [];
    const pinned = filtered.filter((e) => pinRank(e) === 1);
    const unpinned = filtered.filter((e) => pinRank(e) === 0);
    if (pinned.length > 0) groups.push({ label: "Pinned", entries: pinned });

    for (const entry of unpinned) {
      const label = dateGroupLabel(
        entry.updatedAt > 0 ? new Date(entry.updatedAt) : undefined,
        startOfToday,
        startOfYesterday,
      );
      const last = groups[groups.length - 1];
      if (last?.label === label) last.entries.push(entry);
      else groups.push({ label, entries: [entry] });
    }

    return { entries: filtered, groups };
  }, [
    threadIds,
    threadItems,
    mainThreadId,
    sessions,
    pinnedIds,
    query,
    startOfToday,
  ]);
}

const ChatSessionList: FC<{ searchQuery?: string }> = ({ searchQuery = "" }) => {
  const { entries, groups } = useChatListEntries(searchQuery);
  const query = searchQuery.trim();
  const isLoadingMore = useChatSessionsStore((s) => s.isLoadingMore);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  // Only fetch the next page after the user scrolls to the real bottom.
  // Stable deps (always []) — read flags from the store inside the handler.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const onScroll = () => {
      if (searchQueryRef.current.trim()) return;
      const state = useChatSessionsStore.getState();
      if (!state.hasMore || state.isLoadingMore || state.isLoading) return;
      const remaining =
        root.scrollHeight - root.scrollTop - root.clientHeight;
      if (remaining > 8) return;
      // Ignore until the list actually overflows (avoids auto-loading on mount).
      if (root.scrollHeight <= root.clientHeight + 1) return;
      void state.fetchMoreSessions();
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  const rows =
    query && entries.length === 0 ? (
      <div
        data-slot="aui_thread-list-empty"
        className="text-muted-foreground px-2.5 py-4 text-sm"
      >
        No threads found
      </div>
    ) : !groups ? (
      entries.map((entry) => <ChatListRow key={entry.id} entry={entry} />)
    ) : (
      groups.map((group, index) => (
        <Fragment key={`${group.label}-${index}`}>
          <div
            data-slot="aui_thread-list-group-label"
            className="text-muted-foreground px-2.5 pt-3 pb-1 text-xs font-medium"
          >
            {group.label}
          </div>
          {group.entries.map((entry) => (
            <ChatListRow key={entry.id} entry={entry} />
          ))}
        </Fragment>
      ))
    );

  return (
    <div
      ref={scrollRef}
      data-slot="aui_thread-list-scroll"
      // Native Blink scroll (same as chat viewport). Thumb only on hover.
      // ~10 rows visible so PROJECTS stays on-screen under the nav stack.
      className="aui-chats-scroll max-h-[min(calc(10*2rem+2rem),40vh)] overflow-y-auto"
    >
      {rows}
      {!query && isLoadingMore ? (
        <div
          data-slot="aui_thread-list-load-more"
          className="flex h-8 items-center justify-center gap-1.5 px-2.5"
          aria-busy
          aria-label="Loading more chats"
        >
          <span className="size-1.5 rounded-full bg-zinc-500 animate-pulse" />
          <span className="size-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:300ms]" />
        </div>
      ) : null}
    </div>
  );
};

const ChatListRow: FC<{ entry: ChatListEntry }> = ({ entry }) => {
  const aui = useAui();
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const openChatFromChats = useProjectsStore((s) => s.openChatFromChats);
  const sidebarHighlight = useProjectsStore((s) => s.sidebarHighlight);
  const threadProjects = useProjectsStore((s) => s.threadProjects);
  const upsertSession = useChatSessionsStore((s) => s.upsertSession);
  const removeSession = useChatSessionsStore((s) => s.removeSession);
  const activeSessionId = useChatSessionsStore((s) => s.activeSessionId);
  const clearActiveSession = useChatSessionsStore((s) => s.clearActiveSession);
  const draftPinned = usePinnedThreadsStore((s) =>
    entry.kind === "draft" ? Boolean(s.pinnedIds[entry.threadId]) : false,
  );
  const toggleDraftPinned = usePinnedThreadsStore((s) => s.togglePinned);
  const pinned =
    entry.kind === "session" ? entry.session.is_pinned : draftPinned;

  const [isRenaming, setIsRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [titleDraft, setTitleDraft] = useState(entry.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const settledRef = useRef(false);

  const mappedThreadId =
    entry.kind === "session"
      ? getThreadIdForBackendSession(entry.session.id)
      : entry.threadId;
  // Selection is sticky: click sets activeSessionId and keeps it after hydrate.
  const isActive =
    sidebarHighlight === "chats" &&
    (entry.kind === "session"
      ? activeSessionId === entry.session.id
      : activeSessionId == null && mainThreadId === entry.threadId);
  const isRunning = Boolean(
    mappedThreadId &&
      threadItems.find((item) => item.id === mappedThreadId)?.isRunning,
  );
  const boundProjectId =
    entry.kind === "session"
      ? entry.session.project_id
      : mappedThreadId
        ? threadProjects[mappedThreadId]
        : null;

  useEffect(() => {
    setTitleDraft(entry.title);
  }, [entry.title]);

  useEffect(() => {
    if (isRenaming) inputRef.current?.select();
  }, [isRenaming]);

  const openEntry = () => {
    // Leaving Imagine / other panes for a chat — reset to Auto so Imagine Mode
    // does not bounce back onto the image page.
    useComposerPrefsStore.getState().setMode("auto");
    if (entry.kind === "session") {
      // Sticky highlight immediately; openBackendChatSession also beginOpening
      // and clears has_unread via POST /read.
      useChatSessionsStore.getState().beginOpeningSession(entry.session.id);
      openChatFromChats(entry.session.project_id);
      void openBackendChatSession(aui, entry.session)
        .catch(() => {
          // Error already stored in openError for the thread banner.
        })
        .finally(() => {
          window.requestAnimationFrame(() => triggerRef.current?.blur());
        });
      return;
    }

    clearActiveSession();
    openChatFromChats(boundProjectId ?? null);
    void (async () => {
      try {
        await aui.threads.switchToThread(entry.threadId);
      } catch {
        // Keep current thread if open fails.
      } finally {
        window.requestAnimationFrame(() => triggerRef.current?.blur());
      }
    })();
  };

  const commitRename = (restoreFocus: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const next = titleDraft.trim();
    if (!next || next === entry.title) {
      setIsRenaming(false);
      if (restoreFocus) triggerRef.current?.focus();
      settledRef.current = false;
      return;
    }

    void (async () => {
      try {
        if (entry.kind === "session") {
          const updated = await updateChatSessionTitle(entry.session.id, next);
          upsertSession(updated);
          const threadId = getThreadIdForBackendSession(entry.session.id);
          if (threadId) {
            try {
              await aui.threads.item({ id: threadId }).rename(next);
            } catch {
              // optional
            }
          }
        } else {
          await aui.threads.item({ id: entry.threadId }).rename(next);
        }
        setIsRenaming(false);
        if (restoreFocus) triggerRef.current?.focus();
      } catch {
        settledRef.current = false;
        inputRef.current?.focus();
        return;
      }
      settledRef.current = false;
    })();
  };

  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    void (async () => {
      try {
        if (entry.kind === "session") {
          await deleteChatSession(entry.session.id);
          const threadId = getThreadIdForBackendSession(entry.session.id);
          if (threadId) {
            clearBackendSessionId(threadId);
            try {
              await aui.threads.item({ id: threadId }).delete();
            } catch {
              // Thread may not exist locally yet.
            }
          }
          removeSession(entry.session.id);
        } else {
          await aui.threads.item({ id: entry.threadId }).delete();
        }
      } catch {
        setDeleting(false);
      }
    })();
  };

  return (
    <div
      data-slot="aui_thread-list-item"
      data-active={isActive ? "true" : undefined}
      className={cn(
        "group/chat relative flex h-8 items-center rounded-md bg-transparent transition-colors focus-visible:outline-none hover:bg-muted",
        isActive ? "bg-muted hover:bg-muted" : "hover:bg-muted",
      )}
    >
      {isRenaming ? (
        <Input
          ref={inputRef}
          autoFocus
          data-slot="aui_thread-list-item-rename"
          aria-label="Rename thread"
          value={titleDraft}
          className="h-7 min-w-0 flex-1 ps-2.5 pe-9 text-sm"
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={() => commitRename(false)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
              return;
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename(true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              settledRef.current = true;
              setIsRenaming(false);
              setTitleDraft(entry.title);
              settledRef.current = false;
              triggerRef.current?.focus();
            }
          }}
        />
      ) : (
        <button
          ref={triggerRef}
          type="button"
          data-slot="aui_thread-list-item-trigger"
          className="flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-sm outline-none group-hover/chat:pe-16 group-has-data-[state=open]/chat:pe-16"
          onClick={openEntry}
        >
          {isRunning && (
            <Loader2Icon
              aria-hidden
              data-slot="aui_thread-list-item-running"
              className="text-muted-foreground me-1.5 size-3.5 shrink-0 animate-spin"
            />
          )}
          {entry.kind === "session" &&
          entry.session.has_unread &&
          activeSessionId !== entry.session.id ? (
            <span
              aria-label="Unread"
              data-slot="aui_thread-list-item-unread"
              className="me-1.5 size-1.5 shrink-0 rounded-full bg-[#3b82f6]/70"
            />
          ) : null}
          <span
            data-slot="aui_thread-list-item-title"
            className="min-w-0 flex-1 truncate"
          >
            {entry.title}
          </span>
          {isRunning && <span className="sr-only">Running</span>}
        </button>
      )}
      <TooltipIconButton
        tooltip={pinned ? "Unpin" : "Pin"}
        side="bottom"
        type="button"
        aria-label={pinned ? "Unpin chat" : "Pin chat"}
        aria-pressed={pinned}
        data-slot="aui_thread-list-item-pin"
        className="pointer-events-none absolute end-8 top-1/2 size-6 -translate-y-1/2 rounded-md p-0 text-zinc-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-zinc-300 group-hover/chat:pointer-events-auto group-hover/chat:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          if (pinning) return;
          if (entry.kind === "draft") {
            toggleDraftPinned(entry.threadId);
            return;
          }
          const previous = entry.session;
          const nextPinned = !previous.is_pinned;
          // Optimistic: move/fill pin immediately; reconcile with API after.
          upsertSession({
            ...previous,
            is_pinned: nextPinned,
            pinned_at: nextPinned ? new Date().toISOString() : null,
          });
          setPinning(true);
          void (async () => {
            try {
              const updated = nextPinned
                ? await pinChatSession(previous.id)
                : await unpinChatSession(previous.id);
              upsertSession(updated);
            } catch {
              upsertSession(previous);
            } finally {
              setPinning(false);
            }
          })();
        }}
      >
        {pinned ? (
          <PinOffIcon className="size-3.5" />
        ) : (
          <PinIcon className="size-3.5" />
        )}
      </TooltipIconButton>
      <ThreadListItemMorePrimitive.Root sharedFocusGroup>
        <ThreadListItemMorePrimitive.Trigger
          render={
            <Button
              variant="ghost"
              size="icon"
              data-slot="aui_thread-list-item-more"
              className="data-[state=open]:bg-accent absolute end-1.5 top-1/2 size-6 -translate-y-1/2 p-0 opacity-0 pointer-events-none group-hover/chat:pointer-events-auto group-hover/chat:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
            />
          }
        >
          <MoreHorizontalIcon className="size-3.5" />
          <span className="sr-only">More options</span>
        </ThreadListItemMorePrimitive.Trigger>
        <ThreadListItemMorePrimitive.Content
          side="right"
          align="start"
          sideOffset={6}
          data-slot="aui_thread-list-item-more-content"
          className="bg-popover text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-xl border p-1.5"
        >
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
            onSelect={() => setIsRenaming(true)}
          >
            <PencilIcon className="size-4" />
            Rename
          </ThreadListItemMorePrimitive.Item>
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-disabled:opacity-50"
            disabled={deleting}
            onSelect={handleDelete}
          >
            <TrashIcon className="size-4" />
            {deleting ? "Deleting…" : "Delete"}
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemMorePrimitive.Content>
      </ThreadListItemMorePrimitive.Root>
    </div>
  );
};
