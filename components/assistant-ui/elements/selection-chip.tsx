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

/**
 * Sent-message chip: hard-cap display length so w-fit bubbles size to the
 * visible chip, not the full label (CSS truncate alone does not shrink
 * intrinsic width). Composer Lexical chips keep CSS-only truncate.
 */
const MESSAGE_CHIP_LABEL_MAX = 36;

function truncateChipLabel(label: string) {
  const trimmed = label.replace(/\s+/g, " ").trim();
  if (trimmed.length <= MESSAGE_CHIP_LABEL_MAX) return trimmed;
  return `${trimmed.slice(0, MESSAGE_CHIP_LABEL_MAX - 1)}…`;
}

const messageChipClassName =
  "aui-selection-chip inline-flex h-5 min-w-0 max-w-[14rem] items-center gap-1 overflow-hidden rounded-md bg-[#1b3f5c] py-0 ps-1.5 pe-1.5 text-[13px] leading-none text-[#b7d4ea]";

/** Renders selection directives inside sent user messages. */
export const SelectionAwareText: TextMessagePartComponent = ({ text }) => {
  const segments = defaultDirectiveFormatter.parse(text);
  const quotes = segments.filter(
    (segment) =>
      segment.kind === "mention" && segment.type === SELECTION_DIRECTIVE_TYPE,
  );
  if (quotes.length === 0) return text;

  const question = segments
    .filter((segment) => segment.kind === "text")
    .map((segment) => (segment.kind === "text" ? segment.text : ""))
    .join("")
    .replace(/^\s+/, "")
    .trim();

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {quotes.map((segment) => {
        if (segment.kind !== "mention") return null;
        return (
          <span
            key={`m-${segment.id}`}
            className={messageChipClassName}
            data-directive-type={segment.type}
            data-directive-id={segment.id}
            title={segment.label}
          >
            <MessageSquareIcon
              className="size-3.5 shrink-0 text-[#6fa8cc]"
              strokeWidth={1.75}
            />
            <span className="min-w-0 truncate">
              {truncateChipLabel(segment.label)}
            </span>
          </span>
        );
      })}
      {question ? (
        <span className="min-w-0 whitespace-pre-wrap">{question}</span>
      ) : null}
    </span>
  );
};
