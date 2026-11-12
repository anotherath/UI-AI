"use client";

import { startTransition } from "react";
import type {
  ChatRequestOptions,
  ChatTransport,
  UIMessage,
  UIMessageChunk,
} from "ai";
import {
  createChatSession,
  editChatMessageStream,
  followChatRunStream,
  getChatSession,
  isChatApiError,
  markChatSessionRead,
  postChatMessageStream,
  readAgentSse,
  regenerateChatMessageStream,
  type ChatSession,
} from "@/lib/chat-api";
import {
  getBackendSessionId,
  setBackendSessionId,
} from "@/lib/chat-session-map";
import { useAgentRunStatusStore } from "@/lib/agent-run-status-store";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { useComposerPrefsStore } from "@/lib/composer-prefs-store";
import { useProjectsStore } from "@/lib/projects-store";
import {
  clearPendingChatRun,
  getPendingChatRunId,
  setPendingChatRun,
  subscribeAnyPendingChatRun,
} from "@/lib/pending-chat-run";
import {
  getLastSessionUserMessageId,
  rememberSessionUserMessageId,
  takePendingMessageEdit,
} from "@/lib/pending-message-edit";

function uiMessageText(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

function latestUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user") {
      // Persist chip directives as-is; backend expands them for the LLM.
      return uiMessageText(message).trim();
    }
  }
  return "";
}

/** Backend UUID on the latest user UIMessage (hydrate / run_started ids). */
function latestUserBackendId(messages: UIMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const meta = message.metadata as
      | { backendMessageId?: string; custom?: { backendMessageId?: string } }
      | undefined;
    const fromMeta =
      meta?.backendMessageId ?? meta?.custom?.backendMessageId ?? undefined;
    if (typeof fromMeta === "string" && fromMeta) return fromMeta;
    // Hydrated messages use the backend id as the UIMessage id.
    if (message.id && looksLikeUuid(message.id)) return message.id;
  }
  return undefined;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

function patchSessionRunState(
  sessionId: string,
  patch: Partial<
    Pick<ChatSession, "run_status" | "active_run_id" | "has_unread">
  >,
): void {
  const existing = useChatSessionsStore
    .getState()
    .sessions.find((session) => session.id === sessionId);
  if (!existing) return;
  const now = new Date().toISOString();
  useChatSessionsStore.getState().upsertSession({
    ...existing,
    ...patch,
    updated_at: now,
    last_message_at: now,
  });
}

/** Viewing this chat — bump last_read_at past the new assistant so F5 stays read. */
function markReadIfViewing(sessionId: string): void {
  if (useChatSessionsStore.getState().activeSessionId !== sessionId) return;
  const existing = useChatSessionsStore
    .getState()
    .sessions.find((session) => session.id === sessionId);
  if (existing) {
    useChatSessionsStore.getState().upsertSession({
      ...existing,
      has_unread: false,
    });
  }
  void markChatSessionRead(sessionId)
    .then((updated) =>
      useChatSessionsStore.getState().upsertSession({
        ...updated,
        has_unread: false,
      }),
    )
    .catch(() => {
      // Optimistic clear stands.
    });
}

async function ensureBackendSession(threadId: string): Promise<string> {
  const existing = getBackendSessionId(threadId);
  if (existing) return existing;

  // Leave title null so backend can auto-title on first message (session_updated).
  const session = await createChatSession();
  setBackendSessionId(threadId, session.id);
  const store = useChatSessionsStore.getState();
  // Force client "now" so the row lands at the top immediately (server
  // timestamps can sort below other Today chats until the first message).
  const now = new Date().toISOString();
  store.upsertSession({
    ...session,
    updated_at: now,
    last_message_at: now,
  });
  // New chat → real session: highlight the CHATS row, not "+ New chat".
  store.setActiveSession(session.id);
  useProjectsStore.getState().openChatFromChats(session.project_id);
  return session.id;
}

/** Maps assistant-ui thread ids → pending backend run ids (via session map). */
const resumableStorage = {
  getStreamId(threadId?: string) {
    if (!threadId) return null;
    const sessionId = getBackendSessionId(threadId);
    if (!sessionId) return null;
    return getPendingChatRunId(sessionId);
  },
  setStreamId(runId: string, threadId?: string) {
    if (!threadId || !runId) return;
    const sessionId = getBackendSessionId(threadId);
    if (!sessionId) return;
    setPendingChatRun(sessionId, runId);
  },
  clear(threadId?: string) {
    if (!threadId) return;
    const sessionId = getBackendSessionId(threadId);
    if (!sessionId) return;
    clearPendingChatRun(sessionId);
  },
  subscribe(listener: () => void, threadId?: string) {
    // Resolve session lazily — mapping may appear after open/hydrate.
    return subscribeAnyPendingChatRun(() => {
      if (!threadId) {
        listener();
        return;
      }
      if (getBackendSessionId(threadId)) listener();
    });
  },
};

