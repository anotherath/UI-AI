"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type PinnedThreadsState = {
  pinnedIds: Record<string, true>;
  isPinned: (threadId: string) => boolean;
  togglePinned: (threadId: string) => void;
  setPinned: (threadId: string, pinned: boolean) => void;
};

export const usePinnedThreadsStore = create<PinnedThreadsState>()(
  persist(
    (set, get) => ({
      pinnedIds: {},
      isPinned: (threadId) => Boolean(get().pinnedIds[threadId]),
      togglePinned: (threadId) => {
        set((state) => {
          const next = { ...state.pinnedIds };
          if (next[threadId]) delete next[threadId];
          else next[threadId] = true;
          return { pinnedIds: next };
        });
      },
      setPinned: (threadId, pinned) => {
        set((state) => {
          const next = { ...state.pinnedIds };
          if (pinned) next[threadId] = true;
          else delete next[threadId];
          return { pinnedIds: next };
        });
      },
    }),
    { name: "ai-rag-pinned-threads" },
  ),
);
