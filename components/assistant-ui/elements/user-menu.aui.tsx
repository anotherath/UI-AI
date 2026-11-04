"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
};

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const UserMenu: FC<{ user: SidebarUser }> = ({ user }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-full min-w-[14rem] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1f] p-1 shadow-2xl"
        >
          <div className="border-b border-white/10 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-zinc-100">
              {user.name}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <UserIcon className="size-4 shrink-0" />
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <SettingsIcon className="size-4 shrink-0" />
            Settings
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
            onClick={() => setOpen(false)}
          >
            <LogOutIcon className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        data-slot="aui_user-menu-trigger"
        className={cn(
          "flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted",
          "group-data-[sidebar-mode=icon]:size-8! group-data-[sidebar-mode=icon]:justify-center group-data-[sidebar-mode=icon]:p-0!",
          open && "bg-muted",
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar size="default">
          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
          <AvatarFallback>{userInitials(user.name) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none group-data-[sidebar-mode=icon]:hidden">
          <span className="truncate text-sm font-semibold text-sidebar-foreground">
            {user.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
      </button>
    </div>
  );
};
