"use client";

import type { ReactNode } from "react";
import { AiMark } from "@/components/brand/ai-mark";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleIcon } from "@/components/auth/google-icon";

export function LoginGate({ children }: { children: ReactNode }) {
  const { isBootstrapping, user, loginWithGoogle } = useAuth();
  const locked = !user && !isBootstrapping;

  return (
    <div className="relative h-dvh w-full">
      <div
        className={
          locked
            ? "h-dvh w-full overflow-hidden select-none"
            : "h-dvh w-full"
        }
        aria-hidden={locked || undefined}
      >
        {children}
      </div>

      {locked ? (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-[#121214]/35 px-6 backdrop-blur-[6px] duration-300 fade-in-0">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            aria-describedby="login-desc"
            className="flex w-full max-w-md animate-in flex-col items-center text-center duration-500 fade-in-0 zoom-in-95 slide-in-from-bottom-2 fill-mode-both"
          >
            <AiMark className="size-11 text-white" />

            <h1
              id="login-title"
              className="mt-6 text-[2rem] font-semibold tracking-tight text-zinc-50 sm:text-[2.25rem]"
            >
              Another Intelligence
            </h1>

            <p
              id="login-desc"
              className="mt-3 max-w-sm text-[15px] leading-relaxed text-zinc-400"
            >
              Sign in to keep projects, library, and chats with you.
            </p>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="mt-9 flex h-12 w-full max-w-xs items-center justify-center gap-3 rounded-full border border-white/10 bg-[#1c1c21] text-[15px] font-medium text-zinc-100 transition-colors hover:border-white/20 hover:bg-[#24242a]"
            >
              <GoogleIcon className="size-[18px]" />
              Continue with Google
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
