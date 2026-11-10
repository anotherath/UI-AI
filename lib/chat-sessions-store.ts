"use client";

import { create } from "zustand";
import {
  CHAT_SESSION_PAGE_SIZE,
  listChatSessions,
  type ChatSession,
} from "@/lib/chat-api";

const ACTIVE_SESSION_STORAGE_KEY = "aui.active-chat-session-id";

function readPersistedActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writePersistedActiveSessionId(sessionId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionId) sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    else sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

type TitleSync = {
  sessionId: string;
  title: string;
  at: number;
};

export type SessionOpenError = {
  sessionId: string;
  /** Short machine-readable code for debugging. */
  code: string;
  /** Human-readable reason shown in the UI. */
  message: string;
  at: number;
};

/** Normalize API payloads that may omit pin / run fields before migration. */
export function normalizeChatSession(
  session: ChatSession | (Omit<ChatSession, "is_pinned" | "pinned_at"> & {
    is_pinned?: boolean;
    pinned_at?: string | null;
  }),
): ChatSession {
  return {
    ...session,
    is_pinned: Boolean(session.is_pinned),
    pinned_at: session.pinned_at ?? null,
    run_status: session.run_status ?? "idle",
    active_run_id: session.active_run_id ?? null,
    last_read_at: session.last_read_at ?? null,
    last_message_at: session.last_message_at ?? null,
    has_unread: Boolean(session.has_unread),
  };
}

/** Activity timestamp for CHATS ordering (message time, else updated_at). */
export function sessionActivityAt(session: ChatSession): string {
  return session.last_message_at || session.updated_at || session.created_at;
}

export function sortSessionsByPinThenUpdated(
  a: ChatSession,
  b: ChatSession,
): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
  if (a.is_pinned && b.is_pinned) {
    return (b.pinned_at ?? "").localeCompare(a.pinned_at ?? "");
  }
  return sessionActivityAt(b).localeCompare(sessionActivityAt(a));
}

type ChatSessionsState = {
  sessions: ChatSession[];
  isLoading: boolean;
  isLoadingMore: boolean;
  /** More main sessions available beyond the loaded pages. */
  hasMore: boolean;
  /** Next offset for GET /chat/sessions pagination. */
  nextOffset: number;
  total: number;
  error: string | null;
  /** Session ids whose messages were already hydrated into the local thread. */
  hydratedMessageSessionIds: Record<string, true>;
  /** Session the user is opening — suppresses New Chat welcome until hydrate ends. */
  openingSessionId: string | null;
  /** Sidebar selection — set on click, kept after hydrate (unlike openingSessionId). */
  activeSessionId: string | null;
  /** Last failure while opening/hydrating a session (shown in the thread pane). */
  openError: SessionOpenError | null;
  /** Latest remote title (SSE auto-title / PATCH) for the sidebar to apply. */
  titleSync: TitleSync | null;
  setSessions: (sessions: ChatSession[]) => void;
  upsertSession: (session: ChatSession) => void;
  removeSession: (sessionId: string) => void;
  applyRemoteTitle: (sessionId: string, title: string) => void;
  /** Bump last_message_at so CHATS re-sorts without waiting for a refetch. */
  touchSession: (sessionId: string) => void;
  /** Select a session in CHATS without opening/hydrate (e.g. first send from New chat). */
  setActiveSession: (sessionId: string) => void;
  beginOpeningSession: (sessionId: string) => void;
  endOpeningSession: (sessionId?: string | null) => void;
  clearActiveSession: () => void;
  setOpenError: (error: SessionOpenError) => void;
  clearOpenError: (sessionId?: string | null) => void;
  clearTitleSync: (at: number) => void;
  markMessagesHydrated: (sessionId: string) => void;
  clearMessagesHydrated: (sessionId: string) => void;
  isMessagesHydrated: (sessionId: string) => boolean;
  /** First page of main sessions (sidebar). Messages load per click. */
  fetchSessions: () => Promise<void>;
  /** Append the next page of main sessions. */
  fetchMoreSessions: () => Promise<void>;
};

