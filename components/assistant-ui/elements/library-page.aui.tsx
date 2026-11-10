"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FC,
} from "react";
import {
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProjectIcon } from "@/lib/project-icons";
import {
  sortProjectsByCreated,
  useProjectsStore,
  type Project,
  type ProjectFile,
} from "@/lib/projects-store";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const LibraryFileCard: FC<{
  file: ProjectFile;
  onRemove: () => void;
}> = ({ file, onRemove }) => (
  <div className="group/file relative flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#1c1c1f] px-3.5 py-3 pr-10 transition-colors hover:border-white/14 hover:bg-[#222226]">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-300">
      <FileTextIcon className="size-5" strokeWidth={1.75} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium tracking-tight text-zinc-100">
        {file.name}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-500">
        {formatSize(file.size)}
      </p>
    </div>
    <button
      type="button"
      aria-label={`Delete ${file.name}`}
      className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-zinc-200 group-hover/file:opacity-100 focus-visible:opacity-100"
      onClick={onRemove}
    >
      <Trash2Icon className="size-3.5" />
    </button>
  </div>
);

function toProjectFiles(list: FileList | File[]): ProjectFile[] {
  return Array.from(list)
    .filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    )
    .map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
    }));
}

export const LibraryPage: FC = () => {
  const projects = useProjectsStore((s) => s.projects);
  const orderedProjects = useMemo(
    () => sortProjectsByCreated(projects),
    [projects],
  );
  const libraryProjectId = useProjectsStore((s) => s.libraryProjectId);
  const openLibrary = useProjectsStore((s) => s.openLibrary);
  const addProjectFiles = useProjectsStore((s) => s.addProjectFiles);
  const removeProjectFile = useProjectsStore((s) => s.removeProjectFile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const scoped = useMemo(() => {
    if (!libraryProjectId) return projects;
    return projects.filter((project) => project.id === libraryProjectId);
  }, [projects, libraryProjectId]);

  const grouped = useMemo(
    () =>
      sortProjectsByCreated(scoped)
        .map((project) => ({
          project,
          files: project.files ?? [],
        }))
        .filter((group) => group.files.length > 0 || Boolean(libraryProjectId)),
    [scoped, libraryProjectId],
  );

  const totalCount = useMemo(
    () =>
      projects.reduce((sum, project) => sum + (project.files?.length ?? 0), 0),
    [projects],
  );
  const showGrouped = !libraryProjectId;
  const hasFiles = grouped.some((group) => group.files.length > 0);

  const activeProject = libraryProjectId
    ? (projects.find((project) => project.id === libraryProjectId) ?? null)
    : null;
  const canAdd = Boolean(activeProject);

  const ingestFiles = useCallback(
    (list: FileList | File[]) => {
      if (!libraryProjectId) return;
      const next = toProjectFiles(list);
      if (next.length === 0) return;
      addProjectFiles(libraryProjectId, next);
    },
    [addProjectFiles, libraryProjectId],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!canAdd) return;
    if (event.dataTransfer.files?.length) ingestFiles(event.dataTransfer.files);
  };

  return (
    <div
      data-slot="aui_library-page"
      className="mx-auto flex w-full max-w-[920px] flex-col pb-10"
      onDragEnter={(event) => {
        if (!canAdd) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!canAdd) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!canAdd) return;
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight text-zinc-50">
              Library
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {activeProject
                ? `PDFs in ${activeProject.name}`
                : `${totalCount} PDF${totalCount === 1 ? "" : "s"}`}
            </p>
          </div>
          {canAdd ? (
            <>
              <Button
                type="button"
                className="h-9 rounded-full bg-white px-4 text-sm font-medium text-black hover:bg-zinc-200"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon className="size-3.5" />
                Add PDF
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) ingestFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </>
          ) : null}
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Library filters"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!libraryProjectId}
            onClick={() => openLibrary(null)}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition-colors",
              !libraryProjectId
                ? "border-white/25 bg-white/10 text-zinc-100"
                : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-zinc-200",
            )}
          >
            All
          </button>
          {orderedProjects.map((project) => {
            const active = libraryProjectId === project.id;
            const { Icon, className: iconClass } = getProjectIcon(project.icon);
            return (
              <button
                key={project.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => openLibrary(project.id)}
                className={cn(
                  "inline-flex h-8 max-w-48 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  active
                    ? "border-white/25 bg-white/10 text-zinc-100"
                    : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-zinc-200",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-md",
                    iconClass,
                  )}
                >
                  <Icon className="size-2.5" />
                </span>
                <span className="min-w-0 truncate">{project.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {canAdd && dragging ? (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/35 bg-white/[0.04] px-4 py-8 text-sm text-zinc-200">
          <UploadIcon className="size-4 shrink-0" />
          Drop PDF files to add to {activeProject?.name}
        </div>
      ) : null}

      {!hasFiles ? (
        <div
          role={canAdd ? "button" : undefined}
          tabIndex={canAdd ? 0 : undefined}
          onClick={canAdd ? () => fileInputRef.current?.click() : undefined}
          onKeyDown={
            canAdd
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }
              : undefined
          }
          className={cn(
            "mt-6 flex w-full flex-col items-center rounded-2xl border border-dashed px-8 py-20 text-center transition-colors",
            canAdd
              ? dragging
                ? "cursor-pointer border-white/35 bg-white/[0.04] text-zinc-200"
                : "cursor-pointer border-white/15 bg-[#18181b] text-zinc-400 hover:border-white/25 hover:bg-[#1c1c1f]"
              : "mx-auto max-w-md border-transparent",
          )}
        >
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-400 ring-1 ring-white/10">
            {canAdd ? (
              <UploadIcon className="size-6" strokeWidth={1.5} />
            ) : (
              <FileTextIcon className="size-6" strokeWidth={1.5} />
            )}
          </span>
          <p className="text-xl font-medium tracking-tight text-zinc-100">
            {canAdd ? "Add PDF knowledge" : "No documents yet"}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            {canAdd
              ? "Click to browse or drag & drop PDF files here."
              : "Select a project above, then add PDFs as shared knowledge."}
          </p>
        </div>
      ) : showGrouped ? (
        <div className="flex flex-col gap-8">
          {grouped.map(({ project, files }) => {
            const { Icon, className: iconClass } = getProjectIcon(project.icon);
            return (
              <section key={project.id} className="flex flex-col gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
                      iconClass,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <h3 className="min-w-0 truncate text-sm font-medium tracking-tight text-zinc-100">
                    {project.name}
                  </h3>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {files.length} PDF{files.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <LibraryFileCard
                      key={file.id}
                      file={file}
                      onRemove={() => removeProjectFile(project.id, file.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.flatMap(({ project, files }) =>
            files.map((file) => (
              <LibraryFileCard
                key={file.id}
                file={file}
                onRemove={() => removeProjectFile(project.id, file.id)}
              />
            )),
          )}
        </div>
      )}
    </div>
  );
};
