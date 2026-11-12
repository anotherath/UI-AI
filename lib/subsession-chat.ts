import {
  editChatMessageStream,
  followChatRunStream,
  getChatSession,
  postChatMessageStream,
  readAgentSse,
} from "@/lib/chat-api";
import { useComposerPrefsStore } from "@/lib/composer-prefs-store";
import {
  clearPendingChatRun,
  getPendingChatRunId,
  setPendingChatRun,
} from "@/lib/pending-chat-run";
import { useAgentRunStatusStore } from "@/lib/agent-run-status-store";
import { useSubsessionsStore } from "@/lib/subsessions-store";

type StreamHandlers = {
  onUpdate: (content: string) => void;
  onError: (error: string) => void;
  abortSignal?: AbortSignal;
  sessionId?: string;
  /** Seed content when resuming mid-stream. */
  initialContent?: string;
};

/** In-flight SSE owners — survive SubsessionChatBody unmount. */
const streamControllers = new Map<string, AbortController>();

export function isSubsessionStreamActive(sessionId: string): boolean {
  const controller = streamControllers.get(sessionId);
  return Boolean(controller && !controller.signal.aborted);
}

/** Explicit Stop — cancels follow/post and clears pending run. */
export function abortSubsessionStream(sessionId: string): void {
  const controller = streamControllers.get(sessionId);
  if (controller) {
    controller.abort();
    streamControllers.delete(sessionId);
  }
  clearPendingChatRun(sessionId);
  useAgentRunStatusStore.getState().clearStatus(sessionId);
}

function bindController(sessionId: string): AbortController {
  const previous = streamControllers.get(sessionId);
  if (previous && !previous.signal.aborted) {
    previous.abort();
  }
  const controller = new AbortController();
  streamControllers.set(sessionId, controller);
  return controller;
}

function releaseController(sessionId: string, controller: AbortController) {
  if (streamControllers.get(sessionId) === controller) {
    streamControllers.delete(sessionId);
  }
}

async function consumeAssistantStream(
  body: ReadableStream<Uint8Array>,
  options: StreamHandlers,
): Promise<{ assistantMessageId?: string; content: string }> {
  let content = options.initialContent ?? "";
  let assistantMessageId: string | undefined;
  const sessionId = options.sessionId;

  for await (const evt of readAgentSse(body)) {
    if (options.abortSignal?.aborted) break;
    switch (evt.event) {
      case "run_started": {
        const runId =
          typeof evt.data.run_id === "string" ? evt.data.run_id : "";
        const userMessageId =
          typeof evt.data.user_message_id === "string"
            ? evt.data.user_message_id
            : undefined;
        if (sessionId && runId) {
          setPendingChatRun(sessionId, runId, userMessageId);
        }
        break;
      }
      case "message_delta": {
        const delta =
          typeof evt.data.delta === "string" ? evt.data.delta : "";
        if (!delta) break;
        content += delta;
        options.onUpdate(content);
        break;
      }
      case "message_completed": {
        const full =
          typeof evt.data.content === "string" ? evt.data.content : "";
        if (full) {
          content = full;
          options.onUpdate(content);
        }
        if (typeof evt.data.assistant_message_id === "string") {
          assistantMessageId = evt.data.assistant_message_id;
        }
        break;
      }
      case "error": {
        const detail =
          typeof evt.data.detail === "string"
            ? evt.data.detail
            : "Agent error";
        options.onError(detail);
        break;
      }
      default:
        break;
    }
  }

  if (sessionId && !options.abortSignal?.aborted) {
    clearPendingChatRun(sessionId);
  }

  return { assistantMessageId, content };
}