/** Prefer agent-provided copy; only invent "Thinking" when the payload is empty. */
function stepTitle(data: Record<string, unknown>): string {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (title) return title;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name) return name;
  const kind = typeof data.kind === "string" ? data.kind.trim() : "";
  return kind || "Thinking";
}

/** Mid-step labels come from agent `text` as-is — no FE remapping. */
function statusFromStepDelta(data: Record<string, unknown>): string | null {
  const text = typeof data.text === "string" ? data.text.trim() : "";
  return text || null;
}

function agentSseToUiMessageStream(
  body: ReadableStream<Uint8Array>,
  sessionId: string,
  options?: { clearPendingOnFinish?: boolean; threadId?: string },
): ReadableStream<UIMessageChunk> {
  const textPartId = crypto.randomUUID();
  const clearPendingOnFinish = options?.clearPendingOnFinish !== false;
  // Status UI keys off the local thread id — available before backend map exists.
  const statusThreadId = options?.threadId?.trim() || sessionId;

  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      let started = false;
      let textStarted = false;
      let finished = false;
      // Grok/Cursor pattern: coalesce SSE tokens to ≤1 UI flush per frame
      // so React/layout isn't hit on every network chunk.
      let pendingDelta = "";
      let flushHandle: number | null = null;
      let shouldClearPending = false;

      const setRunStatus = (label: string | null) => {
        useAgentRunStatusStore.getState().setStatus(statusThreadId, label);
      };

      const cancelScheduledFlush = () => {
        if (flushHandle == null) return;
        if (typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(flushHandle);
        } else {
          clearTimeout(flushHandle);
        }
        flushHandle = null;
      };

      const ensureStart = () => {
        if (started) return;
        controller.enqueue({ type: "start" });
        started = true;
        setRunStatus("Thinking");
      };

      const ensureTextStart = () => {
        ensureStart();
        if (textStarted) return;
        // Keep last agent status — clearing here flashes "Thinking"
        // via the indicator fallback before the first text paint.
        controller.enqueue({ type: "text-start", id: textPartId });
        textStarted = true;
      };

      const flushPendingDelta = () => {
        flushHandle = null;
        if (!pendingDelta) return;
        const delta = pendingDelta;
        pendingDelta = "";
        ensureTextStart();
        controller.enqueue({
          type: "text-delta",
          id: textPartId,
          delta,
        });
      };

      const flushNow = () => {
        cancelScheduledFlush();
        flushPendingDelta();
      };

      const queueDelta = (delta: string) => {
        pendingDelta += delta;
        // First paint: flush immediately so TTFT isn't waiting on rAF.
        if (!textStarted) {
          flushNow();
          return;
        }
        if (flushHandle != null) return;
        if (typeof requestAnimationFrame === "function") {
          flushHandle = requestAnimationFrame(flushPendingDelta);
        } else {
          flushHandle = setTimeout(flushPendingDelta, 16) as unknown as number;
        }
      };

      const finish = (
        reason: "stop" | "error" = "stop",
        messageMetadata?: { backendMessageId?: string },
      ) => {
        if (finished) return;
        finished = true;
        flushNow();
        const startedAt =
          useAgentRunStatusStore.getState().startedAtByThreadId[
            statusThreadId
          ];
        const runDurationMs =
          startedAt != null ? Math.max(0, Date.now() - startedAt) : undefined;
        // Quiet done beat — avoid flashing a stale in-progress label.
        setRunStatus(reason === "stop" ? "Done" : null);
        if (textStarted) {
          controller.enqueue({ type: "text-end", id: textPartId });
        }
        const meta = {
          ...(messageMetadata?.backendMessageId
            ? {
                backendMessageId: messageMetadata.backendMessageId,
                custom: {
                  backendMessageId: messageMetadata.backendMessageId,
                  ...(runDurationMs != null ? { runDurationMs } : {}),
                },
              }
            : runDurationMs != null
              ? { custom: { runDurationMs }, runDurationMs }
              : {}),
          ...(runDurationMs != null ? { runDurationMs } : {}),
        };
        controller.enqueue({
          type: "finish",
          finishReason: reason,
          ...(Object.keys(meta).length > 0 ? { messageMetadata: meta } : {}),
        });
        if (clearPendingOnFinish && shouldClearPending) {
          clearPendingChatRun(sessionId);
        }
        if (reason === "stop") {
          window.setTimeout(() => {
            const current =
              useAgentRunStatusStore.getState().byThreadId[statusThreadId];
            if (current === "Done") setRunStatus(null);
          }, 1200);
        }
      };

      try {
        for await (const evt of readAgentSse(body)) {
          switch (evt.event) {
            case "run_started": {
              ensureStart();
              const runId =
                typeof evt.data.run_id === "string" ? evt.data.run_id : "";
              const userMessageId =
                typeof evt.data.user_message_id === "string"
                  ? evt.data.user_message_id
                  : "";
              if (userMessageId) {
                rememberSessionUserMessageId(sessionId, userMessageId);
              }
              if (runId) {
                setPendingChatRun(
                  sessionId,
                  runId,
                  userMessageId || undefined,
                );
                patchSessionRunState(sessionId, {
                  run_status: "running",
                  active_run_id: runId,
                });
              }
              break;
            }
            case "session_updated": {
              const title =
                typeof evt.data.title === "string" ? evt.data.title.trim() : "";
              const updatedSessionId =
                typeof evt.data.session_id === "string"
                  ? evt.data.session_id
                  : sessionId;
              if (title) {
                // Low-priority: keep message streaming paints above sidebar sort.
                startTransition(() => {
                  useChatSessionsStore
                    .getState()
                    .applyRemoteTitle(updatedSessionId, title);
                });
              }
              break;
            }
            case "step_started": {
              ensureStart();
              setRunStatus(stepTitle(evt.data));
              break;
            }
            case "step_delta": {
              const label = statusFromStepDelta(evt.data);
              if (label) setRunStatus(label);
              break;
            }
            case "step_finished": {
              // Keep last agent label until the next step / Done.
              break;
            }
            case "message_delta": {
              const delta =
                typeof evt.data.delta === "string" ? evt.data.delta : "";
              if (!delta) break;
              queueDelta(delta);
              break;
            }
            case "message_completed": {
              const content =
                typeof evt.data.content === "string" ? evt.data.content : "";
              if (content && !textStarted && !pendingDelta) {
                queueDelta(content);
              }
              const assistantMessageId =
                typeof evt.data.assistant_message_id === "string"
                  ? evt.data.assistant_message_id
                  : undefined;
              const messageMetadata = assistantMessageId
                ? { backendMessageId: assistantMessageId }
                : undefined;
              shouldClearPending = true;
              {
                const viewing =
                  useChatSessionsStore.getState().activeSessionId ===
                  sessionId;
                patchSessionRunState(sessionId, {
                  run_status: "completed",
                  active_run_id: null,
                  has_unread: !viewing,
                });
                if (viewing) markReadIfViewing(sessionId);
              }
              finish("stop", messageMetadata);
              break;
            }
            case "error": {
              const detail =
                typeof evt.data.detail === "string"
                  ? evt.data.detail
                  : "Agent error";
              ensureStart();
              controller.enqueue({ type: "error", errorText: detail });
              shouldClearPending = true;
              patchSessionRunState(sessionId, {
                run_status: "error",
                active_run_id: null,
              });
              finish("error");
              break;
            }
            case "done": {
              shouldClearPending = true;
              const ok = evt.data.status !== "error";
              {
                const viewing =
                  useChatSessionsStore.getState().activeSessionId ===
                  sessionId;
                patchSessionRunState(sessionId, {
                  run_status: ok ? "completed" : "error",
                  active_run_id: null,
                  ...(ok ? { has_unread: !viewing } : {}),
                });
                if (ok && viewing) markReadIfViewing(sessionId);
              }
              finish(ok ? "stop" : "error");
              break;
            }
            default:
              break;
          }
        }
        // Ambiguous EOF (network drop) — keep pending so reconnect can retry.
        finish("stop");
      } catch (error) {
        if (isAbortError(error)) {
          // Client navigated away / refreshed — backend run keeps going.
          // Leave pending run so reconnectToStream can resume.
          finish("stop");
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
          ensureStart();
          controller.enqueue({ type: "error", errorText: message });
          // Keep pending on transient stream errors; only clear on agent done.
          finish("error");
        }
      } finally {
        cancelScheduledFlush();
        controller.close();
      }
    },
  });
}

