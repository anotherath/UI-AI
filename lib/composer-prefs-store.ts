"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const COMPOSER_MODES = [
  { id: "auto", label: "Auto" },
  { id: "flash", label: "Flash" },
  { id: "search", label: "Search" },
  { id: "plan", label: "Plan" },
  { id: "retrieve", label: "Retrieve" },
  { id: "imagine", label: "Imagine" },
  { id: "slides", label: "Slides" },
  { id: "website", label: "Website" },
  { id: "research", label: "Research" },
] as const;

export type ComposerModeId = (typeof COMPOSER_MODES)[number]["id"];

/** Catalog id (`provider:model`). Defaults to Luna until catalog syncs. */
export type ComposerModelId = string;

const DEFAULT_COMPOSER_MODEL: ComposerModelId = "vibi:gpt-6-luna";

/** Aspect ratios for Imagine — UI only for now. */
export const COMPOSER_ASPECTS = [
  { id: "1:1", label: "1:1" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" },
  { id: "3:2", label: "3:2" },
  { id: "2:3", label: "2:3" },
] as const;

export type ComposerAspectId = (typeof COMPOSER_ASPECTS)[number]["id"];

type ComposerPrefsState = {
  mode: ComposerModeId;
  /** Main thread model. */
  model: ComposerModelId;
  /** Subsession rail model — independent from main. */
  subsessionModel: ComposerModelId;
  aspect: ComposerAspectId;
  setMode: (mode: ComposerModeId) => void;
  setModel: (model: ComposerModelId) => void;
  setSubsessionModel: (model: ComposerModelId) => void;
  setAspect: (aspect: ComposerAspectId) => void;
};

export const useComposerPrefsStore = create<ComposerPrefsState>()(
  persist(
    (set) => ({
      mode: "auto",
      model: DEFAULT_COMPOSER_MODEL,
      subsessionModel: DEFAULT_COMPOSER_MODEL,
      aspect: "1:1",
      setMode: (mode) => set({ mode }),
      setModel: (model) => set({ model }),
      setSubsessionModel: (model) => set({ subsessionModel: model }),
      setAspect: (aspect) => set({ aspect }),
    }),
    { name: "ai-rag-composer-prefs" },
  ),
);
