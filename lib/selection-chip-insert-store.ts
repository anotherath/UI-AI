"use client";

import { create } from "zustand";

export type SelectionChipInsert = {
  messageId: string;
  label: string;
  fullText: string;
};

type SelectionChipInsertState = {
  pending: SelectionChipInsert | null;
  requestInsert: (chip: SelectionChipInsert) => void;
  consume: () => SelectionChipInsert | null;
};

/** Queues a selection chip for the custom composer Lexical editor. */
export const useSelectionChipInsertStore = create<SelectionChipInsertState>(
  (set, get) => ({
    pending: null,
    requestInsert: (chip) => set({ pending: chip }),
    consume: () => {
      const pending = get().pending;
      set({ pending: null });
      return pending;
    },
  }),
);
