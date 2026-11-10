"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** List of forks for the current main session. */
export type ContextRailListPanel = "notes" | "files" | "subsessions";
/** Half-screen chat for one active subsession — separate from the list. */
export type ContextRailChatPanel = "subsession-chat";
export type ContextRailPanel =
  | ContextRailListPanel
  | ContextRailChatPanel
  | null;

export type ContextRailPanelId = Exclude<ContextRailPanel, null>;

/** Fallback when no panel is active. */
export const RAIL_WIDTH_DEFAULT = 440;
/** Notes — writing pane. */
export const RAIL_WIDTH_NOTES_DEFAULT = 400;
/** Files / project artifacts — roomier for browsing. */
export const RAIL_WIDTH_FILES_DEFAULT = 560;
/** Subsession list pane (not the chat). */
export const RAIL_WIDTH_SUBSESSIONS_DEFAULT = 400;
/** Sentinel: subsession chat opens as a 50/50 split until resized. */
export const RAIL_WIDTH_SUBSESSION_CHAT_HALF = 0;
export const RAIL_WIDTH_MIN = 280;
/** Allow half of wide desktops when the subsession chat is resized. */
export const RAIL_WIDTH_MAX = 1400;

export const RAIL_WIDTH_DEFAULTS: Record<ContextRailPanelId, number> = {
  notes: RAIL_WIDTH_NOTES_DEFAULT,
  files: RAIL_WIDTH_FILES_DEFAULT,
  subsessions: RAIL_WIDTH_SUBSESSIONS_DEFAULT,
  "subsession-chat": RAIL_WIDTH_SUBSESSION_CHAT_HALF,
};

/** Subsession chat uses 50/50 until the user resizes (width stored as 0). */
export function isSubsessionHalfSplit(
  panel: ContextRailPanel,
  width: number,
) {
  return panel === "subsession-chat" && width <= 0;
}

type ContextRailState = {
  panel: ContextRailPanel;
  /** Live width while a panel is open; reset to default on each open. */
  widths: Record<ContextRailPanelId, number>;
  setPanel: (panel: ContextRailPanel) => void;
  togglePanel: (panel: ContextRailPanelId) => void;
  setWidth: (width: number) => void;
  getWidth: (panel?: ContextRailPanelId) => number;
};

function clampWidth(width: number) {
  return Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, Math.round(width)));
}

function resetWidth(panel: ContextRailPanelId) {
  return RAIL_WIDTH_DEFAULTS[panel];
}

export const useContextRailStore = create<ContextRailState>()(
  persist(
    (set, get) => ({
      panel: null,
      widths: { ...RAIL_WIDTH_DEFAULTS },
      setPanel: (panel) => {
        if (!panel) {
          set({ panel: null });
          return;
        }
        set({
          panel,
          widths: {
            ...get().widths,
            [panel]: resetWidth(panel),
          },
        });
      },
      togglePanel: (panel) => {
        if (get().panel === panel) {
          set({ panel: null });
          return;
        }
        set({
          panel,
          widths: {
            ...get().widths,
            [panel]: resetWidth(panel),
          },
        });
      },
      setWidth: (width) => {
        const panel = get().panel;
        if (!panel) return;
        const next =
          panel === "subsession-chat" && width <= 0
            ? RAIL_WIDTH_SUBSESSION_CHAT_HALF
            : clampWidth(width);
        set({
          widths: {
            ...get().widths,
            [panel]: next,
          },
        });
      },
      getWidth: (panel) => {
        const id = panel ?? get().panel;
        if (!id) return RAIL_WIDTH_DEFAULT;
        return get().widths[id] ?? RAIL_WIDTH_DEFAULTS[id];
      },
    }),
    {
      name: "ai-rag-context-rail",
      // Width is session-only: each open snaps back to the panel default.
      partialize: () => ({}),
      merge: (_persisted, current) => ({ ...current, panel: null }),
    },
  ),
);
