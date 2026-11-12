"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_PROJECT_ICON,
  type ProjectIconId,
} from "@/lib/project-icons";

export type ProjectFile = {
  id: string;
  name: string;
  size: number;
};

export type ProjectStatus = "embedding" | "ready";

export type Project = {
  id: string;
  name: string;
  description?: string;
  persona?: string;
  icon: ProjectIconId;
  files: ProjectFile[];
  status: ProjectStatus;
  createdAt: number;
};

/** Oldest created first. Legacy items without createdAt use list order (was newest-first). */
export function sortProjectsByCreated(projects: Project[]) {
  const now = Date.now();
  return projects
    .map((project, index) => ({
      project,
      createdAt: project.createdAt ?? now - index * 60_000,
    }))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(({ project, createdAt }) =>
      project.createdAt != null ? project : { ...project, createdAt },
    );
}

type CreateProjectInput = {
  name?: string;
  description?: string;
  persona?: string;
  icon?: ProjectIconId;
  files?: ProjectFile[];
  status?: ProjectStatus;
};

type ProjectPatch = {
  name?: string;
  description?: string;
  persona?: string;
  icon?: ProjectIconId;
  files?: ProjectFile[];
  status?: ProjectStatus;
};

export type SidebarHighlight = "new-chat" | "chats" | "project";

type ProjectsState = {
  projects: Project[];
  selectedId: string | null;
  /** Top "New chat" is the active sidebar highlight. */
  newChatSpotlight: boolean;
  /** Which sidebar region should show the active session highlight. */
  sidebarHighlight: SidebarHighlight;
  editingId: string | null;
  libraryProjectId: string | null;
  /** threadId → projectId */
  threadProjects: Record<string, string>;
  isBrowsing: boolean;
  isCreating: boolean;
  isLibrary: boolean;
  isImageGen: boolean;
  isSlides: boolean;
  isBuild: boolean;
  isResearch: boolean;
  addProject: (input?: string | CreateProjectInput) => Project;
  updateProject: (id: string, patch: ProjectPatch) => void;
  addProjectFiles: (id: string, files: ProjectFile[]) => void;
  removeProjectFile: (projectId: string, fileId: string) => void;
  markProjectReady: (id: string) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  /** Open a session from the CHATS list (highlight stays in CHATS). */
  openChatFromChats: (projectId: string | null) => void;
  /** Restore project id without stealing highlight from CHATS. */
  restoreProjectSelection: (id: string) => void;
  startNormalChat: () => void;
  assignThreadProject: (
    threadId: string,
    projectId: string | null,
    options?: { force?: boolean },
  ) => void;
  openCreateProject: () => void;
  openEditProject: (id: string) => void;
  closeCreateProject: () => void;
  openBrowseProjects: () => void;
  closeBrowseProjects: () => void;
  openLibrary: (projectId?: string | null) => void;
  closeLibrary: () => void;
  openImageGen: () => void;
  closeImageGen: () => void;
  openSlides: () => void;
  closeSlides: () => void;
  openBuild: () => void;
  closeBuild: () => void;
  openResearch: () => void;
  closeResearch: () => void;
};

const EMBEDDING_TIMERS = new Map<string, number>();

