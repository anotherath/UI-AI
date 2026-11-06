"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type NotesState = {
  /** threadId → note markdown/plaintext */
  notesByThread: Record<string, string>;
  getNote: (threadId: string | null | undefined) => string;
  setNote: (threadId: string | null | undefined, content: string) => void;
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notesByThread: {},
      getNote: (threadId) => {
        if (!threadId) return "";
        return get().notesByThread[threadId] ?? "";
      },
      setNote: (threadId, content) => {
        if (!threadId) return;
        set((state) => {
          const next = { ...state.notesByThread };
          if (!content.trim()) delete next[threadId];
          else next[threadId] = content;
          return { notesByThread: next };
        });
      },
    }),
    {
      name: "ai-rag-thread-notes",
      partialize: (state) => ({ notesByThread: state.notesByThread }),
      // Drop legacy open/width fields if present in older localStorage.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<NotesState>;
        return {
          ...current,
          notesByThread: stored.notesByThread ?? {},
        };
      },
    },
  ),
);
