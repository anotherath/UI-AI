"use client";

import { MessageSquareIcon } from "lucide-react";
import {
  defaultDirectiveFormatter,
  type TextMessagePartComponent,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";

export const SELECTION_DIRECTIVE_TYPE = "selection";

export function selectionDirectiveLabel(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 1024);
}

export function formatSelectionDirective(text: string, messageId: string) {
  return defaultDirectiveFormatter.serialize({
    type: SELECTION_DIRECTIVE_TYPE,
    id: messageId,
    label: selectionDirectiveLabel(text),
  });
}

/**
 * Expand `:selection[...]{name=...}` chips into plain text for the model.
 * UI / stored messages keep the directive so chips still render.
 */
export function expandSelectionDirectivesForAgent(text: string): string {
  if (!text.includes(":selection[")) return text;
  const segments = defaultDirectiveFormatter.parse(text);
  const quotes: string[] = [];
  const rest: string[] = [];
  let sawSelection = false;
  for (const segment of segments) {
    if (segment.kind === "mention" && segment.type === SELECTION_DIRECTIVE_TYPE) {
      sawSelection = true;
      const label = selectionDirectiveLabel(segment.label);
      if (label) quotes.push(label);
      continue;
    }
    if (segment.kind === "text") rest.push(segment.text);
  }
  if (!sawSelection) return text;
  const question = rest.join("").replace(/\s+/g, " ").trim();
  const excerpt = quotes.map((q) => `"${q}"`).join("\n");
  if (!excerpt) return question || text;
  if (!question) return `Regarding this selected text:\n${excerpt}`;
  return `Regarding this selected text:\n${excerpt}\n\n${question}`;
}

const chipClassName =
  "aui-selection-chip inline-flex h-5 max-w-[min(100%,14rem)] items-center gap-1 rounded-md bg-[#1b3f5c] py-0 ps-1.5 pe-1.5 text-[13px] leading-none text-[#b7d4ea]";

/** Renders selection directives as chips inside sent user messages. */
export const SelectionAwareText: TextMessagePartComponent = ({ text }) => {
  const segments = defaultDirectiveFormatter.parse(text);
  const hasMention = segments.some((segment) => segment.kind === "mention");
  if (!hasMention) return text;

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={`t-${index}`}>{segment.text}</span>;
        }
        return (
          <span
            key={`m-${index}-${segment.id}`}
            className={cn(chipClassName, "my-0.5")}
            data-directive-type={segment.type}
            data-directive-id={segment.id}
          >
            <MessageSquareIcon
              className="size-3.5 shrink-0 text-[#6fa8cc]"
              strokeWidth={1.75}
            />
            <span className="min-w-0 truncate">{segment.label}</span>
          </span>
        );
      })}
    </>
  );
};
