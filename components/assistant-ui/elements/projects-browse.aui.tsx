"use client";

import { useMemo, type FC } from "react";
import {
  FolderIcon,
  LoaderCircleIcon,
  PlusIcon,
} from "lucide-react";
import { useAui } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { getProjectIcon } from "@/lib/project-icons";
import {
  sortProjectsByCreated,
  useProjectsStore,
  type Project,
} from "@/lib/projects-store";
import { ProjectOptionsMenu } from "@/components/assistant-ui/elements/project-options-menu.aui";

const UserProjectCard: FC<{
  project: Project;
  onSelect: () => void;
}> = ({ project, onSelect }) => {
  const { Icon, className: iconClass } = getProjectIcon(project.icon);
  const embedding = project.status === "embedding";

  return (
    <div
      className={cn(
        "group/card relative rounded-2xl border border-white/[0.07] bg-[#1c1c1f] transition-colors hover:border-white/14 hover:bg-[#222226]",
        embedding && "border-white/15",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={embedding}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 pr-10 text-left disabled:cursor-wait"
      >
        <span
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          )}
        >
          {embedding ? (
            <LoaderCircleIcon className="size-5 animate-spin text-current" />
          ) : (
            <Icon className="size-6" strokeWidth={1.75} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block min-w-0 truncate text-[15px] font-medium tracking-tight text-zinc-100">
              {project.name}
            </span>
            {embedding ? (
              <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
                Embedding
              </span>
            ) : null}
          </span>
          <span className="mt-1 block line-clamp-2 text-sm leading-snug text-zinc-500">
            {embedding
              ? (project.files?.length ?? 0) > 0
                ? `Indexing ${project.files.length} PDF${project.files.length === 1 ? "" : "s"}…`
                : "Initializing project knowledge…"
              : project.description || "No description yet"}
          </span>
        </span>
      </button>
      {!embedding ? (
        <ProjectOptionsMenu
          project={project}
          className="absolute top-1/2 right-2 z-10 -translate-y-1/2"
        />
      ) : null}
      {embedding ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-2 h-0.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-white/35" />
        </div>
      ) : null}
    </div>
  );
};

export const ProjectsBrowse: FC = () => {
  const aui = useAui();
  const projects = useProjectsStore((s) => s.projects);
  const orderedProjects = useMemo(
    () => sortProjectsByCreated(projects),
    [projects],
  );
  const selectProject = useProjectsStore((s) => s.selectProject);
  const openCreateProject = useProjectsStore((s) => s.openCreateProject);
  const empty = orderedProjects.length === 0;

  const openProject = (projectId: string) => {
    aui.threads.switchToNewThread();
    selectProject(projectId);
  };

  return (
    <div
      data-slot="aui_projects-browse"
      className="mx-auto flex w-full max-w-[920px] flex-col"
    >
      <div className="mb-5">
        <h2 className="text-[28px] font-semibold tracking-tight text-zinc-50">
          Projects
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>
      </div>

      <button
        type="button"
        onClick={openCreateProject}
        className="mb-5 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#18181b] px-6 py-14 text-zinc-400 transition-colors hover:border-white/25 hover:bg-[#1c1c1f] hover:text-zinc-200"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-[#222226]">
          <PlusIcon className="size-5" />
        </span>
        <span className="text-base font-medium text-zinc-100">Add project</span>
        <span className="max-w-md text-center text-sm text-zinc-500">
          Create a project to group related chats and shared context
        </span>
      </button>

      {empty ? (
        <div className="mx-auto mt-10 flex w-full max-w-sm flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-400 ring-1 ring-white/10">
            <FolderIcon className="size-5" strokeWidth={1.5} />
          </span>
          <p className="text-lg font-medium tracking-tight text-zinc-100">
            No projects yet
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            Create a project to group related chats and shared context.
          </p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {orderedProjects.map((project) => (
            <UserProjectCard
              key={project.id}
              project={project}
              onSelect={() => openProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
