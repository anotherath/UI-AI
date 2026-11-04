"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  KeyRoundIcon,
  LibraryIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFixedMenuPosition } from "@/hooks/use-fixed-menu-position";
import { useProjectsStore, type Project } from "@/lib/projects-store";

type ProjectOptionsMenuProps = {
  project: Project;
  className?: string;
  triggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export const ProjectOptionsMenu: FC<ProjectOptionsMenuProps> = ({
  project,
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
  const openEditProject = useProjectsStore((s) => s.openEditProject);
  const openLibrary = useProjectsStore((s) => s.openLibrary);
  const openApi = useProjectsStore((s) => s.openApi);
  const removeProject = useProjectsStore((s) => s.removeProject);

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
                openLibrary(project.id);
              }}
            >
              <LibraryIcon className="size-3.5 shrink-0" />
              Library
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                openApi(project.id);
              }}
            >
              <KeyRoundIcon className="size-3.5 shrink-0" />
              API
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                openEditProject(project.id);
              }}
            >
              <PencilIcon className="size-3.5 shrink-0" />
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                if (!window.confirm(`Delete “${project.name}”?`)) return;
                removeProject(project.id);
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
        aria-label="Project options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200",
          open && "bg-white/10 text-zinc-200",
          triggerClassName,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen(!open);
        }}
      >
        <MoreHorizontalIcon className="size-4" />
      </button>
      {menu}
    </div>
  );
};