/**
 * Bridges assistant-ui / AI SDK chat to agent-ai-rag SSE:
 * POST /api/v1/chat/sessions/{id}/messages → UIMessageChunk stream.
 * GET  /api/v1/chat/sessions/{id}/runs/{runId}/stream → reconnect after refresh.
 */
export class AgentChatTransport implements ChatTransport<UIMessage> {
  /** Backend replays buffered SSE from the start of the run. */
  readonly resumeStreamIsReplay = true;

  /** Lets assistant-ui auto-resume via pending run id in sessionStorage. */
  getResumableAdapter() {
    return { storage: resumableStorage };
  }

  async sendMessages({
    chatId,
    messages,
    abortSignal,
    trigger,
  }: {
    trigger: "submit-message" | "regenerate-message";
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  } & ChatRequestOptions): Promise<ReadableStream<UIMessageChunk>> {
    const content = latestUserText(messages);
    if (!content) {
      throw new Error("No user message to send");
    }

    const sessionId = await ensureBackendSession(chatId);
    // Promote this chat to the top of CHATS immediately.
    useChatSessionsStore.getState().touchSession(sessionId);
    useAgentRunStatusStore.getState().setStatus(chatId, "Thinking");
    const model = useComposerPrefsStore.getState().model;

    const pendingEdit = takePendingMessageEdit();
    try {
      let body: ReadableStream<Uint8Array>;
      if (pendingEdit && pendingEdit.sessionId === sessionId) {
        body = await editChatMessageStream(
          sessionId,
          pendingEdit.messageId,
          content,
          { model, abortSignal },
        );
      } else if (trigger === "regenerate-message") {
        // Reuse the last known user message id — never POST a duplicate user.
        const userMessageId =
          getLastSessionUserMessageId(sessionId) ??
          latestUserBackendId(messages);
        body = await regenerateChatMessageStream(sessionId, {
          userMessageId,
          model,
          abortSignal,
        });
      } else {
        body = await postChatMessageStream(sessionId, content, {
          model,
          abortSignal,
        });
      }
      return agentSseToUiMessageStream(body, sessionId, { threadId: chatId });
    } catch (error) {
      // Session already running → attach to the live background run.
      if (isChatApiError(error) && error.status === 409) {
        const followed = await this.reconnectToStream({
          chatId,
          abortSignal,
        });
        if (followed) return followed;
      }
      throw error;
    }
  }

