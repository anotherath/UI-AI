"use client";

import type { FC } from "react";
import { KeyRoundIcon } from "lucide-react";

export const ApiPage: FC = () => {
  return (
    <div
      data-slot="aui_api-page"
      className="mx-auto flex w-full max-w-[920px] flex-1 flex-col pb-10"
    >
      <div className="mb-5">
        <h2 className="text-[28px] font-semibold tracking-tight text-zinc-50">
          API
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Create keys to call the chat and RAG endpoints from your apps.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400">
          <KeyRoundIcon className="size-6" strokeWidth={1.5} />
        </div>
        <p className="text-base font-medium text-zinc-100">Coming soon</p>
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
          API keys and external access are on the way.
        </p>
      </div>
    </div>
  );
};
