"use client";

import type { FC } from "react";
import { useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { getProjectIcon } from "@/lib/project-icons";
import { useProjectsStore } from "@/lib/projects-store";

/** Project chip when this chat is actively in a project context. */
export const ComposerActiveProject: FC = () => {
  const projects = useProjectsStore((s) => s.projects);
  const threadProjects = useProjectsStore((s) => s.threadProjects);
  const selectedId = useProjectsStore((s) => s.selectedId);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const messageCount = useAuiState((s) => s.threads.main.messages.length);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const customProjectId = mainThreadId
    ? (threadItems.find((item) => item.id === mainThreadId)?.custom
        ?.projectId as string | undefined)
    : undefined;
  const boundProjectId = mainThreadId
    ? (threadProjects[mainThreadId] ?? customProjectId)
    : undefined;
  // Empty sessions keep project context via selectedId until first message binds.
  const projectId =
    boundProjectId ?? (messageCount === 0 ? selectedId : null);
  if (!projectId) return null;

  // Hide on New chat / empty unbound context once selection is cleared.
  if (messageCount === 0 && !boundProjectId && selectedId !== projectId) {
    return null;
  }

  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;

  const { Icon, className: iconClass } = getProjectIcon(project.icon);

  return (
    <span
      data-slot="aui_composer-active-project"
      className="pointer-events-none flex max-w-40 items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200"
      title={project.name}
    >
      <span
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-md",
          iconClass,
        )}
      >
        <Icon className="size-2.5" />
      </span>
      <span className="min-w-0 truncate font-medium">{project.name}</span>
    </span>
  );
};
