"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MessageSquareIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";
import { useAui } from "@assistant-ui/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CHAT_SESSION_SEARCH_MIN_Q,
  searchChatSessions,
  type ChatSession,
  type ChatSessionSearchHit,
} from "@/lib/chat-api";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { useComposerPrefsStore } from "@/lib/composer-prefs-store";
import { openBackendChatSession } from "@/lib/open-chat-session";
import { useProjectsStore } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

type ThreadSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchRow = {
  id: string;
  session: ChatSession;
  title: string;
  when: string;
  snippet?: string;
  matchIn?: "title" | "message";
};

/** Three bouncing dots — search loading indicator. */
function BouncingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center gap-1.5", className)}
      aria-hidden
    >
      <span className="size-1.5 rounded-full bg-zinc-500 animate-bounce [animation-duration:0.7s]" />
      <span className="size-1.5 rounded-full bg-zinc-500 animate-bounce [animation-duration:0.7s] [animation-delay:120ms]" />
      <span className="size-1.5 rounded-full bg-zinc-500 animate-bounce [animation-duration:0.7s] [animation-delay:240ms]" />
    </span>
  );
}

/** Split `text` and paint query matches in blue. */
function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const needle = query.trim();
  if (!needle) {
    return <span className={className}>{text}</span>;
  }

  const lower = text.toLowerCase();
  const q = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const at = lower.indexOf(q, cursor);
    if (at === -1) {
      parts.push(text.slice(cursor));
      break;
    }
    if (at > cursor) parts.push(text.slice(cursor, at));
    parts.push(
      <span key={`h-${key++}`} className="text-blue-500">
        {text.slice(at, at + needle.length)}
      </span>,
    );
    cursor = at + needle.length;
  }

  return <span className={className}>{parts}</span>;
}

function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const dayDiff = Math.round((startOfToday - startOfThatDay) / 86_400_000);

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 30) return `${dayDiff}d`;
  if (dayDiff < 365) {
    const months = Math.max(1, Math.floor(dayDiff / 30));
    return `${months}mo`;
  }
  const years = Math.max(1, Math.floor(dayDiff / 365));
  return `${years}y`;
}

function sessionToRow(session: ChatSession): SearchRow {
  return {
    id: session.id,
    session,
    title: session.title?.trim() || "New Chat",
    when: formatRelative(session.last_message_at || session.updated_at),
  };
}

function hitToRow(hit: ChatSessionSearchHit): SearchRow {
  const base = sessionToRow(hit.session);
  const snippet = hit.snippet.trim();
  // Message hits: show content preview under the title.
  // Title hits: snippet === title — skip the redundant second line.
  return {
    ...base,
    matchIn: hit.match_in,
    snippet:
      hit.match_in === "message" && snippet.length > 0 ? snippet : undefined,
  };
}

export function ThreadSearchDialog({
  open,
  onOpenChange,
}: ThreadSearchDialogProps) {
  const aui = useAui();
  const sessions = useChatSessionsStore((s) => s.sessions);
  const openChatFromChats = useProjectsStore((s) => s.openChatFromChats);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [hits, setHits] = useState<ChatSessionSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= CHAT_SESSION_SEARCH_MIN_Q;

  const recentRows = useMemo(
    () => sessions.slice(0, 8).map(sessionToRow),
    [sessions],
  );

  const results = useMemo(() => {
    if (!canSearch) return recentRows;
    return hits.map(hitToRow);
  }, [canSearch, hits, recentRows]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setSearchError(null);
    setSearching(false);
    setActiveIndex(0);
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  useEffect(() => {
    if (!open) return;
    if (!canSearch) {
      setHits([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    setSearchError(null);
    setHits([]);
    const timer = window.setTimeout(() => {
      void searchChatSessions({ q: trimmed, scope: "all", limit: 30 })
        .then((page) => {
          if (requestId !== requestIdRef.current) return;
          setHits(page.items);
          setSearching(false);
        })
        .catch((error) => {
          if (requestId !== requestIdRef.current) return;
          setHits([]);
          setSearching(false);
          setSearchError(
            error instanceof Error ? error.message : "Search failed",
          );
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, canSearch, trimmed]);

  const selectSession = (session: ChatSession) => {
    useComposerPrefsStore.getState().setMode("auto");
    useChatSessionsStore.getState().beginOpeningSession(session.id);
    openChatFromChats(session.project_id);
    onOpenChange(false);
    void openBackendChatSession(aui, session).catch(() => {
      // Error already stored in openError for the thread banner.
    });
  };

  const emptyState = canSearch
    ? searching
      ? {
          icon: <BouncingDots className="scale-125" />,
          label: "Searching",
        }
      : searchError
        ? {
            icon: <SearchXIcon className="size-8 stroke-[1.5]" />,
            label: searchError,
          }
        : {
            icon: <SearchXIcon className="size-8 stroke-[1.5]" />,
            label: "No chats found",
          }
    : trimmed.length > 0
      ? {
          icon: <SearchIcon className="size-8 stroke-[1.5]" />,
          label: `Type at least ${CHAT_SESSION_SEARCH_MIN_Q} characters`,
        }
      : {
          icon: <MessageSquareIcon className="size-8 stroke-[1.5]" />,
          label: "No chats yet",
        };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/60 backdrop-blur-[2px]"
        className={cn(
          "flex h-[min(74vh,38rem)] w-[min(100%-2rem,36rem)] max-w-none -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-3xl border border-white/8 bg-[#121214] p-0 text-zinc-100 shadow-[0_32px_100px_rgba(0,0,0,0.65)] ring-0 sm:max-w-none",
        )}
      >
        <DialogTitle className="sr-only">Search chats</DialogTitle>
        <DialogDescription className="sr-only">
          Find and open a conversation by title or message content
        </DialogDescription>

        <div className="flex shrink-0 items-center gap-2.5 border-b border-white/5 px-4 pt-4 pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-white/10 bg-[#1c1c21] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color] focus-within:border-white/20">
            <SearchIcon className="size-4 shrink-0 text-zinc-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="h-11 w-full bg-transparent text-[15px] text-zinc-100 outline-none placeholder:text-zinc-500"
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((i) =>
                    results.length === 0
                      ? 0
                      : Math.min(i + 1, results.length - 1),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const target = results[activeIndex];
                  if (target) selectSession(target.session);
                }
              }}
            />
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-xl text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {results.length === 0 ? (
            <div
              className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-zinc-600"
              role="status"
              aria-label={emptyState.label}
            >
              {emptyState.icon}
              <span className="sr-only">{emptyState.label}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 pb-2 pt-0.5 text-[11px] font-medium tracking-[0.08em] text-zinc-500 uppercase">
                {canSearch ? (
                  searching ? (
                    <>
                      <span className="sr-only">Searching</span>
                      <BouncingDots />
                    </>
                  ) : (
                    "Results"
                  )
                ) : (
                  "Recent"
                )}
              </div>
              <ul className="flex flex-col gap-1" role="listbox">
                {results.map((item, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-white/8 text-zinc-100"
                            : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectSession(item.session)}
                      >
                        <span className="flex w-full items-center gap-3">
                          <HighlightedText
                            text={item.title}
                            query={canSearch ? trimmed : ""}
                            className="min-w-0 flex-1 truncate text-[15px] leading-snug"
                          />
                          {item.when ? (
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                              {item.when}
                            </span>
                          ) : null}
                        </span>
                        {item.snippet ? (
                          <HighlightedText
                            text={item.snippet}
                            query={canSearch ? trimmed : ""}
                            className="line-clamp-2 text-[13px] leading-snug text-zinc-500"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
