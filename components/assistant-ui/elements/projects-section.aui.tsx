"use client";

import { useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  PlusIcon,
} from "lucide-react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProjectIcon } from "@/lib/project-icons";
import {
  sortProjectsByCreated,
  useProjectsStore,
} from "@/lib/projects-store";
import { useProjectThreadBinding } from "@/hooks/use-project-thread-binding";
import { ProjectOptionsMenu } from "@/components/assistant-ui/elements/project-options-menu.aui";
import { ProjectThreadMenu } from "@/components/assistant-ui/elements/project-thread-menu.aui";

export const ProjectsSection: FC = () => {
  useProjectThreadBinding();

  const [expanded, setExpanded] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const aui = useAui();
  const projects = useProjectsStore((s) => s.projects);
  const orderedProjects = useMemo(
    () => sortProjectsByCreated(projects),
    [projects],
  );
  const selectedId = useProjectsStore((s) => s.selectedId);
  const sidebarHighlight = useProjectsStore((s) => s.sidebarHighlight);
  const isCreating = useProjectsStore((s) => s.isCreating);
  const editingId = useProjectsStore((s) => s.editingId);
  const threadProjects = useProjectsStore((s) => s.threadProjects);
  const selectProject = useProjectsStore((s) => s.selectProject);
  const openCreateProject = useProjectsStore((s) => s.openCreateProject);
  const openBrowseProjects = useProjectsStore((s) => s.openBrowseProjects);
  const isAddProjectActive = isCreating && editingId == null;

  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);

  const threadsByProject = useMemo(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const map = new Map<
      string,
      { id: string; title: string; isActive: boolean }[]
    >();

    // Only real project sessions (already bound) — never a temporary landing row.
    for (const threadId of threadIds) {
      const item = itemsById.get(threadId);
      const projectId =
        threadProjects[threadId] ??
        (item?.custom?.projectId as string | undefined);
      if (!projectId) continue;
      const entry = {
        id: threadId,
        title: item?.title?.trim() || "New Chat",
        // Light under Projects only when that region is focused.
        isActive:
          sidebarHighlight === "project" &&
          threadId === mainThreadId &&
          selectedId === projectId,
      };
      const list = map.get(projectId);
      if (list) list.push(entry);
      else map.set(projectId, [entry]);
    }

    return map;
  }, [
    mainThreadId,
    selectedId,
    sidebarHighlight,
    threadIds,
    threadItems,
    threadProjects,
  ]);

  const nestedCountRef = useRef<Record<string, number>>({});
  const nestedActiveRef = useRef<Record<string, boolean>>({});
  /** Project ids the user just collapsed — skip one auto-expand pass. */
  const skipAutoExpandRef = useRef<Set<string>>(new Set());

  // Auto-expand only on real events (new nested chat, or a nested chat
  // newly becomes active). Do not fight an explicit user collapse.
  useEffect(() => {
    const toOpen: string[] = [];
    for (const [projectId, threads] of threadsByProject) {
      const prev = nestedCountRef.current[projectId] ?? 0;
      const grew = threads.length > prev;
      const hasActive = threads.some((thread) => thread.isActive);
      const wasActive = nestedActiveRef.current[projectId] ?? false;
      nestedCountRef.current[projectId] = threads.length;
      nestedActiveRef.current[projectId] = hasActive;

      const skip = skipAutoExpandRef.current.has(projectId);
      if (skip) {
        // Still allow expand when a brand-new nested chat appears.
        skipAutoExpandRef.current.delete(projectId);
        if (grew) toOpen.push(projectId);
        continue;
      }
      if (grew || (hasActive && !wasActive)) toOpen.push(projectId);
    }
    if (toOpen.length === 0) return;
    setCollapsedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of toOpen) {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [threadsByProject]);

  return (
    <div
      data-slot="aui_projects-section"
      className="mt-1 w-full group-data-[sidebar-mode=icon]:hidden"
    >
      <div className="mb-1 flex h-8 w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-1">
        <button
          type="button"
          className="flex h-8 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-md text-zinc-500 transition-colors hover:text-zinc-300"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse projects" : "Expand projects"}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <ChevronDownIcon className="size-3.5 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-3.5 shrink-0" />
          )}
          <h2 className="truncate text-xs font-medium leading-none tracking-wide uppercase">
            Projects
          </h2>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Browse projects"
          data-slot="aui_projects-new"
          className="size-8 shrink-0 rounded-md bg-transparent text-zinc-400 hover:bg-muted hover:text-white"
          onClick={openBrowseProjects}
        >
          <FolderIcon className="size-4 shrink-0" />
        </Button>
      </div>

      <div
        className={cn(
          "grid w-full transition-[grid-template-rows,opacity] duration-300 ease-out group-data-[sidebar-mode=icon]:hidden",
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className={cn(menuOpenId ? "overflow-visible" : "overflow-hidden")}>
          {orderedProjects.length === 0 ? (
            <button
              type="button"
              data-slot="aui_projects-empty-add"
              aria-pressed={isAddProjectActive}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-sm transition-colors hover:bg-muted hover:text-zinc-200",
                isAddProjectActive
                  ? "bg-muted text-zinc-100"
                  : "text-zinc-500",
              )}
              onClick={openCreateProject}
            >
              <PlusIcon
                className={cn(
                  "size-4 shrink-0",
                  isAddProjectActive ? "text-zinc-200" : undefined,
                )}
              />
              <span className="truncate">Add project</span>
            </button>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {orderedProjects.map((project) => {
                const { Icon } = getProjectIcon(project.icon);
                const nested = threadsByProject.get(project.id) ?? [];
                const hasActiveThread = nested.some((thread) => thread.isActive);
                // Project row lights only while Projects region is focused.
                const isProjectHighlighted =
                  sidebarHighlight === "project" &&
                  selectedId === project.id &&
                  !hasActiveThread;
                const chatsOpen =
                  nested.length > 0 && !collapsedIds.has(project.id);
                return (
                  <li
                    key={project.id}
                    className={cn(
                      "relative",
                      menuOpenId === project.id && "z-50",
                    )}
                  >
                    <div
                      className={cn(
                        "group/project relative flex h-8 w-full items-center rounded-md text-zinc-300 transition-colors hover:bg-muted hover:text-white",
                        isProjectHighlighted && "bg-muted text-white",
                      )}
                    >
                      <button
                        type="button"
                        className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 pe-8 text-sm"
                        aria-expanded={nested.length > 0 ? chatsOpen : undefined}
                        onClick={() => {
                          if (nested.length > 0) {
                            const willCollapse = !collapsedIds.has(project.id);
                            setCollapsedIds((prev) => {
                              const next = new Set(prev);
                              if (willCollapse) next.add(project.id);
                              else next.delete(project.id);
                              return next;
                            });
                            if (willCollapse) {
                              skipAutoExpandRef.current.add(project.id);
                            } else {
                              skipAutoExpandRef.current.delete(project.id);
                            }
                          }
                          // New session bound to this project (on first message).
                          aui.threads.switchToNewThread();
                          selectProject(project.id);
                        }}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            isProjectHighlighted || hasActiveThread
                              ? "text-zinc-200"
                              : "text-zinc-500",
                          )}
                        />
                        <span
                          className={cn(
                            "truncate",
                            (isProjectHighlighted || hasActiveThread) &&
                              "text-zinc-100",
                          )}
                        >
                          {project.name}
                        </span>
                      </button>
                      <ProjectOptionsMenu
                        project={project}
                        className="absolute top-1/2 right-0.5 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover/project:opacity-100 group-focus-within/project:opacity-100 has-[[aria-expanded=true]]:opacity-100"
                        triggerClassName="size-6 rounded-md"
                        onOpenChange={(open) =>
                          setMenuOpenId(open ? project.id : null)
                        }
                      />
                    </div>
                    {chatsOpen ? (
                      <ul className="mt-0.5 mb-1 ml-3 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                        {nested.map((thread) => (
                          <li key={thread.id}>
                            <div
                              className={cn(
                                "group/thread relative flex h-7 w-full items-center rounded-md transition-colors",
                                thread.isActive
                                  ? "bg-muted text-zinc-100"
                                  : "text-zinc-500 hover:bg-muted/60 hover:text-zinc-200",
                              )}
                            >
                              <button
                                type="button"
                                className="flex h-full min-w-0 flex-1 items-center rounded-md px-2 pe-7 text-xs"
                                onClick={() => {
                                  selectProject(project.id);
                                  aui.threads.switchToThread(thread.id);
                                }}
                              >
                                <span className="min-w-0 truncate">
                                  {thread.title}
                                </span>
                              </button>
                              <ProjectThreadMenu
                                threadId={thread.id}
                                title={thread.title}
                                className="absolute top-1/2 right-0 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover/thread:opacity-100 group-focus-within/thread:opacity-100 has-[[aria-expanded=true]]:opacity-100"
                                onOpenChange={(open) =>
                                  setMenuOpenId(
                                    open ? `thread:${thread.id}` : null,
                                  )
                                }
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
