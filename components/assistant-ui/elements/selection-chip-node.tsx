"use client";

import { type MouseEvent, type ReactNode } from "react";
import { MessageSquareIcon, XIcon } from "lucide-react";
import {
  $applyNodeReplacement,
  $createTextNode,
  $getNodeByKey,
  $isTextNode,
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export type SelectionChipPayload = {
  messageId: string;
  label: string;
  fullText: string;
};

export type SerializedSelectionChipNode = Spread<
  {
    messageId: string;
    label: string;
    fullText: string;
    type: "selection-chip";
    version: 1;
  },
  SerializedLexicalNode
>;

const ZWSP = "\u200B";

const chipClassName =
  "aui-selection-chip inline-flex h-5 max-w-[min(100%,14rem)] items-center gap-1 rounded-md bg-[#1b3f5c] py-0 ps-1.5 pe-0.5 align-middle text-[13px] leading-none text-[#b7d4ea]";

function SelectionChipView({
  nodeKey,
  label,
}: {
  nodeKey: NodeKey;
  label: string;
}) {
  const [editor] = useLexicalComposerContext();

  const remove = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!node) return;

      const prev = node.getPreviousSibling();
      const next = node.getNextSibling();
      const parent = node.getParent();
      node.remove();

      if ($isTextNode(next)) {
        next.select(0, 0);
        return;
      }
      if ($isTextNode(prev)) {
        const size = prev.getTextContentSize();
        prev.select(size, size);
        return;
      }

      const trail = $createTextNode(ZWSP);
      if (parent) {
        parent.append(trail);
      }
      trail.select(0, 0);
    });
    editor.focus();
  };

  return (
    <span
      className={chipClassName}
      contentEditable={false}
      data-selection-chip=""
    >
      <MessageSquareIcon
        className="size-3.5 shrink-0 text-[#6fa8cc]"
        strokeWidth={1.75}
      />
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        aria-label="Remove selection"
        className="flex size-4 shrink-0 items-center justify-center rounded-sm text-[#6fa8cc] transition-colors hover:bg-white/10 hover:text-[#d7ebf7]"
        onMouseDown={remove}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

export class SelectionChipNode extends DecoratorNode<ReactNode> {
  __messageId: string;
  __label: string;
  __fullText: string;

  static getType(): string {
    return "selection-chip";
  }

  static clone(node: SelectionChipNode): SelectionChipNode {
    return new SelectionChipNode(
      {
        messageId: node.__messageId,
        label: node.__label,
        fullText: node.__fullText,
      },
      node.__key,
    );
  }

  constructor(payload: SelectionChipPayload, key?: NodeKey) {
    super(key);
    this.__messageId = payload.messageId;
    this.__label = payload.label;
    this.__fullText = payload.fullText;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline";
    span.style.lineHeight = "0";
    span.style.verticalAlign = "middle";
    span.contentEditable = "false";
    span.setAttribute("data-selection-chip-host", "");
    return span;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  // Not isolated: caret can sit beside chips without Lexical trapping arrows.
  isIsolated(): false {
    return false;
  }

  isKeyboardSelectable(): false {
    return false;
  }

  getMessageId(): string {
    return this.__messageId;
  }

  getLabel(): string {
    return this.__label;
  }

  getFullText(): string {
    return this.__fullText;
  }

  getTextContent(): string {
    // Serialize as assistant-ui directive so sent messages can render chips.
    return `:selection[${this.__label}]{name=${this.__messageId}}`;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactNode {
    return <SelectionChipView nodeKey={this.__key} label={this.__label} />;
  }

  exportJSON(): SerializedSelectionChipNode {
    return {
      type: "selection-chip",
      version: 1,
      messageId: this.__messageId,
      label: this.__label,
      fullText: this.__fullText,
    };
  }

  static importJSON(serialized: SerializedSelectionChipNode): SelectionChipNode {
    return $createSelectionChipNode({
      messageId: serialized.messageId,
      label: serialized.label,
      fullText: serialized.fullText,
    });
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-selection-chip", this.__messageId);
    element.textContent = this.__label;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }
}

export function $createSelectionChipNode(
  payload: SelectionChipPayload,
): SelectionChipNode {
  return $applyNodeReplacement(new SelectionChipNode(payload));
}

export function $isSelectionChipNode(
  node: LexicalNode | null | undefined,
): node is SelectionChipNode {
  return node instanceof SelectionChipNode;
}

export { SelectionChipView };
