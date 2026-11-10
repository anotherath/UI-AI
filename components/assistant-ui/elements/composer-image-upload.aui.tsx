"use client";

import { useRef, type FC } from "react";
import { ImageIcon } from "lucide-react";
import { useComposerAddAttachment } from "@assistant-ui/core/react";
import { cn } from "@/lib/utils";

/**
 * Imagine composer control — opens the native image picker.
 * Replaces the old + mode menu on this surface.
 */
export const ComposerImageUploadButton: FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { addAttachment, disabled } = useComposerAddAttachment();

  return (
    <>
      <button
        type="button"
        aria-label="Upload image"
        disabled={disabled}
        className={cn(
          "aui-composer-add-attachment inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/15 hover:text-foreground dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 active:scale-[0.96] motion-reduce:transition-none",
          disabled && "pointer-events-none opacity-50",
        )}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon className="size-4" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
        tabIndex={-1}
        aria-hidden
        onChange={async (event) => {
          const files = event.target.files;
          if (!files?.length) return;
          await Promise.all(
            Array.from(files).map(async (file) => {
              try {
                await addAttachment(file);
              } catch {
                // Ignore rejected files.
              }
            }),
          );
          event.target.value = "";
        }}
      />
    </>
  );
};
