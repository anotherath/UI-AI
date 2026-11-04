"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ApiKey = {
  id: string;
  name: string;
  projectId: string | null;
  /** Full key shown once on create; otherwise only prefix is kept. */
  prefix: string;
  createdAt: number;
  lastUsedAt?: number;
};

type ApiKeysState = {
  keys: ApiKey[];
  /** Full secret only available right after create. */
  justCreated: { id: string; secret: string } | null;
  createKey: (input?: {
    name?: string;
    projectId?: string | null;
  }) => { id: string; secret: string };
  revokeKey: (id: string) => void;
  clearJustCreated: () => void;
};

function randomSegment(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      keys: [],
      justCreated: null,
      createKey: (input) => {
        const id = crypto.randomUUID();
        const secret = `sk_live_${randomSegment(32)}`;
        const prefix = `${secret.slice(0, 12)}…`;
        const projectId = input?.projectId ?? null;
        const next: ApiKey = {
          id,
          name: (
            input?.name?.trim() || `Key ${get().keys.length + 1}`
          ).slice(0, 60),
          projectId,
          prefix,
          createdAt: Date.now(),
        };
        set((state) => ({
          keys: [next, ...state.keys],
          justCreated: { id, secret },
        }));
        return { id, secret };
      },
      revokeKey: (id) =>
        set((state) => ({
          keys: state.keys.filter((key) => key.id !== id),
          justCreated:
            state.justCreated?.id === id ? null : state.justCreated,
        })),
      clearJustCreated: () => set({ justCreated: null }),
    }),
    {
      name: "ai-rag-api-keys",
      partialize: (state) => ({ keys: state.keys }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<ApiKeysState>;
        const keys = (stored.keys ?? []).map((key) => ({
          ...key,
          projectId: key.projectId ?? null,
        }));
        return { ...current, ...stored, keys, justCreated: null };
      },
    },
  ),
);
