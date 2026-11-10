"use client";

import { create } from "zustand";

type AgentRunStatusState = {
  /**
   * Live status label keyed by assistant-ui thread id (chatId).
   * Must not depend on backend session map — new chats have no map yet.
   */
  byThreadId: Record<string, string>;
  setStatus: (threadId: string, label: string | null) => void;
  clearStatus: (threadId: string) => void;
};

export const useAgentRunStatusStore = create<AgentRunStatusState>((set) => ({
  byThreadId: {},
  setStatus: (threadId, label) =>
    set((state) => {
      if (!threadId.trim()) return state;
      if (!label) {
        if (!(threadId in state.byThreadId)) return state;
        const byThreadId = { ...state.byThreadId };
        delete byThreadId[threadId];
        return { byThreadId };
      }
      if (state.byThreadId[threadId] === label) return state;
      return {
        byThreadId: { ...state.byThreadId, [threadId]: label },
      };
    }),
  clearStatus: (threadId) =>
    set((state) => {
      if (!(threadId in state.byThreadId)) return state;
      const byThreadId = { ...state.byThreadId };
      delete byThreadId[threadId];
      return { byThreadId };
    }),
}));
