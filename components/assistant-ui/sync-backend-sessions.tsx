"use client";

import { useEffect, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useAuth } from "@/components/auth/auth-provider";
import { getChatSession, listChatMessages } from "@/lib/chat-api";
import {
  clearBackendSessionId,
  getBackendSessionId,
  getThreadIdForBackendSession,
} from "@/lib/chat-session-map";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { importChatMessagesIntoThread } from "@/lib/hydrate-thread-messages";
import { openBackendChatSession } from "@/lib/open-chat-session";
import {
  clearPendingChatRun,
  setPendingChatRun,
} from "@/lib/pending-chat-run";
import { useProjectsStore } from "@/lib/projects-store";

/**
 * Fetches the backend session list and hydrates messages for the active thread.
 * Sidebar rows come from the sessions store — threads are created lazily on open.
 */
export function SyncBackendSessions() {
  const { status } = useAuth();
  const aui = useAui();
  const fetchSessions = useChatSessionsStore((s) => s.fetchSessions);
  const sessions = useChatSessionsStore((s) => s.sessions);
  const isLoadingSessions = useChatSessionsStore((s) => s.isLoading);
  const isMessagesHydrated = useChatSessionsStore((s) => s.isMessagesHydrated);
  const markMessagesHydrated = useChatSessionsStore(
    (s) => s.markMessagesHydrated,
  );
  const titleSync = useChatSessionsStore((s) => s.titleSync);
  const clearTitleSync = useChatSessionsStore((s) => s.clearTitleSync);

  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const isThreadEmpty = useAuiState((s) => s.thread.isEmpty);
  const isThreadLoading = useAuiState((s) => s.thread.isLoading);
  const threadsLoading = useAuiState((s) => s.threads.isLoading);

  const hydratingMessagesRef = useRef<string | null>(null);
  const restoredActiveRef = useRef(false);

  // Fetch session list once authenticated.
  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchSessions();
  }, [status, fetchSessions]);

  // After refresh: reopen the last active chat (and any running background turn).
  useEffect(() => {
    if (status !== "authenticated") return;
    if (isLoadingSessions || threadsLoading) return;
    if (restoredActiveRef.current) return;
    if (useChatSessionsStore.getState().openingSessionId) return;
    if (sessions.length === 0) return;

    const activeId = useChatSessionsStore.getState().activeSessionId;
    const running = sessions.find(
      (session) =>
        session.run_status === "running" && Boolean(session.active_run_id),
    );
    const target =
      (activeId
        ? sessions.find((session) => session.id === activeId)
        : undefined) ?? running;
    if (!target) {
      restoredActiveRef.current = true;
      return;
    }

    // Only auto-open when we have a persisted selection or a live run.
    if (!activeId && !running) {
      restoredActiveRef.current = true;
      return;
    }

    restoredActiveRef.current = true;
    // Restore CHATS highlight so the row isn't treated as inactive/unread.
    useProjectsStore.getState().openChatFromChats(target.project_id);
    void openBackendChatSession(aui, target).catch(() => {
      // openBackendChatSession reports openError itself
    });
  }, [aui, isLoadingSessions, sessions, status, threadsLoading]);

  // Drop stale localStorage maps whose thread no longer exists in memory.
  // Never clear the active main thread — threadIds can lag one frame behind
  // switchToNewThread + setBackendSessionId and would wipe a fresh map.
  // Also skip while a session open is in flight (map may land before threadIds).
  useEffect(() => {
    if (status !== "authenticated" || threadsLoading) return;
    if (useChatSessionsStore.getState().openingSessionId) return;
    const liveThreadIds = new Set(threadIds);
    for (const session of sessions) {
      const mapped = getThreadIdForBackendSession(session.id);
      if (!mapped || liveThreadIds.has(mapped)) continue;
      if (mapped === mainThreadId) continue;
      if (session.id === useChatSessionsStore.getState().activeSessionId) {
        continue;
      }
      clearBackendSessionId(mapped);
    }
  }, [mainThreadId, sessions, status, threadIds, threadsLoading]);

  // Apply backend auto-title onto an already-open local thread (sidebar uses store).
  useEffect(() => {
    if (!titleSync) return;
    const threadId = getThreadIdForBackendSession(titleSync.sessionId);
    const live =
      threadId != null &&
      aui.threads.getState().threadIds.includes(threadId);

    if (!live || !threadId) {
      clearTitleSync(titleSync.at);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await aui.threads.item({ id: threadId }).rename(titleSync.title);
      } catch {
        // Title is best-effort for the local runtime.
      } finally {
        if (!cancelled) clearTitleSync(titleSync.at);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aui, clearTitleSync, titleSync]);

  // Backup hydrate for already-mapped empty threads. Click path owns the
  // open lock — never clear openingSessionId from here (that aborted hydrates).
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!mainThreadId || isThreadLoading || threadsLoading) return;
    if (!isThreadEmpty) return;

    const sessionId = getBackendSessionId(mainThreadId);
    if (!sessionId) return;
    // Any click-open in flight — leave hydration to openBackendChatSession.
    if (useChatSessionsStore.getState().openingSessionId) return;
    if (isMessagesHydrated(sessionId)) return;
    if (hydratingMessagesRef.current === sessionId) return;

    let cancelled = false;
    hydratingMessagesRef.current = sessionId;

    void (async () => {
      try {
        const messages = await listChatMessages(sessionId);
        if (cancelled) return;
        if (aui.threads.getState().mainThreadId !== mainThreadId) return;
        if (aui.thread.getState().messages.length > 0) {
          markMessagesHydrated(sessionId);
          return;
        }

        importChatMessagesIntoThread(aui.thread, sessionId, messages);
        markMessagesHydrated(sessionId);

        try {
          const fresh = await getChatSession(sessionId);
          useChatSessionsStore.getState().upsertSession(fresh);
          if (fresh.run_status === "running" && fresh.active_run_id) {
            setPendingChatRun(sessionId, fresh.active_run_id);
          } else {
            clearPendingChatRun(sessionId);
          }
        } catch {
          // best-effort pending bind
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        useChatSessionsStore.getState().setOpenError({
          sessionId,
          code: "BACKUP_HYDRATE_FAILED",
          message: `BACKUP_HYDRATE_FAILED: ${message} (session=${sessionId})`,
          at: Date.now(),
        });
      } finally {
        if (hydratingMessagesRef.current === sessionId) {
          hydratingMessagesRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    aui,
    isMessagesHydrated,
    isThreadEmpty,
    isThreadLoading,
    mainThreadId,
    markMessagesHydrated,
    status,
    threadsLoading,
  ]);

  return null;
}