/** Stream an assistant reply for a backend subsession session id. */
export async function streamSubsessionReply(options: {
  sessionId: string;
  content: string;
  /** Edit an existing user message instead of posting a new one. */
  editMessageId?: string;
  onUpdate: (content: string) => void;
  onError: (error: string) => void;
  abortSignal?: AbortSignal;
}): Promise<{ assistantMessageId?: string; content: string }> {
  const model = useComposerPrefsStore.getState().subsessionModel;
  try {
    const body = options.editMessageId
      ? await editChatMessageStream(
          options.sessionId,
          options.editMessageId,
          options.content,
          { model, abortSignal: options.abortSignal },
        )
      : await postChatMessageStream(options.sessionId, options.content, {
          model,
          abortSignal: options.abortSignal,
        });

    return await consumeAssistantStream(body, {
      ...options,
      sessionId: options.sessionId,
    });
  } catch (error) {
    if (options.abortSignal?.aborted) {
      return { content: "" };
    }
    const message = error instanceof Error ? error.message : String(error);
    options.onError(message);
    return { content: "" };
  }
}

/**
 * Reattach to a backend run still marked running (F5 / reopen after detach).
 * Returns null when nothing to follow — caller should hydrate via loadMessages.
 */
export async function resumeSubsessionReply(options: {
  sessionId: string;
  onUpdate: (content: string) => void;
  onError: (error: string) => void;
  abortSignal?: AbortSignal;
  initialContent?: string;
}): Promise<{ assistantMessageId?: string; content: string } | null> {
  const { sessionId } = options;
  let runId = getPendingChatRunId(sessionId);
  try {
    const session = await getChatSession(sessionId);
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
    const body = await followChatRunStream(
      sessionId,
      runId,
      options.abortSignal,
    );
    return await consumeAssistantStream(body, {
      ...options,
      sessionId,
    });
  } catch (error) {
    if (options.abortSignal?.aborted) {
      return { content: options.initialContent ?? "" };
    }
    // Stale run id — retry once with fresh active_run_id.
    try {
      const session = await getChatSession(sessionId);
      if (
        session.run_status === "running" &&
        session.active_run_id &&
        session.active_run_id !== runId
      ) {
        setPendingChatRun(sessionId, session.active_run_id);
        const body = await followChatRunStream(
          sessionId,
          session.active_run_id,
          options.abortSignal,
        );
        return await consumeAssistantStream(body, {
          ...options,
          sessionId,
        });
      }
    } catch {
      // fall through
    }
    const message = error instanceof Error ? error.message : String(error);
    options.onError(message);
    return { content: options.initialContent ?? "" };
  }
}

function finishAssistantMessage(
  sessionId: string,
  assistantId: string,
  result: { assistantMessageId?: string; content: string },
) {
  const current = useSubsessionsStore.getState().byId[sessionId];
  if (!current) return;
  const latest = current.messages.find((message) => message.id === assistantId);
  if (latest?.status === "streaming") {
    const nextId = result.assistantMessageId ?? assistantId;
    useSubsessionsStore.getState().setMessages(
      sessionId,
      current.messages.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              id: nextId,
              status: "complete" as const,
              content: result.content || message.content,
            }
          : message,
      ),
    );
  }
}

/**
 * Full turn owned outside React — close/unmount does not abort.
 * Stop calls {@link abortSubsessionStream}.
 */
