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
] as const;

export type ComposerModeId = (typeof COMPOSER_MODES)[number]["id"];

/** Placeholder catalog — not wired to any provider yet. */
export const COMPOSER_MODELS = [
  { id: "auto", label: "Auto" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "claude-sonnet", label: "Claude Sonnet" },
  { id: "gemini-pro", label: "Gemini Pro" },
  { id: "deepseek", label: "DeepSeek" },
] as const;

export type ComposerModelId = (typeof COMPOSER_MODELS)[number]["id"];

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
  model: ComposerModelId;
  aspect: ComposerAspectId;
  setMode: (mode: ComposerModeId) => void;
  setModel: (model: ComposerModelId) => void;
  setAspect: (aspect: ComposerAspectId) => void;
};

export const useComposerPrefsStore = create<ComposerPrefsState>()(
  persist(
    (set) => ({
      mode: "auto",
      model: "auto",
      aspect: "1:1",
      setMode: (mode) => set({ mode }),
      setModel: (model) => set({ model }),
      setAspect: (aspect) => set({ aspect }),
    }),
    { name: "ai-rag-composer-prefs" },
  ),
);
