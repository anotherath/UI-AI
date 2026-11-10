/**
 * Tracks in-flight backend chat runs across refresh.
 * Keyed by backend session id (stable); thread ids are remapped on reload.
 */

const STORAGE_KEY = "aui.pending-chat-runs.v1";

type PendingRun = {
  runId: string;
  userMessageId?: string;
  updatedAt: number;
};

type StoreShape = Record<string, PendingRun>;

const listeners = new Map<string, Set<() => void>>();
const globalListeners = new Set<() => void>();

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(next: StoreShape): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

function notify(sessionId: string): void {
  const set = listeners.get(sessionId);
  if (set) {
    for (const listener of set) listener();
  }
  for (const listener of globalListeners) listener();
}

export function getPendingChatRun(sessionId: string): PendingRun | null {
  return readStore()[sessionId] ?? null;
}

export function getPendingChatRunId(sessionId: string): string | null {
  return getPendingChatRun(sessionId)?.runId ?? null;
}

export function setPendingChatRun(
  sessionId: string,
  runId: string,
  userMessageId?: string,
): void {
  const store = readStore();
  store[sessionId] = {
    runId,
    ...(userMessageId ? { userMessageId } : {}),
    updatedAt: Date.now(),
  };
  writeStore(store);
  notify(sessionId);
}

export function clearPendingChatRun(sessionId: string): void {
  const store = readStore();
  if (!(sessionId in store)) return;
  delete store[sessionId];
  writeStore(store);
  notify(sessionId);
}

export function subscribePendingChatRun(
  sessionId: string,
  listener: () => void,
): () => void {
  let set = listeners.get(sessionId);
  if (!set) {
    set = new Set();
    listeners.set(sessionId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(sessionId);
  };
}

/** Fires on any pending-run change (thread mapping may not exist at subscribe time). */
export function subscribeAnyPendingChatRun(listener: () => void): () => void {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
}
