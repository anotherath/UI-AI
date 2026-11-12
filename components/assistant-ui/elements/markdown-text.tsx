"use client";

import {
  StreamdownTextPrimitive,
  useIsStreamdownCodeBlock,
  escapeCurrencyDollars,
  normalizeMathDelimiters,
  type CodeHeaderProps,
  type StreamdownTextComponents,
  type StreamdownTextPrimitiveProps,
} from "@assistant-ui/react-streamdown";
import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import { createMathPlugin } from "@streamdown/math";
import { type FC, memo, useMemo, useRef } from "react";
import type { TextMessagePartProps } from "@assistant-ui/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import "katex/dist/katex.min.css";

import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

const math = createMathPlugin({
  // normalizeMathDelimiters rewrites \\(...\\) → $...$
  singleDollarTextMath: true,
  errorColor: "var(--color-muted-foreground)",
});

/** `\left[`, `\big[`, … — must not be rewritten as math delimiters. */
const LATEX_SIZING_BEFORE_BRACKET =
  /\\(?:left|right|big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr|biggl|biggr|Biggl|Biggr)\s*$/;

/**
 * Models often emit display math as bare `[ \\int ... ]` (no backslash).
 * Convert those to $$ / $ when the body looks like LaTeX — leave markdown
 * links `[text](url)` and TeX `\left[...\right]` alone.
 */
function rewriteBareBracketLatex(text: string): string {
  return text.replace(
    /\[([^\]\n]*\\[a-zA-Z][^\]\n]*)\](?!\()/g,
    (match, body: string, offset: number, full: string) => {
      const trimmed = body.trim();
      if (!trimmed) return match;
      // `\[` display opener / already-TeX bracket — handled elsewhere.
      if (offset > 0 && full[offset - 1] === "\\") return match;
      const prefix = full.slice(Math.max(0, offset - 16), offset);
      if (LATEX_SIZING_BEFORE_BRACKET.test(prefix)) return match;

      const lineStart = full.lastIndexOf("\n", offset - 1) + 1;
      const lineEndIdx = full.indexOf("\n", offset + match.length);
      const lineEnd = lineEndIdx === -1 ? full.length : lineEndIdx;
      const before = full.slice(lineStart, offset).trim();
      const after = full.slice(offset + match.length, lineEnd).trim();
      if (!before && !after) return `$$\n${trimmed}\n$$`;
      return `$${trimmed}$`;
    },
  );
}

/**
 * Wrap bare `\\begin{env}...\\end{env}` in $$ when the model forgot fences.
 * Must run AFTER normalizeMathDelimiters so `\\[...\\]` is already `$$...$$`
 * — otherwise we double-fence and Streamdown parses empty math + raw body.
 */
function wrapBareLatexEnvironments(text: string): string {
  return text.replace(
    /\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g,
    (match, _env: string, offset: number, full: string) => {
      const prev = full.slice(Math.max(0, offset - 16), offset);
      // Already fenced by $$ or \[ …
      if (/\$\$\s*$/.test(prev) || /\\\[\s*$/.test(prev)) return match;
      // Inside an open $$ pair from earlier in the message.
      const fencesBefore = full.slice(0, offset).match(/\$\$/g)?.length ?? 0;
      if (fencesBefore % 2 === 1) return match;
      return `$$\n${match}\n$$`;
    },
  );
}

function preprocessMarkdownMath(text: string): string {
  return escapeCurrencyDollars(
    wrapBareLatexEnvironments(
      normalizeMathDelimiters(rewriteBareBracketLatex(text)),
    ),
  );
}

type MarkdownTextProps = Partial<TextMessagePartProps> & {
  components?: StreamdownTextComponents;
  componentsByLanguage?: StreamdownTextPrimitiveProps["componentsByLanguage"];
};

const useShallowStable = <T extends Record<string, unknown> | undefined>(
  value: T,
): T => {
  const ref = useRef(value);
  if (value !== ref.current) {
    const prev = ref.current;
    const stable =
      value !== undefined &&
      prev !== undefined &&
      Object.keys(prev).length === Object.keys(value).length &&
      Object.keys(value).every((key) => prev[key] === value[key]);
    if (!stable) ref.current = value;
  }
  return ref.current;
};

/**
 * Vercel Streamdown path (same family as AI Elements / Cursor-class UIs):
 * completed markdown blocks stay memoized; only the trailing block grows;
 * new words blur/fade in instead of re-parsing the whole message.
 */
const MarkdownTextImpl: FC<MarkdownTextProps> = ({
  components,
  componentsByLanguage,
}) => {
  const stableComponents = useShallowStable(components);
  const stableComponentsByLanguage = useShallowStable(componentsByLanguage);
  const markdownComponents = useMemo((): StreamdownTextComponents => {
    if (!stableComponents) return defaultComponents;
    return {
      ...defaultComponents,
      ...stableComponents,
    };
  }, [stableComponents]);

  return (
    <StreamdownTextPrimitive
      mode="streaming"
      className="aui-md"
      plugins={{ code, cjk, math }}
      preprocess={preprocessMarkdownMath}
      shikiTheme={["github-light", "github-dark"]}
      components={markdownComponents}
      componentsByLanguage={stableComponentsByLanguage}
      controls={false}
      // Word entrance only (Streamdown memoizes finished blocks). Prefer
      // fade over blur — filter:blur on every token is layout/GPU heavy.
      animated={{
        animation: "fadeIn",
        duration: 150,
        easing: "ease-out",
      }}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code: codeText }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!codeText || isCopied) return;
    copyToClipboard(codeText);
  };

  return (
    <div className="aui-code-header-root border-border/50 bg-muted/50 mt-3 flex items-center justify-between rounded-t-xl border border-b-0 px-3.5 py-1.5 text-xs">
      <span className="aui-code-header-language text-muted-foreground font-medium lowercase">
        {language}
      </span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && (
          <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
        )}
        {isCopied && (
          <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
        )}
      </TooltipIconButton>
    </div>
  );
};

