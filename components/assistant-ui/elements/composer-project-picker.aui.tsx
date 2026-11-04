"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { FolderIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import {
  sortProjectsByCreated,
  useProjectsStore,
} from "@/lib/projects-store";

const MAX_VISIBLE = 4;

const pillClass = (active?: boolean) =>
  cn(
    "inline-flex h-7 max-w-36 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
    active
      ? "border-white/25 bg-white/10 text-zinc-100"
      : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-zinc-200",
  );

export const ComposerProjectPicker: FC = () => {
  const projects = useProjectsStore((s) => s.projects);
  const selectedId = useProjectsStore((s) => s.selectedId);
  const threadProjects = useProjectsStore((s) => s.threadProjects);
  const selectProject = useProjectsStore((s) => s.selectProject);
  const openCreateProject = useProjectsStore((s) => s.openCreateProject);

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
  // After the first message, project membership is frozen forever.
  const locked = messageCount > 0;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const orderedProjects = useMemo(
    () => sortProjectsByCreated(projects),
    [projects],
  );

  const visible = useMemo(() => {
    const selected = orderedProjects.find((project) => project.id === selectedId);
    const rest = orderedProjects.filter((project) => project.id !== selectedId);
    const base = selected ? [selected, ...rest] : rest;
    return base.slice(0, MAX_VISIBLE);
  }, [orderedProjects, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedProjects;
    return orderedProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q),
    );
  }, [orderedProjects, query]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setQuery("");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

  const showSearch = projects.length > MAX_VISIBLE;

  useEffect(() => {
    if ((!showSearch || locked) && searchOpen) {
      setSearchOpen(false);
      setQuery("");
    }
  }, [showSearch, searchOpen, locked]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [searchOpen]);

  // Locked chats show the project name inside the composer action bar instead.
  if (locked) return null;

  return (
    <div
      ref={rootRef}
      data-slot="aui_composer-project-picker"
      className="relative flex w-full flex-nowrap items-center justify-center gap-1.5 px-0.5"
      role="listbox"
      aria-label="Projects"
    >
      {visible.map((project) => {
        const active = project.id === selectedId;
        const embedding = project.status === "embedding";
        return (
          <button
            key={project.id}
            type="button"
            role="option"
            aria-selected={active}
            disabled={embedding}
            onClick={() => selectProject(active ? null : project.id)}
            className={cn(
              pillClass(active),
              "disabled:cursor-wait disabled:opacity-60",
            )}
          >
            <FolderIcon className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{project.name}</span>
          </button>
        );
      })}

      {showSearch ? (
        <div className="relative shrink-0">
          {searchOpen ? (
            <label
              className={cn(
                pillClass(true),
                "min-w-40 max-w-52 gap-1.5 pr-2.5 focus-within:border-white/25",
              )}
            >
              <SearchIcon className="size-3.5 shrink-0 opacity-70" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
                aria-label="Search projects"
              />
            </label>
          ) : (
            <button
              type="button"
              aria-label="Search projects"
              aria-expanded={false}
              onClick={() => setSearchOpen(true)}
              className={pillClass()}
            >
              <SearchIcon className="size-3.5 shrink-0" />
              <span>Search</span>
            </button>
          )}

          {searchOpen ? (
            <div
              role="listbox"
              aria-label="Search results"
              className="absolute bottom-[calc(100%+8px)] left-0 z-50 max-h-56 w-64 overflow-y-auto rounded-xl border border-white/10 bg-[#1c1c1f] p-1 shadow-2xl"
            >
              {filtered.length === 0 ? (
                <p className="px-2.5 py-2 text-sm text-zinc-500">No projects</p>
              ) : (
                filtered.map((project) => {
                  const active = project.id === selectedId;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white",
                      )}
                      onClick={() => {
                        selectProject(project.id);
                        setSearchOpen(false);
                        setQuery("");
                      }}
                    >
                      <FolderIcon className="size-3.5 shrink-0 text-zinc-500" />
                      <span className="min-w-0 flex-1 truncate">
                        {project.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={openCreateProject}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-white/15 bg-transparent px-2.5 text-xs text-zinc-500 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-zinc-300"
      >
        <PlusIcon className="size-3.5 shrink-0" />
        <span>Add</span>
      </button>
    </div>
  );
};
