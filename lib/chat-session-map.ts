"use client";

const STORAGE_KEY = "ai-rag-thread-backend-sessions";

type SessionMap = Record<string, string>;

function readMap(): SessionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as SessionMap;
  } catch {
    return {};
  }
}

function writeMap(map: SessionMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function getBackendSessionId(threadId: string): string | null {
  const id = readMap()[threadId];
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function getThreadIdForBackendSession(
  sessionId: string,
): string | null {
  const map = readMap();
  for (const [threadId, mapped] of Object.entries(map)) {
    if (mapped === sessionId) return threadId;
  }
  return null;
}

/** Bind thread ↔ session 1:1 (drops any prior reverse/forward duplicates). */
export function setBackendSessionId(threadId: string, sessionId: string) {
  const prev = readMap();
  const next: SessionMap = {};
  for (const [tid, sid] of Object.entries(prev)) {
    if (tid === threadId || sid === sessionId) continue;
    next[tid] = sid;
  }
  next[threadId] = sessionId;
  writeMap(next);
}

export function clearBackendSessionId(threadId: string) {
  const next = { ...readMap() };
  delete next[threadId];
  writeMap(next);
}
