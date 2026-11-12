"use client";

import {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type FC,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useAui, useAuiState } from "@assistant-ui/react";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from "lexical";
import {
  $createSelectionChipNode,
  $isSelectionChipNode,
  SelectionChipNode,
} from "@/components/assistant-ui/elements/selection-chip-node";
import { selectionDirectiveLabel } from "@/components/assistant-ui/elements/selection-chip";
import { useSelectionChipInsertStore } from "@/lib/selection-chip-insert-store";
import { cn } from "@/lib/utils";

/** Keeps a stable caret target beside chips (empty text nodes get collapsed). */
const ZWSP = "\u200B";

/**
 * Lexical owns the live draft. Composer / standalone stores stay in sync so
 * Send/Enter never ship a stale first-character snapshot.
 */
const flushByScope = new Map<string, () => string>();

/** Flush Lexical → draft store; returns the serialized text. */
export function flushInlineComposerDraft(scope = "main"): string {
  return flushByScope.get(scope)?.() ?? "";
}

function readEditorText(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => serializeEditor());
}

function serializeEditor(): string {
  const root = $getRoot();
  let out = "";
  let line = 0;
  for (const paragraph of root.getChildren()) {
    if (!$isElementNode(paragraph)) continue;
    if (line > 0) out += "\n";
    line += 1;
    for (const child of paragraph.getChildren()) {
      out += child.getTextContent();
    }
  }
  return out.replaceAll(ZWSP, "");
}

function isCaretPad(node: TextNode) {
  const text = node.getTextContent();
  return text.length === 0 || text === ZWSP;
}

function ensureTextAfter(node: LexicalNode): TextNode {
  const next = node.getNextSibling();
  if ($isTextNode(next)) {
    if (next.getTextContentSize() === 0) next.setTextContent(ZWSP);
    return next;
  }
  const text = $createTextNode(ZWSP);
  node.insertAfter(text);
  return text;
}

function ensureTextBefore(node: LexicalNode): TextNode {
  const prev = node.getPreviousSibling();
  if ($isTextNode(prev)) {
    if (prev.getTextContentSize() === 0) prev.setTextContent(ZWSP);
    return prev;
  }
  const text = $createTextNode(ZWSP);
  node.insertBefore(text);
  return text;
}

function selectAfterChip(chip: LexicalNode) {
  const text = ensureTextAfter(chip);
  // Sit at the start of the trailing pad/text so the caret is right after the chip.
  text.select(0, 0);
}

function selectBeforeChip(chip: LexicalNode) {
  const text = ensureTextBefore(chip);
  const size = text.getTextContentSize();
  text.select(size, size);
}

/**
 * ←/→ always land in a real text node beside the chip — never "on" the decorator.
 * Works with empty editor, text only on one side, or text on both sides.
 */
function ChipNavPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const { anchor } = selection;
          const node = anchor.getNode();

          if ($isSelectionChipNode(node)) {
            event?.preventDefault();
            selectBeforeChip(node);
            return true;
          }

          if (!$isTextNode(node) || anchor.offset !== 0) return false;

          const prev = node.getPreviousSibling();
          if ($isSelectionChipNode(prev)) {
            event?.preventDefault();
            selectBeforeChip(prev);
            return true;
          }

          // Skip a ZWSP pad sitting between caret and chip.
          if ($isTextNode(prev) && isCaretPad(prev)) {
            const beforePad = prev.getPreviousSibling();
            if ($isSelectionChipNode(beforePad)) {
              event?.preventDefault();
              selectBeforeChip(beforePad);
              return true;
            }
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const { anchor } = selection;
          const node = anchor.getNode();

          if ($isSelectionChipNode(node)) {
            event?.preventDefault();
            selectAfterChip(node);
            return true;
          }

          if (!$isTextNode(node)) return false;
          if (anchor.offset !== node.getTextContentSize()) return false;

          const next = node.getNextSibling();
          if ($isSelectionChipNode(next)) {
            event?.preventDefault();
            selectAfterChip(next);
            return true;
          }

          if ($isTextNode(next) && isCaretPad(next)) {
            const afterPad = next.getNextSibling();
            if ($isSelectionChipNode(afterPad)) {
              event?.preventDefault();
              selectAfterChip(afterPad);
              return true;
            }
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor]);

  return null;
}