const defaultComponents = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "aui-md-h1 mt-5 mb-2 scroll-m-20 text-xl font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "aui-md-h2 mt-5 mb-2 scroll-m-20 text-lg font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "aui-md-h3 mt-4 mb-1.5 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "aui-md-h4 mt-3.5 mb-1 scroll-m-20 text-base font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "aui-md-h5 mt-3 mb-1 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "aui-md-h6 mt-3 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "aui-md-p my-3 leading-relaxed first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "aui-md-a text-blue-500 hover:text-blue-400 underline underline-offset-2",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "aui-md-ul marker:text-muted-foreground my-3 ms-5 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-md-ol marker:text-muted-foreground my-3 ms-5 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("aui-md-hr border-muted-foreground/20 my-3", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="aui-md-table-wrapper my-3 overflow-x-auto">
      <table
        className={cn(
          "aui-md-table w-full border-separate border-spacing-0",
          className,
        )}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-md-th bg-muted px-3 py-1.5 text-start font-medium first:rounded-ss-lg last:rounded-se-lg [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-md-td border-muted-foreground/20 border-s border-b px-3 py-1.5 text-start last:border-e [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-es-lg [&:last-child>td:last-child]:rounded-ee-lg",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("aui-md-li leading-relaxed", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("aui-md-strong font-semibold", className)}
      {...props}
    />
  ),
  sup: ({ className, ...props }) => (
    <sup
      className={cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsStreamdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
} as StreamdownTextComponents;

/** Same styles without StreamdownTextPrimitive hooks (subsession / plain Streamdown). */
const standaloneComponents = {
  ...defaultComponents,
  code: function StandaloneCode({ className, ...props }) {
    const isCodeBlock =
      typeof className === "string" && /\blanguage-/.test(className);
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
} as StreamdownTextComponents;

/** Standalone markdown (subsession / non–MessagePrimitive contexts). */
const StandaloneMarkdownTextImpl: FC<{
  text: string;
  className?: string;
  /** Word entrance — only while the reply is still streaming. */
  animated?: boolean;
}> = ({ text, className, animated = false }) => {
  const content = useMemo(() => preprocessMarkdownMath(text), [text]);
  return (
    <Streamdown
      className={cn("aui-md", className)}
      plugins={{ code, cjk, math }}
      shikiTheme={["github-light", "github-dark"]}
      components={standaloneComponents}
      controls={false}
      // Hydrated / complete messages must NOT animate: Streamdown word
      // entrance on a finished blob inflates block height into tens of kpx
      // and buries the action footer below the sticky composer.
      {...(animated
        ? {
            animated: {
              animation: "fadeIn" as const,
              duration: 150,
              easing: "ease-out",
            },
          }
        : { animated: false })}
    >
      {content}
    </Streamdown>
  );
};

export const StandaloneMarkdownText = memo(StandaloneMarkdownTextImpl);
