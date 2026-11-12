"use client";

import { create } from "zustand";
import {
  listCatalogModels,
  type CatalogModel,
} from "@/lib/chat-api";
import { useComposerPrefsStore } from "@/lib/composer-prefs-store";

export type ComposerModelOption = {
  id: string;
  label: string;
};

/** Matches backend default until GET /models returns. */
export const FALLBACK_CATALOG_MODEL: ComposerModelOption = {
  id: "vibi:gpt-6-luna",
  label: "GPT-6 Luna",
};

const INITIAL_OPTIONS: ComposerModelOption[] = [FALLBACK_CATALOG_MODEL];

type ModelsState = {
  items: CatalogModel[];
  /** Catalog rows — stable reference until fetch updates. */
  options: ComposerModelOption[];
  defaultId: string;
  isLoading: boolean;
  error: string | null;
  fetchedAt: number | null;
  fetchModels: () => Promise<void>;
};

function buildOptions(items: CatalogModel[]): ComposerModelOption[] {
  return items.map((item) => ({ id: item.id, label: item.label }));
}

function sanitizeComposerModel(items: CatalogModel[], defaultId: string) {
  const prefs = useComposerPrefsStore.getState();
  const fallback =
    (defaultId && items.some((item) => item.id === defaultId)
      ? defaultId
      : items[0]?.id) ?? FALLBACK_CATALOG_MODEL.id;
  if (!items.some((item) => item.id === prefs.model)) {
    prefs.setModel(fallback);
  }
  if (!items.some((item) => item.id === prefs.subsessionModel)) {
    prefs.setSubsessionModel(fallback);
  }
}

export const useModelsStore = create<ModelsState>((set, get) => ({
  items: [],
  options: INITIAL_OPTIONS,
  defaultId: FALLBACK_CATALOG_MODEL.id,
  isLoading: false,
  error: null,
  fetchedAt: null,
  fetchModels: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const page = await listCatalogModels();
      const options =
        page.items.length > 0
          ? buildOptions(page.items)
          : INITIAL_OPTIONS;
      const defaultId =
        page.default ||
        page.items.find((item) => item.is_default)?.id ||
        options[0]?.id ||
        FALLBACK_CATALOG_MODEL.id;
      sanitizeComposerModel(
        page.items.length > 0
          ? page.items
          : [
              {
                id: FALLBACK_CATALOG_MODEL.id,
                provider: "vibi",
                provider_label: "Vibi",
                label: FALLBACK_CATALOG_MODEL.label,
                is_default: true,
              },
            ],
        defaultId,
      );
      set({
        items: page.items,
        options,
        defaultId,
        isLoading: false,
        fetchedAt: Date.now(),
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list models";
      // Keep Luna visible if the catalog request fails.
      sanitizeComposerModel(
        [
          {
            id: FALLBACK_CATALOG_MODEL.id,
            provider: "vibi",
            provider_label: "Vibi",
            label: FALLBACK_CATALOG_MODEL.label,
            is_default: true,
          },
        ],
        FALLBACK_CATALOG_MODEL.id,
      );
      set({
        isLoading: false,
        error: message,
        options: INITIAL_OPTIONS,
        defaultId: FALLBACK_CATALOG_MODEL.id,
      });
    }
  },
}));