/** Backspace / Delete remove the chip when the caret is flush against it. */
function ChipDeletePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const { anchor } = selection;
          const node = anchor.getNode();

          if ($isSelectionChipNode(node)) {
            event?.preventDefault();
            const before = ensureTextBefore(node);
            node.remove();
            const size = before.getTextContentSize();
            before.select(size, size);
            return true;
          }

          if (!$isTextNode(node) || anchor.offset !== 0) return false;

          const prev = node.getPreviousSibling();
          if ($isSelectionChipNode(prev)) {
            event?.preventDefault();
            const before = ensureTextBefore(prev);
            prev.remove();
            const size = before.getTextContentSize();
            before.select(size, size);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const { anchor } = selection;
          const node = anchor.getNode();

          if ($isSelectionChipNode(node)) {
            event?.preventDefault();
            const after = ensureTextAfter(node);
            node.remove();
            after.select(0, 0);
            return true;
          }

          if (!$isTextNode(node)) return false;
          if (anchor.offset !== node.getTextContentSize()) return false;

          const next = node.getNextSibling();
          if ($isSelectionChipNode(next)) {
            event?.preventDefault();
            const after = ensureTextAfter(next);
            next.remove();
            after.select(0, 0);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor]);

  return null;
}

function EnterToSendPlugin({
  scope,
  onEnter,
}: {
  scope: string;
  onEnter?: (() => void) | undefined;
}) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event || event.shiftKey) return false;
        if (event.isComposing || event.keyCode === 229) return false;
        event.preventDefault();
        // Flush cancels any pending rAF sync so send cannot race a stale draft.
        flushInlineComposerDraft(scope);
        if (onEnterRef.current) {
          onEnterRef.current();
        } else {
          aui.composer.send();
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, aui, scope]);

  return null;
}

/** When opening edit mode, composer already has text — seed Lexical once. */
function SeedFromComposerPlugin() {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const text = aui.composer.getState().text;
    if (!text) return;
    editor.update(() => {
      if (serializeEditor() !== "") return;
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      root.append(paragraph);
      root.selectEnd();
    });
  }, [aui, editor]);

  return null;
}

function SyncToComposerPlugin({ scope }: { scope: string }) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const composerEmpty = useAuiState((s) => s.composer.isEmpty);
  const lastEmptyRef = useRef(true);

  const applyText = useCallback(
    (next: string) => {
      if (next !== aui.composer.getState().text) {
        aui.composer.setText(next);
      }
      lastEmptyRef.current = next.length === 0;
    },
    [aui],
  );

  const flushNow = useCallback(() => {
    const next = readEditorText(editor);
    applyText(next);
    return next;
  }, [applyText, editor]);

  useEffect(() => {
    flushByScope.set(scope, flushNow);
    lastEmptyRef.current = aui.composer.getState().isEmpty;
    return () => {
      if (flushByScope.get(scope) === flushNow) flushByScope.delete(scope);
    };
  }, [flushNow, aui, scope]);

  const onChange = useCallback(
    (editorState: EditorState) => {
      // Sync immediately so Welcome / Send never see a stale empty store while
      // Lexical already shows the draft (paste looked like a message overlay).
      editorState.read(() => {
        applyText(serializeEditor());
      });
    },
    [applyText],
  );

  // After send, composer clears — mirror that into Lexical.
  useEffect(() => {
    if (!composerEmpty) return;
    lastEmptyRef.current = true;
    editor.update(() => {
      if (serializeEditor() === "") return;
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode());
    });
  }, [composerEmpty, editor]);

  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
}

/** Standalone (subsession) draft — never touches the main aui.composer store. */
function SyncToStandalonePlugin({
  scope,
  onTextChange,
  clearToken,
}: {
  scope: string;
  onTextChange: (text: string) => void;
  clearToken?: number;
}) {
  const [editor] = useLexicalComposerContext();
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  const applyText = useCallback((next: string) => {
    onTextChangeRef.current(next);
  }, []);

  const flushNow = useCallback(() => {
    const next = readEditorText(editor);
    applyText(next);
    return next;
  }, [applyText, editor]);

  useEffect(() => {
    flushByScope.set(scope, flushNow);
    return () => {
      if (flushByScope.get(scope) === flushNow) flushByScope.delete(scope);
    };
  }, [flushNow, scope]);

  const onChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        applyText(serializeEditor());
      });
    },
    [applyText],
  );

  useEffect(() => {
    if (clearToken == null || clearToken === 0) return;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode());
    });
    applyText("");
  }, [clearToken, editor, applyText]);

  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
}

