import { getApiBaseUrl } from "@/lib/auth";

export type ChatSession = {
  id: string;
  project_id: string | null;
  title: string | null;
  is_main: boolean;
  is_pinned: boolean;
  pinned_at: string | null;
  /** idle | running | completed | error — running means a background agent turn. */
  run_status?: "idle" | "running" | "completed" | "error";
  /** Active backend run id while run_status === "running". */
  active_run_id?: string | null;
  last_read_at?: string | null;
  /** Latest user/assistant message time (main includes sub-session activity). */
  last_message_at?: string | null;
  has_unread?: boolean;
  parent_session_id: string | null;
  forked_from_message_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Paginated main-session list (GET /chat/sessions). */
export type ChatSessionListPage = {
  items: ChatSession[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

/** Initial sidebar page — ~15 visible rows before scroll-load-more. */
export const CHAT_SESSION_PAGE_SIZE = 15;

export type ChatMessage = {
  id: string;
  session_id: string;
  /** Branch parent (assistant→user, user→prev assistant). */
  parent_message_id?: string | null;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AgentSseEvent = {
  event: string;
  data: Record<string, unknown>;
};

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  return response;
}

function normalizeSession(session: ChatSession): ChatSession {
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

export async function createChatSession(input?: {
  title?: string;
  projectId?: string | null;
}): Promise<ChatSession> {
  const response = await apiFetch("/api/v1/chat/sessions", {
    method: "POST",
    body: JSON.stringify({
      title: input?.title ?? null,
      project_id: input?.projectId ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create chat session (${response.status})`);
  }
  return normalizeSession((await response.json()) as ChatSession);
}

export async function listChatSessions(options?: {
  projectId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ChatSessionListPage> {
  const params = new URLSearchParams();
  if (options?.projectId != null && options.projectId !== "") {
    params.set("project_id", options.projectId);
  }
  params.set(
    "limit",
    String(options?.limit ?? CHAT_SESSION_PAGE_SIZE),
  );
  params.set("offset", String(options?.offset ?? 0));
  const response = await apiFetch(
    `/api/v1/chat/sessions?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to list chat sessions (${response.status})`);
  }
  const page = (await response.json()) as ChatSessionListPage;
  return {
    ...page,
    items: (page.items ?? []).map(normalizeSession),
    total: page.total ?? 0,
    limit: page.limit ?? CHAT_SESSION_PAGE_SIZE,
    offset: page.offset ?? 0,
    has_more: Boolean(page.has_more),
  };
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to get chat session (${response.status})`);
  }
  return normalizeSession((await response.json()) as ChatSession);
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
  );
  if (!response.ok) {
    throw new Error(`Failed to list messages (${response.status})`);
  }
  return (await response.json()) as ChatMessage[];
}

export async function updateChatSessionTitle(
  sessionId: string,
  title: string | null,
): Promise<ChatSession> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to rename chat session (${response.status})`);
  }
  return (await response.json()) as ChatSession;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete chat session (${response.status})`);
  }
}

/** Mark a session as read (clears has_unread). Does not bump updated_at. */
export async function markChatSessionRead(
  sessionId: string,
): Promise<ChatSession> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/read`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to mark chat session read (${response.status})`);
  }
  return normalizeSession((await response.json()) as ChatSession);
}

export async function pinChatSession(sessionId: string): Promise<ChatSession> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/pin`,
    { method: "POST" },
  );
  if (!response.ok) {
    let detail = `Failed to pin chat session (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") detail = payload.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await response.json()) as ChatSession;
}

export async function unpinChatSession(sessionId: string): Promise<ChatSession> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/pin`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    let detail = `Failed to unpin chat session (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") detail = payload.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await response.json()) as ChatSession;
}

export class ChatApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

export function isChatApiError(error: unknown): error is ChatApiError {
  return error instanceof ChatApiError;
}

async function readStreamError(response: Response, fallback: string) {
  let detail = fallback;
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") detail = payload.detail;
  } catch {
    // ignore
  }
  return detail;
}

async function throwStreamError(
  response: Response,
  fallback: string,
): Promise<never> {
  throw new ChatApiError(
    response.status,
    await readStreamError(response, fallback),
  );
}

/** POST user message and return the raw SSE response body. */
export async function postChatMessageStream(
  sessionId: string,
  content: string,
  abortSignal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: JSON.stringify({ content }),
      signal: abortSignal,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    await throwStreamError(
      response,
      `Failed to send message (${response.status})`,
    );
  }
  if (!response.body) {
    throw new Error("Chat stream missing response body");
  }
  return response.body;
}

/** Reconnect to a background run (replay buffered events + live tail). */
export async function followChatRunStream(
  sessionId: string,
  runId: string,
  abortSignal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/stream`,
    {
      method: "GET",
      headers: { Accept: "text/event-stream" },
      signal: abortSignal,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    await throwStreamError(
      response,
      `Failed to follow chat run (${response.status})`,
    );
  }
  if (!response.body) {
    throw new Error("Chat run stream missing response body");
  }
  return response.body;
}

/** Edit an existing user message then continue the agent SSE stream. */
export async function editChatMessageStream(
  sessionId: string,
  messageId: string,
  content: string,
  abortSignal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/edit`,
    {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: JSON.stringify({ content }),
      signal: abortSignal,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    await throwStreamError(
      response,
      `Failed to edit message (${response.status})`,
    );
  }
  if (!response.body) {
    throw new Error("Chat edit stream missing response body");
  }
  return response.body;
}

/**
 * Regenerate from an existing user message — no duplicate user row.
 * Omitting userMessageId uses the session's latest user message.
 */
export async function regenerateChatMessageStream(
  sessionId: string,
  userMessageId?: string | null,
  abortSignal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await apiFetch(
    `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/regenerate`,
    {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: JSON.stringify(
        userMessageId ? { user_message_id: userMessageId } : {},
      ),
      signal: abortSignal,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    await throwStreamError(
      response,
      `Failed to regenerate message (${response.status})`,
    );
  }
  if (!response.body) {
    throw new Error("Chat regenerate stream missing response body");
  }
  return response.body;
}

/** Parse an SSE byte stream into named events. */
export async function* readAgentSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentSseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];

  const flush = (): AgentSseEvent | null => {
    if (dataLines.length === 0) {
      eventName = "message";
      return null;
    }
    const raw = dataLines.join("\n");
    dataLines = [];
    const name = eventName;
    eventName = "message";
    try {
      return {
        event: name,
        data: JSON.parse(raw) as Record<string, unknown>,
      };
    } catch {
      return { event: name, data: { raw } };
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        } else if (line === "") {
          const evt = flush();
          if (evt) yield evt;
        }
      }
    }
    if (buffer.trim()) {
      if (buffer.startsWith("event:")) eventName = buffer.slice(6).trim();
      else if (buffer.startsWith("data:")) dataLines.push(buffer.slice(5).trimStart());
    }
    const evt = flush();
    if (evt) yield evt;
  } finally {
    reader.releaseLock();
  }
}
