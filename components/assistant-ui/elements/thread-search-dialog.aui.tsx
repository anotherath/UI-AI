"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { useAui, useAuiState } from "@assistant-ui/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThreadSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatRelative(date: Date | undefined, now = new Date()): string {
  if (!date || Number.isNaN(date.getTime())) return "";

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

export function ThreadSearchDialog({
  open,
  onOpenChange,
}: ThreadSearchDialogProps) {
  const aui = useAui();
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const q = query.trim().toLowerCase();
    const mapped = threadIds.map((id) => {
      const item = itemsById.get(id);
      return {
        id,
        title: item?.title?.trim() || "New Chat",
        lastMessageAt: item?.lastMessageAt,
      };
    });

    const filtered = mapped.filter(
      (item) => !q || item.title.toLowerCase().includes(q),
    );

    return [...filtered].sort((a, b) => {
      const ta = a.lastMessageAt?.getTime() ?? 0;
      const tb = b.lastMessageAt?.getTime() ?? 0;
      return tb - ta;
    });
  }, [threadIds, threadItems, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectThread = (threadId: string) => {
    aui.threads.switchToThread(threadId);
    onOpenChange(false);
  };

  const searching = query.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/55"
        className={cn(
          "flex h-[min(68vh,32rem)] w-[min(100%-2rem,28rem)] max-w-none -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-2xl border border-white/5 bg-[#0e0e10] p-0 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-0 sm:max-w-none",
        )}
      >
        <DialogTitle className="sr-only">Search chats</DialogTitle>
        <DialogDescription className="sr-only">
          Find and open a recent conversation
        </DialogDescription>

        <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#17171b] px-3">
            <SearchIcon className="size-4 shrink-0 text-zinc-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="h-10 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
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
                  if (target) selectThread(target.id);
                }
              }}
            />
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {results.length === 0 ? (
            <div className="flex h-full min-h-32 items-center justify-center px-3 text-sm text-zinc-500">
              {searching ? "No chats found" : "No chats yet"}
            </div>
          ) : (
            <>
              <div className="px-2.5 pb-1.5 pt-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {searching ? "Results" : "Recent"}
              </div>
              <ul className="flex flex-col gap-0.5" role="listbox">
                {results.map((item, index) => {
                  const active = index === activeIndex;
                  const when = formatRelative(item.lastMessageAt);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm transition-colors",
                          active
                            ? "bg-muted text-zinc-100"
                            : "text-zinc-300 hover:bg-muted hover:text-zinc-100",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectThread(item.id)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>
                        {when ? (
                          <span className="shrink-0 text-xs text-zinc-500">
                            {when}
                          </span>
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
