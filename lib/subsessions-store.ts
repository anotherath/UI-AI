"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SubsessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete" | "error";
  error?: string;
};

export type Subsession = {
  id: string;
  /** Main session thread this fork belongs to */
  parentThreadId: string;
  /** Message count on main at fork time (inheritance cutoff) */
  forkAtCount: number;
  createdAt: number;
  /** Optional display title — falls back to first user message. */
  title?: string;
  pinned?: boolean;
  /** Messages after the fork — independent of main */
  messages: SubsessionMessage[];
};

type SubsessionsState = {
  /** Active open subsession id (right pane chat), if any */
  activeId: string | null;
  byId: Record<string, Subsession>;
  /** Quoted main-thread selection waiting to be asked in the fork */
  pendingQuote: string | null;
  /** Subsession id that should auto-run an assistant reply once chat mounts. */
  replyQueuedFor: string | null;
  /** Open or create a fork from the main session at a message cutoff. */
  openFork: (
    parentThreadId: string,
    forkAtCount: number,
    options?: { forceNew?: boolean },
  ) => string;
  setActive: (id: string | null) => void;
  setPendingQuote: (quote: string | null) => void;
  queueReply: (id: string) => void;
  clearReplyQueue: () => void;
  appendMessage: (id: string, message: SubsessionMessage) => void;
  setMessages: (id: string, messages: SubsessionMessage[]) => void;
  patchMessage: (
    subsessionId: string,
    messageId: string,
    patch: Partial<Omit<SubsessionMessage, "id">>,
  ) => void;
  rename: (id: string, title: string) => void;
  togglePinned: (id: string) => void;
  remove: (id: string) => void;
  /** Update a message and drop everything after it (edit-and-resend). */
  editMessage: (
    subsessionId: string,
    messageId: string,
    content: string,
  ) => void;
  closeActive: () => void;
};

export const useSubsessionsStore = create<SubsessionsState>()(
  persist(
    (set, get) => ({
      activeId: null,
      byId: {},
      pendingQuote: null,
      replyQueuedFor: null,
      openFork: (parentThreadId, forkAtCount, options) => {
        if (!options?.forceNew) {
          const existing = Object.values(get().byId).find(
            (item) =>
              item.parentThreadId === parentThreadId &&
              item.forkAtCount === forkAtCount,
          );
          if (existing) {
            set({ activeId: existing.id });
            return existing.id;
          }
        }
        const id = crypto.randomUUID();
        const next: Subsession = {
          id,
          parentThreadId,
          forkAtCount,
          createdAt: Date.now(),
          messages: [],
        };
        set({
          activeId: id,
          byId: { ...get().byId, [id]: next },
        });
        return id;
      },
      setActive: (id) => set({ activeId: id }),
      setPendingQuote: (quote) => set({ pendingQuote: quote }),
      queueReply: (id) => set({ replyQueuedFor: id }),
      clearReplyQueue: () => set({ replyQueuedFor: null }),
      appendMessage: (id, message) => {
        const current = get().byId[id];
        if (!current) return;
        set({
          byId: {
            ...get().byId,
            [id]: {
              ...current,
              messages: [...current.messages, message],
            },
          },
        });
      },
      setMessages: (id, messages) => {
        const current = get().byId[id];
        if (!current) return;
        set({
          byId: {
            ...get().byId,
            [id]: { ...current, messages },
          },
        });
      },
      patchMessage: (subsessionId, messageId, patch) => {
        const current = get().byId[subsessionId];
        if (!current) return;
        const index = current.messages.findIndex(
          (message) => message.id === messageId,
        );
        if (index < 0) return;
        const messages = current.messages.slice();
        messages[index] = { ...messages[index], ...patch };
        set({
          byId: {
            ...get().byId,
            [subsessionId]: { ...current, messages },
          },
        });
      },
      rename: (id, title) => {
        const current = get().byId[id];
        if (!current) return;
        const nextTitle = title.replace(/\s+/g, " ").trim();
        set({
          byId: {
            ...get().byId,
            [id]: {
              ...current,
              title: nextTitle || undefined,
            },
          },
        });
      },
      togglePinned: (id) => {
        const current = get().byId[id];
        if (!current) return;
        set({
          byId: {
            ...get().byId,
            [id]: { ...current, pinned: !current.pinned },
          },
        });
      },
      remove: (id) => {
        const { [id]: _removed, ...rest } = get().byId;
        void _removed;
        set({
          byId: rest,
          activeId: get().activeId === id ? null : get().activeId,
          pendingQuote: get().activeId === id ? null : get().pendingQuote,
        });
      },
      editMessage: (subsessionId, messageId, content) => {
        const current = get().byId[subsessionId];
        if (!current) return;
        const index = current.messages.findIndex(
          (message) => message.id === messageId,
        );
        if (index < 0) return;
        const edited = {
          ...current.messages[index],
          content,
        };
        set({
          byId: {
            ...get().byId,
            [subsessionId]: {
              ...current,
              messages: [...current.messages.slice(0, index), edited],
            },
          },
        });
      },
      closeActive: () => set({ activeId: null, pendingQuote: null }),
    }),
    {
      name: "ai-rag-subsessions",
      partialize: (state) => ({
        byId: state.byId,
        activeId: state.activeId,
      }),
    },
  ),
);