export async function runSubsessionTurn(
  subsessionId: string,
  content: string,
  options?: { editMessageId?: string },
): Promise<void> {
  const store = useSubsessionsStore.getState();
  const runStatus = useAgentRunStatusStore.getState();

  // Optimistic assistant stub on current id (draft or backend) before network.
  const assistantId = crypto.randomUUID();
  store.appendMessage(subsessionId, {
    id: assistantId,
    role: "assistant",
    content: "",
    status: "streaming",
  });
  runStatus.setStatus(subsessionId, "Thinking");

  let sessionId = subsessionId;
  try {
    sessionId = await useSubsessionsStore
      .getState()
      .ensureBackendFork(subsessionId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create subsession";
    useSubsessionsStore.getState().patchMessage(subsessionId, assistantId, {
      status: "error",
      error: message,
    });
    runStatus.clearStatus(subsessionId);
    return;
  }

  // Draft→backend remap: status key + controller move to stable id.
  if (sessionId !== subsessionId) {
    runStatus.clearStatus(subsessionId);
    runStatus.setStatus(sessionId, "Thinking");
  }

  const controller = bindController(sessionId);
  const patch = useSubsessionsStore.getState().patchMessage;

  const result = await streamSubsessionReply({
    sessionId,
    content,
    editMessageId: options?.editMessageId,
    abortSignal: controller.signal,
    onUpdate: (text) => {
      if (text.trim()) {
        useAgentRunStatusStore.getState().setStatus(sessionId, "Writing");
      }
      patch(sessionId, assistantId, {
        content: text,
        status: "streaming",
        error: undefined,
      });
    },
    onError: (error) => {
      useAgentRunStatusStore.getState().clearStatus(sessionId);
      patch(sessionId, assistantId, {
        status: "error",
        error,
      });
    },
  });

  releaseController(sessionId, controller);

  if (controller.signal.aborted) {
    useAgentRunStatusStore.getState().clearStatus(sessionId);
    return;
  }

  useAgentRunStatusStore.getState().setStatus(sessionId, "Done");
  useAgentRunStatusStore.getState().clearStatus(sessionId);
  finishAssistantMessage(sessionId, assistantId, result);

  if (result.content || result.assistantMessageId) {
    await useSubsessionsStore
      .getState()
      .loadMessages(sessionId, { force: true });
  }
}

/**
 * On open/F5: if a local stream is already owned, do nothing.
 * Else hydrate, then follow a running backend run when present.
 */
export async function hydrateOrResumeSubsession(
  sessionId: string,
): Promise<void> {
  if (sessionId.startsWith("draft:")) return;
  if (isSubsessionStreamActive(sessionId)) return;

  // Draft→backend remap changes activeId while a turn is starting — do not
  // clobber optimistic streaming rows with an empty API snapshot.
  const local = useSubsessionsStore.getState().byId[sessionId];
  if (local?.messages.some((message) => message.status === "streaming")) {
    return;
  }

  await useSubsessionsStore.getState().loadMessages(sessionId, { force: true });

  let runId = getPendingChatRunId(sessionId);
  try {
    const session = await getChatSession(sessionId);
    if (session.run_status === "running" && session.active_run_id) {
      runId = session.active_run_id;
      setPendingChatRun(sessionId, runId);
    } else {
      clearPendingChatRun(sessionId);
      return;
    }
  } catch {
    if (!runId) return;
  }

  const store = useSubsessionsStore.getState();
  const current = store.byId[sessionId];
  if (!current) return;

  let assistant = [...current.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  let assistantId = assistant?.id;
  let initialContent = assistant?.content ?? "";

  if (!assistantId || assistant?.status === "complete") {
    assistantId = crypto.randomUUID();
    initialContent = "";
    store.appendMessage(sessionId, {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
    });
  } else if (assistant && assistant.status !== "streaming") {
    store.patchMessage(sessionId, assistantId, { status: "streaming" });
  }

  const controller = bindController(sessionId);
  useAgentRunStatusStore.getState().setStatus(sessionId, "Thinking");
  const patch = useSubsessionsStore.getState().patchMessage;

  const result = await resumeSubsessionReply({
    sessionId,
    abortSignal: controller.signal,
    initialContent,
    onUpdate: (text) => {
      if (text.trim()) {
        useAgentRunStatusStore.getState().setStatus(sessionId, "Writing");
      }
      patch(sessionId, assistantId!, {
        content: text,
        status: "streaming",
        error: undefined,
      });
    },
    onError: (error) => {
      useAgentRunStatusStore.getState().clearStatus(sessionId);
      patch(sessionId, assistantId!, {
        status: "error",
        error,
      });
    },
  });

  releaseController(sessionId, controller);

  if (!result) {
    useAgentRunStatusStore.getState().clearStatus(sessionId);
    await useSubsessionsStore
      .getState()
      .loadMessages(sessionId, { force: true });
    return;
  }

  if (controller.signal.aborted) {
    useAgentRunStatusStore.getState().clearStatus(sessionId);
    return;
  }

  useAgentRunStatusStore.getState().setStatus(sessionId, "Done");
  useAgentRunStatusStore.getState().clearStatus(sessionId);
  finishAssistantMessage(sessionId, assistantId!, result);
  await useSubsessionsStore.getState().loadMessages(sessionId, { force: true });
}
