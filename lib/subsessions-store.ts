"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  deleteChatSession,
  forkChatSession,
  listChatMessages,
  listSubsessions,
  updateChatSessionTitle,
  type ChatMessage,
  type ChatSession,
} from "@/lib/chat-api";
import { getBackendSessionId } from "@/lib/chat-session-map";

export type SubsessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "complete" | "error";
  error?: string;
};

export type Subsession = {
  /** Backend subsession id, or `draft:…` until the first chat turn. */
  id: string;
  /** Local-only shell — not on the server / not shown in the list. */
  isDraft?: boolean;
  /** Local assistant-ui thread id of the parent main chat */
  parentThreadId: string;
  /** Backend main session id */
  parentSessionId: string;
  /** Main message id that anchors the fork */
  forkedFromMessageId: string;
  createdAt: number;
  title?: string;
  /** UI-only pin (backend only pins main sessions). */
  pinned?: boolean;
  messages: SubsessionMessage[];
  messagesLoaded?: boolean;
};

type OpenForkInput = {
  parentThreadId: string;
  forkedFromMessageId: string;
  forceNew?: boolean;
  title?: string | null;
};

type SubsessionsState = {
  activeId: string | null;
  byId: Record<string, Subsession>;
  pendingQuote: string | null;
  replyQueuedFor: string | null;
  isSyncing: boolean;
  syncError: string | null;
  openFork: (input: OpenForkInput) => Promise<string>;
  /** Create backend fork on first send; returns stable session id. */
  ensureBackendFork: (subsessionId: string) => Promise<string>;
  syncForParent: (parentThreadId: string) => Promise<void>;
  loadMessages: (
    subsessionId: string,
    options?: { force?: boolean },
  ) => Promise<void>;
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
  rename: (id: string, title: string) => Promise<void>;
  togglePinned: (id: string) => void;
  remove: (id: string) => Promise<void>;
  editMessage: (
    subsessionId: string,
    messageId: string,
    content: string,
  ) => void;
  /** Close pane; drop empty drafts so they never linger in the list. */
  closeActive: () => void;
};

function messageFromApi(row: ChatMessage): SubsessionMessage | null {
  if (row.role !== "user" && row.role !== "assistant") return null;
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    status: "complete",
  };
}

function fromApiSession(
  session: ChatSession,
  parentThreadId: string,
  previous?: Subsession,
): Subsession {
  const createdAt = Date.parse(session.created_at);
  return {
    id: session.id,
    isDraft: false,
    parentThreadId,
    parentSessionId: session.parent_session_id ?? previous?.parentSessionId ?? "",
    forkedFromMessageId:
      session.forked_from_message_id ?? previous?.forkedFromMessageId ?? "",
    createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
    title: session.title?.trim() || previous?.title,
    pinned: previous?.pinned,
    messages: previous?.messages ?? [],
    messagesLoaded: previous?.messagesLoaded,
  };
}

function discardEmptyDraft(
  byId: Record<string, Subsession>,
  id: string | null,
): Record<string, Subsession> {
  if (!id) return byId;
  const item = byId[id];
  if (!item?.isDraft) return byId;
  if (item.messages.length > 0) return byId;
  const { [id]: _removed, ...rest } = byId;
  void _removed;
  return rest;
}

