"use client";

import type * as React from "react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AiMark } from "@/components/brand/ai-mark";
import {
  ThreadList,
  ThreadListSearchTrigger,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { ProjectsSection } from "@/components/assistant-ui/elements/projects-section.aui";
import { ThreadSearchDialog } from "@/components/assistant-ui/elements/thread-search-dialog.aui";
import { UserMenu } from "@/components/assistant-ui/elements/user-menu.aui";

type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
};

// Auth chưa gắn — placeholder tạm. Sẽ thay bằng session Google sau.
const PLACEHOLDER_USER: SidebarUser = {
  name: "User",
  email: "user@example.com",
  image: null,
};

export function ThreadListSidebar({
  user = PLACEHOLDER_USER,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: SidebarUser }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Sidebar
      collapsible="icon"
      className="border-white/5 bg-[#0e0e10]"
      {...props}
    >
      <SidebarHeader className="aui-sidebar-header overflow-hidden border-b border-white/5 group-data-[sidebar-mode=icon]:gap-1 group-data-[sidebar-mode=icon]:p-2">
        {/* Expanded: logo + name | search + toggle */}
        <div className="aui-sidebar-header-content flex w-full min-w-0 items-center justify-between gap-1 group-data-[sidebar-mode=icon]:hidden">
          <div className="flex min-w-0 items-center gap-1">
            <div
              className="flex size-8 shrink-0 items-center justify-center text-white"
              aria-hidden
            >
              <AiMark className="size-5" />
            </div>
            <span className="truncate text-sm font-medium tracking-tight text-zinc-100">
              Another Intelligence
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <ThreadListSearchTrigger
              open={searchOpen}
              onOpenChange={setSearchOpen}
            />
            <SidebarTrigger
              size="icon"
              className="size-8 text-zinc-400 hover:text-white"
            />
          </div>
        </div>

        {/* Collapsed: logo (hover → expand) + search */}
        <div className="hidden w-full flex-col items-start gap-1 group-data-[sidebar-mode=icon]:flex">
          <div className="group/logo relative size-8 shrink-0">
            <div
              className="flex size-8 items-center justify-center text-white transition-opacity duration-150 group-hover/logo:opacity-0"
              aria-hidden
            >
              <AiMark className="size-5" />
            </div>
            <SidebarTrigger
              size="icon"
              aria-label="Expand sidebar"
              className="absolute inset-0 size-8 text-zinc-300 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100 hover:bg-white/10 hover:text-white"
            />
          </div>
          <ThreadListSearchTrigger
            open={searchOpen}
            onOpenChange={setSearchOpen}
            className="size-8"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="aui-sidebar-content overflow-x-hidden px-2 group-data-[sidebar-mode=icon]:items-start group-data-[sidebar-mode=icon]:pt-2">
        <ThreadList />
        <ProjectsSection />
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="aui-sidebar-footer overflow-visible border-t border-white/5 group-data-[sidebar-mode=icon]:items-start group-data-[sidebar-mode=icon]:p-2">
        <UserMenu user={user} />
      </SidebarFooter>

      <ThreadSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </Sidebar>
  );
}
