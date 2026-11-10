"use client";

import type { useAui } from "@assistant-ui/react";
import {
  getChatSession,
  listChatMessages,
  markChatSessionRead,
  type ChatSession,
} from "@/lib/chat-api";
import {
  getBackendSessionId,
  getThreadIdForBackendSession,
  setBackendSessionId,
} from "@/lib/chat-session-map";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { importChatMessagesIntoThread } from "@/lib/hydrate-thread-messages";
import {
  clearPendingChatRun,
  setPendingChatRun,
} from "@/lib/pending-chat-run";
import { useProjectsStore } from "@/lib/projects-store";

type Aui = ReturnType<typeof useAui>;

/** Latest click wins; older queued opens no-op when they start. */
let latestOpenRequestId = 0;
/** Serialize opens so switchToNewThread cannot interleave. */
let openChain: Promise<unknown> = Promise.resolve();

function isLatest(requestId: number): boolean {
  return requestId === latestOpenRequestId;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function reportOpenError(
  sessionId: string,
  code: string,
  message: string,
): void {
  useChatSessionsStore.getState().setOpenError({
    sessionId,
    code,
    message,
    at: Date.now(),
  });
}

function sleepFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * InMemoryThreadList applies switchTo* via React setState — getState() can
 * still return the previous mainThreadId until the next commit. Poll until
 * main matches `expectedId`, or (for new threads) until main leaves `fromId`.
 */
async function waitForMainThread(
  aui: Aui,
  options: {
    expectedId?: string;
    fromId?: string | null;
    previousThreadIds?: Set<string>;
    timeoutMs?: number;
  },
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 2000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const state = aui.threads.getState();
    const mainId = state.mainThreadId;

    if (options.expectedId) {
      if (mainId === options.expectedId) return mainId;
    } else if (mainId && mainId !== options.fromId) {
      return mainId;
    } else if (options.previousThreadIds && mainId) {
      const ids = state.threadIds;
      const created = ids.find((id) => !options.previousThreadIds!.has(id));
      if (created && mainId === created) return mainId;
    }

    await sleepFrame();
  }

  const fallback = aui.threads.getState().mainThreadId;
  if (options.expectedId && fallback === options.expectedId) {
    return fallback;
  }
  if (!options.expectedId && fallback && fallback !== options.fromId) {
    return fallback;
  }
  throw new Error(
    `THREAD_SWITCH_TIMEOUT: mainThreadId did not update in time (from=${options.fromId ?? "null"}, expected=${options.expectedId ?? "new"}, got=${fallback ?? "null"})`,
  );
}

async function hydrateThreadMessages(
  aui: Aui,
  threadId: string,
  sessionId: string,
): Promise<void> {
  let messages;
  try {
    messages = await listChatMessages(sessionId);
  } catch (error) {
    throw new Error(
      `FETCH_MESSAGES: ${errorMessage(error)} (session=${sessionId})`,
    );
  }

  if (aui.threads.getState().mainThreadId !== threadId) {
    try {
      await aui.threads.switchToThread(threadId);
      await waitForMainThread(aui, { expectedId: threadId });
    } catch (error) {
      throw new Error(
        `THREAD_SWITCH_BEFORE_HYDRATE: ${errorMessage(error)} (want=${threadId}, main=${aui.threads.getState().mainThreadId ?? "null"})`,
      );
    }
  }

  const mainId = aui.threads.getState().mainThreadId;
  if (mainId !== threadId) {
    throw new Error(
      `THREAD_MISMATCH: cannot append — main=${mainId ?? "null"} bound=${threadId} session=${sessionId}`,
    );
  }

  try {
    // replace: true so re-opening a mapped thread re-applies branch collapse
    // after regenerate / hydrate fixes (stale linear duplicates otherwise stick).
    importChatMessagesIntoThread(aui.thread, sessionId, messages, {
      replace: true,
    });
  } catch (error) {
    throw new Error(
      `IMPORT_MESSAGES: ${errorMessage(error)} (count=${messages.length}, session=${sessionId})`,
    );
  }
}

async function bindThreadToSession(
  aui: Aui,
  threadId: string,
  session: ChatSession,
): Promise<void> {
  const item = aui.threads.item({ id: threadId });
  try {
    if (item.getState().status === "new") {
      await item.initialize();
    }
  } catch {
    try {
      await item.initialize();
    } catch {
      // Some runtimes expose an id without initialize.
    }
  }

  const title = session.title?.trim() || "New Chat";
  try {
    if (item.getState().status !== "new") {
      await item.rename(title);
    }
  } catch {
    // Title is best-effort.
  }
  setBackendSessionId(threadId, session.id);
  if (session.project_id) {
    useProjectsStore
      .getState()
      .assignThreadProject(threadId, session.project_id, { force: true });
  }
}

