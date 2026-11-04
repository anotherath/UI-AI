"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FC,
  type FormEvent,
} from "react";
import {
  FileTextIcon,
  Trash2Icon,
  UploadIcon,
  ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROJECT_ICON,
  PROJECT_ICONS,
  type ProjectIconId,
} from "@/lib/project-icons";
import {
  useProjectsStore,
  type ProjectFile,
} from "@/lib/projects-store";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CreateProjectScreen: FC = () => {
  const editingId = useProjectsStore((s) => s.editingId);
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const closeCreateProject = useProjectsStore((s) => s.closeCreateProject);
  const editing = editingId
    ? (projects.find((project) => project.id === editingId) ?? null)
    : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [persona, setPersona] = useState("");
  const [icon, setIcon] = useState<ProjectIconId>(DEFAULT_PROJECT_ICON);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setPersona(editing.persona ?? "");
      setIcon(editing.icon ?? DEFAULT_PROJECT_ICON);
      setFiles(editing.files ?? []);
    } else {
      setName("");
      setDescription("");
      setPersona("");
      setIcon(DEFAULT_PROJECT_ICON);
      setFiles([]);
    }
    const id = window.requestAnimationFrame(() => nameRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [editing]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const next = Array.from(list)
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
    if (next.length === 0) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...next.filter((f) => !names.has(f.name))];
    });
  }, []);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      nameRef.current?.focus();
      return;
    }

    if (editing) {
      updateProject(editing.id, {
        name: trimmed,
        description: description.trim() || undefined,
        persona: persona.trim() || undefined,
        icon,
        files,
      });
      return;
    }

    addProject({
      name: trimmed,
      description: description.trim() || undefined,
      persona: persona.trim() || undefined,
      icon,
      files,
      status: files.length > 0 ? "embedding" : "ready",
    });
  };

  const onQuickCreate = () => {
    if (editing) return;
    addProject({
      name: name.trim() || undefined,
      icon,
      status: "ready",
    });
  };

  return (
    <div
      data-slot="aui_create-project-screen"
      className="mx-auto flex w-full max-w-[920px] flex-col pb-10"
    >
      <div className="mb-5">
        <h2 className="text-[28px] font-semibold tracking-tight text-zinc-50">
          {editing ? "Edit project" : "New project"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {editing
            ? "Update icon, name, persona, and PDF knowledge"
            : "Set up icon, name, persona, and PDF knowledge"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Icon
          </span>
          <div className="flex w-full items-stretch gap-1.5">
            {PROJECT_ICONS.map((item) => {
              const selected = item.id === icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Choose ${item.id} icon`}
                  aria-pressed={selected}
                  onClick={() => setIcon(item.id)}
                  className={cn(
                    "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-xl border transition-colors",
                    item.className,
                    selected
                      ? "border-white/40 ring-2 ring-white/20"
                      : "border-transparent hover:border-white/20",
                  )}
                >
                  <item.Icon className="size-5" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Name
          </span>
          <Input
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Legal Document Reviewer"
            className="h-11 border-white/10 bg-[#1c1c1f] text-sm text-zinc-100 placeholder:text-zinc-600"
            maxLength={80}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description of what this project is for"
            rows={3}
            maxLength={240}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#1c1c1f] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-white/25"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Persona
          </span>
          <textarea
            value={persona}
            onChange={(event) => setPersona(event.target.value)}
            placeholder="How should the assistant behave in this project?"
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#1c1c1f] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-white/25"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Knowledge (PDF)
          </span>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
              dragging
                ? "border-white/35 bg-white/[0.04] text-zinc-200"
                : "border-white/15 bg-[#18181b] text-zinc-400 hover:border-white/25 hover:bg-[#1c1c1f]",
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-[#222226]">
              <UploadIcon className="size-5" />
            </span>
            <p className="text-sm font-medium text-zinc-100">
              Drag & drop PDF files here
            </p>
            <p className="text-xs text-zinc-500">
              These files will be embedded as project knowledge
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {files.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1c1c1f] px-3 py-2.5"
                >
                  <FileTextIcon className="size-4 shrink-0 text-zinc-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatSize(file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    className="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
                    onClick={() =>
                      setFiles((prev) =>
                        prev.filter((item) => item.id !== file.id),
                      )
                    }
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-zinc-400 hover:text-white"
            onClick={closeCreateProject}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-zinc-400 hover:text-white"
              onClick={closeCreateProject}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-zinc-200"
            >
              {editing ? "Save changes" : "Create project"}
            </Button>
            {!editing ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-white/20 bg-transparent px-4 text-sm font-medium text-zinc-100 hover:bg-white/10 hover:text-white"
                onClick={onQuickCreate}
              >
                <ZapIcon className="size-3.5" />
                Quick create
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
};