  async reconnectToStream({
    chatId,
    abortSignal,
  }: {
    chatId: string;
    abortSignal?: AbortSignal;
  } & ChatRequestOptions): Promise<ReadableStream<UIMessageChunk> | null> {
    const sessionId = getBackendSessionId(chatId);
    if (!sessionId) return null;

    let runId = getPendingChatRunId(sessionId);
    try {
      const session = await getChatSession(sessionId);
      useChatSessionsStore.getState().upsertSession(session);
      if (session.run_status === "running" && session.active_run_id) {
        if (runId !== session.active_run_id) {
          setPendingChatRun(sessionId, session.active_run_id);
        }
        runId = session.active_run_id;
      } else {
        clearPendingChatRun(sessionId);
        return null;
      }
    } catch {
      if (!runId) return null;
    }
    if (!runId) return null;

    try {
      const body = await followChatRunStream(sessionId, runId, abortSignal);
      return agentSseToUiMessageStream(body, sessionId, { threadId: chatId });
    } catch (error) {
      // Stale run id — retry once with fresh active_run_id from API.
      if (isChatApiError(error) && error.status === 404) {
        try {
          const session = await getChatSession(sessionId);
          useChatSessionsStore.getState().upsertSession(session);
          if (
            session.run_status === "running" &&
            session.active_run_id &&
            session.active_run_id !== runId
          ) {
            setPendingChatRun(sessionId, session.active_run_id);
            const body = await followChatRunStream(
              sessionId,
              session.active_run_id,
              abortSignal,
            );
            return agentSseToUiMessageStream(body, sessionId, {
              threadId: chatId,
            });
          }
        } catch {
          // fall through
        }
        clearPendingChatRun(sessionId);
        return null;
      }
      // Keep pending on network/5xx so Resume can retry.
      return null;
    }
  }
}