async function openBackendChatSessionExclusive(
  aui: Aui,
  session: ChatSession,
  requestId: number,
): Promise<string> {
  if (!isLatest(requestId)) {
    return (
      getThreadIdForBackendSession(session.id) ??
      aui.threads.getState().mainThreadId ??
      ""
    );
  }

  const store = useChatSessionsStore.getState();
  store.beginOpeningSession(session.id);
  // Always mark read on open so last_read_at is after any prior assistant
  // (POST /messages only stamps read at send time, before the reply lands).
  store.upsertSession({ ...session, has_unread: false });
  const markReadPromise = markChatSessionRead(session.id)
    .then((updated) => {
      useChatSessionsStore.getState().upsertSession({
        ...updated,
        has_unread: false,
      });
    })
    .catch(() => {
      // Optimistic clear stands; next list fetch reconciles.
    });
  let hydratedOk = false;
  let threadId = "";

  try {
    const liveIds = new Set(aui.threads.getState().threadIds);
    const mapped = getThreadIdForBackendSession(session.id);

    if (mapped && liveIds.has(mapped)) {
      await aui.threads.switchToThread(mapped);
      threadId = await waitForMainThread(aui, { expectedId: mapped });
    } else {
      const mainId = aui.threads.getState().mainThreadId;
      const mainMapped = mainId ? getBackendSessionId(mainId) : null;
      const mainEmpty =
        mainId != null && aui.thread.getState().messages.length === 0;

      if (mainId && !mainMapped && mainEmpty) {
        threadId = mainId;
        await bindThreadToSession(aui, threadId, session);
      } else {
        const fromId = mainId;
        const previousThreadIds = new Set(aui.threads.getState().threadIds);
        await aui.threads.switchToNewThread();
        threadId = await waitForMainThread(aui, {
          fromId,
          previousThreadIds,
        });
        await bindThreadToSession(aui, threadId, session);
      }
    }

    if (!isLatest(requestId)) return threadId;

    if (
      aui.threads.getState().mainThreadId === threadId &&
      aui.thread.getState().messages.length > 0
    ) {
      hydratedOk = true;
    } else {
      await hydrateThreadMessages(aui, threadId, session.id);
      hydratedOk = true;
    }

    // Fresh run state (list cache can be stale) → pending for canResume.
    // Wait for mark-read so a racing GET cannot restore has_unread: true.
    await markReadPromise;
    let fresh = session;
    try {
      fresh = await getChatSession(session.id);
      useChatSessionsStore.getState().upsertSession({
        ...fresh,
        has_unread: false,
      });
    } catch {
      // Fall back to the list/cache payload.
    }
    if (fresh.run_status === "running" && fresh.active_run_id) {
      setPendingChatRun(fresh.id, fresh.active_run_id);
    } else {
      clearPendingChatRun(fresh.id);
    }

    return threadId;
  } catch (error) {
    if (isLatest(requestId)) {
      const raw = errorMessage(error);
      const codeMatch = /^([A-Z_]+):/.exec(raw);
      reportOpenError(
        session.id,
        codeMatch?.[1] ?? "OPEN_SESSION_FAILED",
        raw,
      );
    }
    throw error;
  } finally {
    if (!isLatest(requestId)) {
      if (useChatSessionsStore.getState().openingSessionId === session.id) {
        store.endOpeningSession(session.id);
      }
    } else if (hydratedOk) {
      store.markMessagesHydrated(session.id);
    } else if (useChatSessionsStore.getState().openingSessionId === session.id) {
      // Error path already cleared opening via setOpenError; keep consistent.
      store.endOpeningSession(session.id);
    }
  }
}

/**
 * Ensure a local runtime thread exists for a backend session, switch to it,
 * then hydrate messages. Opens are serialized; only the latest click applies.
 */
export function openBackendChatSession(
  aui: Aui,
  session: ChatSession,
): Promise<string> {
  const requestId = ++latestOpenRequestId;
  useChatSessionsStore.getState().beginOpeningSession(session.id);

  const job = openChain.then(
    () => openBackendChatSessionExclusive(aui, session, requestId),
    () => openBackendChatSessionExclusive(aui, session, requestId),
  );
  openChain = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}
