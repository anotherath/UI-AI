"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ContextRailPanel = "notes" | "files" | null;

export const RAIL_WIDTH_DEFAULT = 440;
export const RAIL_WIDTH_MIN = 280;
export const RAIL_WIDTH_MAX = 720;

type ContextRailState = {
  panel: ContextRailPanel;
  width: number;
  setPanel: (panel: ContextRailPanel) => void;
  togglePanel: (panel: Exclude<ContextRailPanel, null>) => void;
  setWidth: (width: number) => void;
};

function clampWidth(width: number) {
  return Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, Math.round(width)));
}

export const useContextRailStore = create<ContextRailState>()(
  persist(
    (set, get) => ({
      panel: null,
      width: RAIL_WIDTH_DEFAULT,
      setPanel: (panel) => set({ panel }),
      togglePanel: (panel) =>
        set({ panel: get().panel === panel ? null : panel }),
      setWidth: (width) => set({ width: clampWidth(width) }),
    }),
    {
      name: "ai-rag-context-rail",
      partialize: (state) => ({ width: state.width }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<ContextRailState>;
        let width = stored.width ?? current.width;
        // Migrate old notes default (352) and first rail default if needed.
        if (width === 352) width = RAIL_WIDTH_DEFAULT;
        return { ...current, width, panel: null };
      },
    },
  ),
);
