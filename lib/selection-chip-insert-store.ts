"use client";

import { create } from "zustand";

export type SelectionChipInsertScope = "main" | "subsession";

export type SelectionChipInsert = {
  messageId: string;
  label: string;
  fullText: string;
  scope: SelectionChipInsertScope;
};

type SelectionChipInsertState = {
  pending: SelectionChipInsert | null;
  requestInsert: (chip: SelectionChipInsert) => void;
  consume: (
    scope: SelectionChipInsertScope,
  ) => SelectionChipInsert | null;
};

/** Queues a selection chip for a specific Lexical composer instance. */
export const useSelectionChipInsertStore = create<SelectionChipInsertState>(
  (set, get) => ({
    pending: null,
    requestInsert: (chip) => set({ pending: chip }),
    consume: (scope) => {
      const pending = get().pending;
      if (!pending || pending.scope !== scope) return null;
      set({ pending: null });
      return pending;
    },
  }),
);