function scheduleEmbedding(
  id: string,
  fileCount: number,
  markReady: (id: string) => void,
) {
  const existing = EMBEDDING_TIMERS.get(id);
  if (existing) window.clearTimeout(existing);
  const delay = Math.min(8000, 1800 + fileCount * 900);
  const timer = window.setTimeout(() => {
    EMBEDDING_TIMERS.delete(id);
    markReady(id);
  }, delay);
  EMBEDDING_TIMERS.set(id, timer);
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedId: null,
      newChatSpotlight: true,
      sidebarHighlight: "new-chat",
      editingId: null,
      libraryProjectId: null,
      threadProjects: {},
      isBrowsing: false,
      isCreating: false,
      isLibrary: false,
      isImageGen: false,
      isSlides: false,
      isBuild: false,
      isResearch: false,
      addProject: (input) => {
        const payload: CreateProjectInput =
          typeof input === "string" || input == null
            ? { name: input ?? undefined }
            : input;
        const files = payload.files ?? [];
        const status =
          payload.status ?? (files.length > 0 ? "embedding" : "ready");
        const next: Project = {
          id: crypto.randomUUID(),
          name: (
            payload.name?.trim() || `Project ${get().projects.length + 1}`
          ).slice(0, 80),
          description: payload.description?.trim().slice(0, 240) || undefined,
          persona: payload.persona?.trim().slice(0, 500) || undefined,
          icon: payload.icon ?? DEFAULT_PROJECT_ICON,
          files,
          status,
          createdAt: Date.now(),
        };
        set((state) => ({
          projects: [...state.projects, next],
          selectedId: next.id,
          isBrowsing: true,
          isCreating: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
        }));
        if (status === "embedding") {
          scheduleEmbedding(next.id, files.length, (id) =>
            get().markProjectReady(id),
          );
        }
        return next;
      },
      updateProject: (id, patch) => {
        const prev = get().projects.find((project) => project.id === id);
        if (!prev) return;

        const nextFiles = patch.files ?? prev.files;
        const addedFiles =
          patch.files !== undefined &&
          patch.files.some(
            (file) => !prev.files.some((existing) => existing.id === file.id),
          );
        const nextStatus =
          patch.status ?? (addedFiles ? "embedding" : prev.status);

        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== id) return project;
            return {
              ...project,
              name:
                patch.name !== undefined
                  ? patch.name.trim().slice(0, 80) || project.name
                  : project.name,
              description:
                patch.description !== undefined
                  ? patch.description.trim().slice(0, 240) || undefined
                  : project.description,
              persona:
                patch.persona !== undefined
                  ? patch.persona.trim().slice(0, 500) || undefined
                  : project.persona,
              icon: patch.icon ?? project.icon ?? DEFAULT_PROJECT_ICON,
              files: nextFiles,
              status: nextStatus,
            };
          }),
          isBrowsing: true,
          isCreating: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
        }));

        if (nextStatus === "embedding") {
          scheduleEmbedding(id, nextFiles.length, (projectId) =>
            get().markProjectReady(projectId),
          );
        }
      },
      addProjectFiles: (id, incoming) => {
        if (incoming.length === 0) return;
        const prev = get().projects.find((project) => project.id === id);
        if (!prev) return;
        const names = new Set(prev.files.map((file) => file.name));
        const added = incoming.filter((file) => !names.has(file.name));
        if (added.length === 0) return;
        const nextFiles = [...prev.files, ...added];
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, files: nextFiles, status: "embedding" as const }
              : project,
          ),
        }));
        scheduleEmbedding(id, nextFiles.length, (projectId) =>
          get().markProjectReady(projectId),
        );
      },
      removeProjectFile: (projectId, fileId) => {
        const prev = get().projects.find((project) => project.id === projectId);
        if (!prev?.files.some((file) => file.id === fileId)) return;
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  files: project.files.filter((file) => file.id !== fileId),
                }
              : project,
          ),
        }));
      },
      markProjectReady: (id) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, status: "ready" as const }
              : project,
          ),
        })),
      removeProject: (id) => {
        const timer = EMBEDDING_TIMERS.get(id);
        if (timer) {
          window.clearTimeout(timer);
          EMBEDDING_TIMERS.delete(id);
        }
        set((state) => {
          const threadProjects = { ...state.threadProjects };
          for (const [threadId, projectId] of Object.entries(threadProjects)) {
            if (projectId === id) delete threadProjects[threadId];
          }
          return {
            projects: state.projects.filter((project) => project.id !== id),
            selectedId: state.selectedId === id ? null : state.selectedId,
            editingId: state.editingId === id ? null : state.editingId,
            libraryProjectId:
              state.libraryProjectId === id ? null : state.libraryProjectId,
            threadProjects,
          };
        });
      },
      selectProject: (id) =>
        set({
          selectedId: id,
          newChatSpotlight: false,
          sidebarHighlight: id ? "project" : "chats",
          isBrowsing: false,
          isCreating: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
        }),
      openChatFromChats: (projectId) =>
        set({
          selectedId: projectId,
          newChatSpotlight: false,
          sidebarHighlight: "chats",
          isBrowsing: false,
          isCreating: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
        }),
      restoreProjectSelection: (id) =>
        set((state) => ({
          selectedId: id,
          newChatSpotlight: false,
          // Keep CHATS highlight if user opened the session from CHATS.
          sidebarHighlight:
            state.sidebarHighlight === "chats" ? "chats" : "project",
        })),
      startNormalChat: () =>
        set({
          selectedId: null,
          newChatSpotlight: true,
          sidebarHighlight: "new-chat",
          isBrowsing: false,
          isCreating: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
        }),
      assignThreadProject: (threadId, projectId, options) => {
        if (!threadId) return;
        set((state) => {
          const current = state.threadProjects[threadId];
          // Permanent membership: never move a chat to another project.
          if (projectId != null && current && current !== projectId) {
            return state;
          }
          if (projectId == null) {
            // Allow clear only for cleanup (archive/delete/empty new chat).
            // Callers must not use this to "leave" a project with history.
            if (!(threadId in state.threadProjects)) return state;
            if (!options?.force && current) {
              // Keep binding unless explicitly forced (thread deleted).
              return state;
            }
            const next = { ...state.threadProjects };
            delete next[threadId];
            return { threadProjects: next };
          }
          if (current === projectId) return state;
          return {
            threadProjects: {
              ...state.threadProjects,
              [threadId]: projectId,
            },
          };
        });
      },
      openCreateProject: () =>
        set({
          isCreating: true,
          editingId: null,
          isBrowsing: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          // Only Add project should be lit — dim New chat + CHATS rows.
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      openEditProject: (id) =>
        set({
          isCreating: true,
          editingId: id,
          isBrowsing: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      closeCreateProject: () =>
        set({
          isCreating: false,
          editingId: null,
          isBrowsing: true,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
        }),
      openBrowseProjects: () =>
        set({
          isBrowsing: true,
          isCreating: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
          newChatSpotlight: false,
          // Top nav wins — dim project rows while browsing.
          sidebarHighlight: "new-chat",
        }),
      closeBrowseProjects: () => set({ isBrowsing: false }),
      openLibrary: (projectId = null) =>
        set({
          isLibrary: true,
          libraryProjectId: projectId ?? null,
          isBrowsing: false,
          isCreating: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          editingId: null,
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      closeLibrary: () =>
        set({
          isLibrary: false,
          libraryProjectId: null,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
        }),
      openImageGen: () =>
        set({
          isImageGen: true,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          isLibrary: false,
          libraryProjectId: null,
          isBrowsing: false,
          isCreating: false,
          editingId: null,
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      closeImageGen: () => set({ isImageGen: false }),
      openSlides: () =>
        set({
          isSlides: true,
          isBuild: false,
          isResearch: false,
          isImageGen: false,
          isLibrary: false,
          libraryProjectId: null,
          isBrowsing: false,
          isCreating: false,
          editingId: null,
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      closeSlides: () => set({ isSlides: false }),
      openBuild: () =>
        set({
          isBuild: true,
          isSlides: false,
          isImageGen: false,
          isResearch: false,
          isLibrary: false,
          libraryProjectId: null,
          isBrowsing: false,
          isCreating: false,
          editingId: null,
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      closeBuild: () => set({ isBuild: false }),
      openResearch: () =>
        set({
          isResearch: true,
          isBuild: false,
          isSlides: false,
          isImageGen: false,
          isLibrary: false,
          libraryProjectId: null,
          isBrowsing: false,
          isCreating: false,
          editingId: null,
          newChatSpotlight: false,
          sidebarHighlight: "new-chat",
        }),
      closeResearch: () => set({ isResearch: false }),
    }),
    {
      name: "ai-rag-projects",
      partialize: (state) => ({
        projects: state.projects,
        threadProjects: state.threadProjects,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<ProjectsState>;
        const now = Date.now();
        // Legacy lists were newest-first; synthesize createdAt so older
        // entries (further in the array) sort first.
        const projects = (stored.projects ?? []).map((project, index) => ({
          ...project,
          files: project.files ?? [],
          icon: project.icon ?? DEFAULT_PROJECT_ICON,
          status:
            project.status === "embedding"
              ? ("ready" as const)
              : (project.status ?? "ready"),
          createdAt: project.createdAt ?? now - index * 60_000,
        }));
        return {
          ...current,
          projects: sortProjectsByCreated(projects),
          threadProjects: stored.threadProjects ?? {},
          // Always land on New chat after refresh — never restore project selection.
          selectedId: null,
          newChatSpotlight: true,
          sidebarHighlight: "new-chat" as const,
          isCreating: false,
          isBrowsing: false,
          isLibrary: false,
          isImageGen: false,
          isSlides: false,
          isBuild: false,
          isResearch: false,
          libraryProjectId: null,
          editingId: null,
        };
      },
    },
  ),
);

export function useSelectedProject() {
  return useProjectsStore((s) => {
    if (!s.selectedId) return null;
    return s.projects.find((p) => p.id === s.selectedId) ?? null;
  });
}
