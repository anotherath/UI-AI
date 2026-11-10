"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FC } from "react";
import { GitBranchIcon, MessageSquareQuoteIcon } from "lucide-react";
import { useAui } from "@assistant-ui/react";
import { requestSelectionChipInsert } from "@/components/assistant-ui/elements/inline-chip-composer-input";
import { useContextRailStore } from "@/lib/context-rail-store";
import { useSubsessionsStore } from "@/lib/subsessions-store";

type SelectionTarget = {
  text: string;
  messageId: string;
  rect: DOMRect;
};

type MenuPosition = { left: number; top: number };

function readAssistantSelection(): SelectionTarget | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (text.length < 2) return null;

  const range = selection.getRangeAt(0);
  const node =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!node) return null;

  const messageRoot = node.closest<HTMLElement>(
    '[data-role="assistant"][data-message-id]',
  );
  if (!messageRoot) return null;

  const messageId = messageRoot.dataset.messageId;
  if (!messageId) return null;

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return { text, messageId, rect };
}

function positionForRect(
  rect: DOMRect,
  menuWidth: number,
  menuHeight: number,
): MenuPosition {
  const padding = 8;
  let left = rect.left + rect.width / 2 - menuWidth / 2;
  let top = rect.top - menuHeight - 10;

  left = Math.min(
    Math.max(padding, left),
    window.innerWidth - menuWidth - padding,
  );
  if (top < padding) {
    top = rect.bottom + 10;
  }

  return { left, top };
}

/**
 * Floating actions when the user highlights text inside an assistant message:
 * ask here, or ask in a subsession.
 */
export const SelectionAskMenu: FC = () => {
  const aui = useAui();
  const setPanel = useContextRailStore((s) => s.setPanel);
  const openFork = useSubsessionsStore((s) => s.openFork);
  const setPendingQuote = useSubsessionsStore((s) => s.setPendingQuote);

  const [target, setTarget] = useState<SelectionTarget | null>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [visible, setVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ignoreNextClear = useRef(false);

  useEffect(() => {
    // Only reveal the menu after selection finishes (mouseup / touchend),
    // not while the user is still dragging to highlight.
    const showIfReady = () => {
      if (ignoreNextClear.current) {
        ignoreNextClear.current = false;
        return;
      }
      setVisible(false);
      setPosition(null);
      setTarget(readAssistantSelection());
    };

    const onSelectionChange = () => {
      if (ignoreNextClear.current) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setVisible(false);
        setPosition(null);
        setTarget(null);
      }
    };

    const onScroll = () => {
      setVisible(false);
      setPosition(null);
      setTarget(null);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mouseup", showIfReady);
    document.addEventListener("touchend", showIfReady);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mouseup", showIfReady);
      document.removeEventListener("touchend", showIfReady);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVisible(false);
        setPosition(null);
        setTarget(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [target]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || !target) return;

    const menuRect = menu.getBoundingClientRect();
    setPosition(positionForRect(target.rect, menuRect.width, menuRect.height));
    // Fade in only after the menu is already parked over the selection.
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setVisible(false);
    setPosition(null);
    setTarget(null);
  };

  const focusComposer = () => {
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLElement>(
        '.aui-lexical-input, textarea[aria-label="Message input"]',
      );
      input?.focus({ preventScroll: true });
    });
  };

  const askHere = () => {
    if (!target) return;
    aui.composer.setQuote(undefined);
    requestSelectionChipInsert({
      messageId: target.messageId,
      text: target.text,
    });
    clearSelection();
    focusComposer();
  };

  const askInSubsession = () => {
    if (!target) return;
    const mainThreadId = aui.threads.getState().mainThreadId;
    const messageCount = aui.thread.getState().messages.length;
    if (!mainThreadId) return;

    setPendingQuote(target.text);
    openFork(mainThreadId, messageCount);
    setPanel("subsession-chat");
    clearSelection();
  };

  if (!target) return null;

  const actions = [
    {
      key: "here",
      label: "Ask about this",
      icon: MessageSquareQuoteIcon,
      onClick: askHere,
    },
    {
      key: "subsession",
      label: "Ask in subsession",
      icon: GitBranchIcon,
      onClick: askInSubsession,
    },
  ] as const;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Ask about selection"
      data-slot="aui_selection-ask-menu"
      className="fixed z-50 flex max-w-[min(100vw-1rem,22rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1f] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition-opacity duration-150 ease-out"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        opacity: visible && position ? 1 : 0,
      }}
      onMouseDown={(event) => {
        // Keep the text selection while clicking menu items.
        event.preventDefault();
        ignoreNextClear.current = true;
      }}
    >
      {actions.map(({ key, label, icon: Icon, onClick }) => (
        <button
          key={key}
          type="button"
          role="menuitem"
          className="flex items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-white/8 hover:text-white"
          onClick={onClick}
        >
          <Icon className="size-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );
};
