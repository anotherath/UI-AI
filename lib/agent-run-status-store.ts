"use client";

import { create } from "zustand";

type AgentRunStatusState = {
  /**
   * Live status label keyed by assistant-ui thread id (chatId).
   * Must not depend on backend session map — new chats have no map yet.
   */
  byThreadId: Record<string, string>;
  /** Wall-clock start of the current run (ms), kept across label changes. */
  startedAtByThreadId: Record<string, number>;
  /** Final run duration (ms) after a turn settles — for the message footer. */
  durationMsByThreadId: Record<string, number>;
  setStatus: (threadId: string, label: string | null) => void;
  clearStatus: (threadId: string) => void;
};

function freezeDuration(
  state: AgentRunStatusState,
  threadId: string,
): Record<string, number> {
  const started = state.startedAtByThreadId[threadId];
  if (started == null) return state.durationMsByThreadId;
  return {
    ...state.durationMsByThreadId,
    [threadId]: Math.max(0, Date.now() - started),
  };
}

export const useAgentRunStatusStore = create<AgentRunStatusState>((set) => ({
  byThreadId: {},
  startedAtByThreadId: {},
  durationMsByThreadId: {},
  setStatus: (threadId, label) =>
    set((state) => {
      if (!threadId.trim()) return state;
      if (!label) {
        if (
          !(threadId in state.byThreadId) &&
          !(threadId in state.startedAtByThreadId)
        ) {
          return state;
        }
        const byThreadId = { ...state.byThreadId };
        const startedAtByThreadId = { ...state.startedAtByThreadId };
        const durationMsByThreadId = freezeDuration(state, threadId);
        delete byThreadId[threadId];
        delete startedAtByThreadId[threadId];
        return { byThreadId, startedAtByThreadId, durationMsByThreadId };
      }
      const sameLabel = state.byThreadId[threadId] === label;
      const hasStart = threadId in state.startedAtByThreadId;
      if (sameLabel && hasStart) return state;
      const startingFresh = !hasStart;
      const durationMsByThreadId = startingFresh
        ? (() => {
            const next = { ...state.durationMsByThreadId };
            delete next[threadId];
            return next;
          })()
        : label === "Done"
          ? freezeDuration(state, threadId)
          : state.durationMsByThreadId;
      return {
        byThreadId: sameLabel
          ? state.byThreadId
          : { ...state.byThreadId, [threadId]: label },
        startedAtByThreadId: hasStart
          ? state.startedAtByThreadId
          : {
              ...state.startedAtByThreadId,
              [threadId]: Date.now(),
            },
        durationMsByThreadId,
      };
    }),
  clearStatus: (threadId) =>
    set((state) => {
      if (
        !(threadId in state.byThreadId) &&
        !(threadId in state.startedAtByThreadId)
      ) {
        return state;
      }
      const byThreadId = { ...state.byThreadId };
      const startedAtByThreadId = { ...state.startedAtByThreadId };
      const durationMsByThreadId = freezeDuration(state, threadId);
      delete byThreadId[threadId];
      delete startedAtByThreadId[threadId];
      return { byThreadId, startedAtByThreadId, durationMsByThreadId };
    }),
}));