function InsertChipPlugin({
  scope,
}: {
  scope: "main" | "subsession";
}) {
  const [editor] = useLexicalComposerContext();
  const pending = useSelectionChipInsertStore((s) => s.pending);
  const consume = useSelectionChipInsertStore((s) => s.consume);

  useEffect(() => {
    if (!pending || pending.scope !== scope) return;
    const chip = consume(scope);
    if (!chip) return;

    editor.update(() => {
      const selection = $getSelection();
      const chipNode = $createSelectionChipNode(chip);
      // Space after chip so typing starts with a natural gap (Cursor-style).
      const trail = $createTextNode(" ");

      if ($isRangeSelection(selection)) {
        selection.insertNodes([chipNode, trail]);
        trail.select(1, 1);
      } else {
        const root = $getRoot();
        const first = root.getFirstChild();
        const paragraph = $isElementNode(first)
          ? first
          : $createParagraphNode();
        if (!$isElementNode(first)) {
          root.clear();
          root.append(paragraph);
        }
        paragraph.append(chipNode, trail);
        trail.select(1, 1);
      }
    });
    editor.focus();
  }, [pending, consume, editor, scope]);

  return null;
}

function AutoFocusPlugin({ autoFocus }: { autoFocus: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (autoFocus) editor.focus();
  }, [autoFocus, editor]);
  return null;
}

export function requestSelectionChipInsert(payload: {
  messageId: string;
  text: string;
  scope?: "main" | "subsession";
}) {
  useSelectionChipInsertStore.getState().requestInsert({
    messageId: payload.messageId,
    label: selectionDirectiveLabel(payload.text),
    fullText: payload.text,
    scope: payload.scope ?? "main",
  });
}

type InlineChipComposerInputProps = {
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  /** Override Enter (after draft flush). Default: aui.composer.send(). */
  onEnter?: () => void;
  /**
   * Which insert-queue + flush map this editor owns.
   * Use `"subsession"` for the rail composer so chips don't land in main.
   */
  scope?: "main" | "subsession";
  /**
   * Standalone mode (subsession): sync Lexical → local draft instead of
   * aui.composer. Required together with `onEnter` for send.
   */
  onTextChange?: (text: string) => void;
  /** Bump after send to clear Lexical in standalone mode. */
  clearToken?: number;
};

export const InlineChipComposerInput: FC<InlineChipComposerInputProps> = ({
  autoFocus = false,
  placeholder = "Ask anything",
  className,
  "aria-label": ariaLabel = "Message input",
  onEnter,
  scope = "main",
  onTextChange,
  clearToken,
}) => {
  const standalone = Boolean(onTextChange);
  const initialConfig = useMemo(
    () => ({
      namespace: `aui-selection-chip-composer-${scope}`,
      onError(error: Error) {
        console.error("[InlineChipComposerInput]", error);
      },
      nodes: [SelectionChipNode],
    }),
    [scope],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn("aui-lexical-editor relative", className)}>
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className="aui-lexical-input outline-none"
              aria-label={ariaLabel}
              aria-placeholder={placeholder}
              spellCheck={false}
              placeholder={
                <div className="aui-lexical-placeholder pointer-events-none absolute top-2 left-3 text-zinc-500">
                  {placeholder}
                </div>
              }
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ChipNavPlugin />
        <ChipDeletePlugin />
        <EnterToSendPlugin scope={scope} onEnter={onEnter} />
        {standalone && onTextChange ? (
          <SyncToStandalonePlugin
            scope={scope}
            onTextChange={onTextChange}
            clearToken={clearToken}
          />
        ) : (
          <>
            <SeedFromComposerPlugin />
            <SyncToComposerPlugin scope={scope} />
          </>
        )}
        <InsertChipPlugin scope={scope} />
        <AutoFocusPlugin autoFocus={autoFocus} />
      </div>
    </LexicalComposer>
  );
};
