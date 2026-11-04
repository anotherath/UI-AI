"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useAui } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { useFixedMenuPosition } from "@/hooks/use-fixed-menu-position";
import { useProjectsStore } from "@/lib/projects-store";

type ProjectThreadMenuProps = {
  threadId: string;
  title: string;
  className?: string;
  triggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export const ProjectThreadMenu: FC<ProjectThreadMenuProps> = ({
  threadId,
  title,
  className,
  triggerClassName,
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useFixedMenuPosition(open, triggerRef);
  const aui = useAui();
  const assignThreadProject = useProjectsStore((s) => s.assignThreadProject);

  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setMenuOpen(false);
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
  }, [open, onOpenChange]);

  const item = () => aui.threads.item({ id: threadId });

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white";

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
            className="z-[100] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1f] p-1 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                const next = window.prompt("Rename chat", title);
                if (next == null) return;
                const trimmed = next.trim();
                if (!trimmed || trimmed === title) return;
                item().rename(trimmed);
              }}
            >
              <PencilIcon className="size-3.5 shrink-0" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                item().archive();
                assignThreadProject(threadId, null, { force: true });
              }}
            >
              <ArchiveIcon className="size-3.5 shrink-0" />
              Archive
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                if (!window.confirm(`Delete “${title}”?`)) return;
                item().delete();
                assignThreadProject(threadId, null, { force: true });
              }}
            >
              <Trash2Icon className="size-3.5 shrink-0" />
              Delete
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200",
          open && "bg-white/10 text-zinc-200",
          triggerClassName,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen(!open);
        }}
      >
        <MoreHorizontalIcon className="size-3.5" />
      </button>
      {menu}
    </div>
  );
};