export const useSubsessionsStore = create<SubsessionsState>()(
  persist(
    (set, get) => ({
      activeId: null,
      byId: {},
      pendingQuote: null,
      replyQueuedFor: null,
      isSyncing: false,
      syncError: null,

      openFork: async ({
        parentThreadId,
        forkedFromMessageId,
        forceNew,
        title,
      }) => {
        const parentSessionId = getBackendSessionId(parentThreadId);
        if (!parentSessionId) {
          throw new Error("Main chat is not linked to a backend session yet");
        }
        if (!forkedFromMessageId.trim()) {
          throw new Error("Missing fork message id");
        }

        if (!forceNew) {
          const existing = Object.values(get().byId).find(
            (item) =>
              !item.isDraft &&
              item.parentSessionId === parentSessionId &&
              item.forkedFromMessageId === forkedFromMessageId,
          );
          if (existing) {
            set({ activeId: existing.id });
            return existing.id;
          }
          const existingDraft = Object.values(get().byId).find(
            (item) =>
              item.isDraft &&
              item.parentSessionId === parentSessionId &&
              item.forkedFromMessageId === forkedFromMessageId,
          );
          if (existingDraft) {
            set({ activeId: existingDraft.id });
            return existingDraft.id;
          }
        }

        // Local draft only — backend fork happens on first send.
        const id = `draft:${crypto.randomUUID()}`;
        const next: Subsession = {
          id,
          isDraft: true,
          parentThreadId,
          parentSessionId,
          forkedFromMessageId,
          createdAt: Date.now(),
          title: title?.trim() || undefined,
          messages: [],
          messagesLoaded: true,
        };
        set({
          activeId: id,
          byId: { ...get().byId, [id]: next },
          syncError: null,
        });
        return id;
      },

      ensureBackendFork: async (subsessionId) => {
        const current = get().byId[subsessionId];
        if (!current) {
          throw new Error("Subsession not found");
        }
        if (!current.isDraft) return current.id;

        const session = await forkChatSession(current.parentSessionId, {
          forkedFromMessageId: current.forkedFromMessageId,
          title: current.title,
        });
        const promoted = fromApiSession(session, current.parentThreadId, {
          ...current,
          id: session.id,
          isDraft: false,
        });
        const { [subsessionId]: _draft, ...rest } = get().byId;
        void _draft;
        set({
          byId: { ...rest, [session.id]: promoted },
          activeId:
            get().activeId === subsessionId ? session.id : get().activeId,
          replyQueuedFor:
            get().replyQueuedFor === subsessionId
              ? session.id
              : get().replyQueuedFor,
          syncError: null,
        });
        return session.id;
      },

      syncForParent: async (parentThreadId) => {
        const parentSessionId = getBackendSessionId(parentThreadId);
        if (!parentSessionId) {
          set({ syncError: null });
          return;
        }
        if (get().isSyncing) return;
        set({ isSyncing: true, syncError: null });
        try {
          const rows = await listSubsessions(parentSessionId);
          const prev = get().byId;
          const next: Record<string, Subsession> = {};

          for (const [id, item] of Object.entries(prev)) {
            if (item.parentSessionId !== parentSessionId) {
              next[id] = item;
              continue;
            }
            // Keep drafts for this parent (active composer shell).
            if (item.isDraft) next[id] = item;
          }

          for (const row of rows) {
            next[row.id] = fromApiSession(row, parentThreadId, prev[row.id]);
          }

          const activeId = get().activeId;
          set({
            byId: next,
            isSyncing: false,
            activeId:
              activeId && next[activeId] ? activeId : get().activeId,
          });
        } catch (error) {
          set({
            isSyncing: false,
            syncError:
              error instanceof Error
                ? error.message
                : "Failed to sync subsessions",
          });
        }
      },

      loadMessages: async (subsessionId, options) => {
        const current = get().byId[subsessionId];
        if (!current || current.isDraft) return;
        const force = Boolean(options?.force);
        if (
          !force &&
          current.messagesLoaded &&
          !current.messages.some((m) => m.status === "streaming")
        ) {
          return;
        }
        const rows = await listChatMessages(subsessionId);
        const messages = rows
          .map(messageFromApi)
          .filter((row): row is SubsessionMessage => row !== null);
        const latest = get().byId[subsessionId];
        if (!latest || latest.isDraft) return;
        // Local streaming stubs must not block a forced hydrate (reopen / F5).
        // Non-force loads still skip while a turn is painting locally.
        if (!force && latest.messages.some((m) => m.status === "streaming")) {
          return;
        }
        set({
          byId: {
            ...get().byId,
            [subsessionId]: {
              ...latest,
              messages,
              messagesLoaded: true,
            },
          },
        });
      },

      setActive: (id) => {
        if (id === get().activeId) {
          set({ activeId: id });
          return;
        }
        const prevActive = get().activeId;
        set({
          byId: discardEmptyDraft(get().byId, prevActive),
          activeId: id,
          pendingQuote: id ? get().pendingQuote : null,
        });
      },
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
              messagesLoaded: true,
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
            [id]: { ...current, messages, messagesLoaded: true },
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

      rename: async (id, title) => {
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
        if (current.isDraft) return;
        try {
          const updated = await updateChatSessionTitle(
            id,
            nextTitle || null,
          );
          const latest = get().byId[id];
          if (!latest) return;
          set({
            byId: {
              ...get().byId,
              [id]: {
                ...latest,
                title: updated.title?.trim() || undefined,
              },
            },
          });
        } catch {
          // Optimistic title stands.
        }
      },

      togglePinned: (id) => {
        const current = get().byId[id];
        if (!current || current.isDraft) return;
        set({
          byId: {
            ...get().byId,
            [id]: { ...current, pinned: !current.pinned },
          },
        });
      },

      remove: async (id) => {
        const removed = get().byId[id];
        const { [id]: _drop, ...rest } = get().byId;
        void _drop;
        set({
          byId: rest,
          activeId: get().activeId === id ? null : get().activeId,
          pendingQuote: get().activeId === id ? null : get().pendingQuote,
        });
        if (!removed || removed.isDraft) return;
        try {
          await deleteChatSession(id);
        } catch {
          // Row already dropped locally.
        }
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

      closeActive: () => {
        const activeId = get().activeId;
        set({
          byId: discardEmptyDraft(get().byId, activeId),
          activeId: null,
          pendingQuote: null,
        });
      },
    }),
    {
      name: "ai-rag-subsessions-v2",
      partialize: (state) => ({
        // Persist backend forks only — never empty drafts.
        byId: Object.fromEntries(
          Object.entries(state.byId)
            .filter(([, item]) => !item.isDraft)
            .map(([id, item]) => [
              id,
              {
                ...item,
                messages: [],
                messagesLoaded: false,
              },
            ]),
        ),
        activeId:
          state.activeId && state.byId[state.activeId]?.isDraft
            ? null
            : state.activeId,
      }),
    },
  ),
);