export const useChatSessionsStore = create<ChatSessionsState>((set, get) => ({
  sessions: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  nextOffset: 0,
  total: 0,
  error: null,
  hydratedMessageSessionIds: {},
  openingSessionId: null,
  activeSessionId: readPersistedActiveSessionId(),
  openError: null,
  titleSync: null,
  setSessions: (sessions) =>
    set({
      sessions: sessions
        .map(normalizeChatSession)
        .sort(sortSessionsByPinThenUpdated),
      error: null,
    }),
  upsertSession: (session) =>
    set((state) => {
      const next = normalizeChatSession(session);
      const without = state.sessions.filter((item) => item.id !== next.id);
      return {
        sessions: [next, ...without].sort(sortSessionsByPinThenUpdated),
      };
    }),
  removeSession: (sessionId) =>
    set((state) => {
      const nextActive =
        state.activeSessionId === sessionId ? null : state.activeSessionId;
      if (state.activeSessionId === sessionId) {
        writePersistedActiveSessionId(null);
      }
      return {
        sessions: state.sessions.filter((item) => item.id !== sessionId),
        hydratedMessageSessionIds: Object.fromEntries(
          Object.entries(state.hydratedMessageSessionIds).filter(
            ([id]) => id !== sessionId,
          ),
        ),
        activeSessionId: nextActive,
        openingSessionId:
          state.openingSessionId === sessionId ? null : state.openingSessionId,
      };
    }),
  applyRemoteTitle: (sessionId, title) =>
    set((state) => {
      const existing = state.sessions.find((item) => item.id === sessionId);
      const now = new Date().toISOString();
      // Title sync must not bump last_message_at (would reorder CHATS).
      const nextSession: ChatSession = existing
        ? {
            ...existing,
            title,
            updated_at: now,
          }
        : {
            id: sessionId,
            project_id: null,
            title,
            is_main: true,
            is_pinned: false,
            pinned_at: null,
            last_message_at: null,
            parent_session_id: null,
            forked_from_message_id: null,
            created_at: now,
            updated_at: now,
          };
      const without = state.sessions.filter((item) => item.id !== sessionId);
      return {
        sessions: [nextSession, ...without].sort(sortSessionsByPinThenUpdated),
        titleSync: { sessionId, title, at: Date.now() },
      };
    }),
  touchSession: (sessionId) =>
    set((state) => {
      const existing = state.sessions.find((item) => item.id === sessionId);
      if (!existing) return state;
      const now = new Date().toISOString();
      const nextSession: ChatSession = {
        ...existing,
        last_message_at: now,
        updated_at: now,
      };
      const without = state.sessions.filter((item) => item.id !== sessionId);
      return {
        sessions: [nextSession, ...without].sort(sortSessionsByPinThenUpdated),
      };
    }),
  setActiveSession: (sessionId) => {
    writePersistedActiveSessionId(sessionId);
    set({ activeSessionId: sessionId });
  },
  beginOpeningSession: (sessionId) =>
    set((state) => {
      writePersistedActiveSessionId(sessionId);
      const nextHydrated = { ...state.hydratedMessageSessionIds };
      delete nextHydrated[sessionId];
      return {
        openingSessionId: sessionId,
        activeSessionId: sessionId,
        hydratedMessageSessionIds: nextHydrated,
        openError:
          state.openError?.sessionId === sessionId ? null : state.openError,
      };
    }),
  endOpeningSession: (sessionId) =>
    set((state) => {
      if (
        sessionId != null &&
        state.openingSessionId != null &&
        state.openingSessionId !== sessionId
      ) {
        return state;
      }
      return { openingSessionId: null };
    }),
  clearActiveSession: () => {
    writePersistedActiveSessionId(null);
    set({ activeSessionId: null, openingSessionId: null, openError: null });
  },
  setOpenError: (error) => set({ openError: error, openingSessionId: null }),
  clearOpenError: (sessionId) =>
    set((state) => {
      if (
        sessionId != null &&
        state.openError != null &&
        state.openError.sessionId !== sessionId
      ) {
        return state;
      }
      return { openError: null };
    }),
  clearTitleSync: (at) =>
    set((state) =>
      state.titleSync?.at === at ? { titleSync: null } : state,
    ),
  markMessagesHydrated: (sessionId) =>
    set((state) => ({
      hydratedMessageSessionIds: {
        ...state.hydratedMessageSessionIds,
        [sessionId]: true,
      },
      // Keep activeSessionId — only clear the in-flight loading flag.
      openingSessionId:
        state.openingSessionId === sessionId ? null : state.openingSessionId,
      openError:
        state.openError?.sessionId === sessionId ? null : state.openError,
    })),
  clearMessagesHydrated: (sessionId) =>
    set((state) => {
      if (!state.hydratedMessageSessionIds[sessionId]) return state;
      const next = { ...state.hydratedMessageSessionIds };
      delete next[sessionId];
      return { hydratedMessageSessionIds: next };
    }),
  isMessagesHydrated: (sessionId) =>
    Boolean(get().hydratedMessageSessionIds[sessionId]),
  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const page = await listChatSessions({
        limit: CHAT_SESSION_PAGE_SIZE,
        offset: 0,
      });
      set({
        sessions: page.items
          .map(normalizeChatSession)
          .sort(sortSessionsByPinThenUpdated),
        hasMore: page.has_more,
        nextOffset: page.offset + page.items.length,
        total: page.total,
        isLoading: false,
        isLoadingMore: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  fetchMoreSessions: async () => {
    const { hasMore, isLoadingMore, isLoading, nextOffset } = get();
    if (!hasMore || isLoadingMore || isLoading) return;
    set({ isLoadingMore: true, error: null });
    try {
      const page = await listChatSessions({
        limit: CHAT_SESSION_PAGE_SIZE,
        offset: nextOffset,
      });
      set((state) => {
        const byId = new Map(
          state.sessions.map((session) => [session.id, session]),
        );
        for (const item of page.items) {
          byId.set(item.id, normalizeChatSession(item));
        }
        return {
          sessions: [...byId.values()].sort(sortSessionsByPinThenUpdated),
          hasMore: page.has_more,
          nextOffset: page.offset + page.items.length,
          total: page.total,
          isLoadingMore: false,
        };
      });
    } catch (error) {
      set({
        isLoadingMore: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));
