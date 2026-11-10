import {
  ExportedMessageRepository,
  bindExternalStoreMessage,
} from "@assistant-ui/react";
import type { UIMessage } from "ai";
import type { ChatMessage } from "@/lib/chat-api";
import { rememberSessionUserMessageIds } from "@/lib/pending-message-edit";

type ThreadLike = {
  append: (message: never) => void;
  import: (repository: ExportedMessageRepository) => void;
  reset?: () => void;
  getState: () => { messages: readonly unknown[] };
};

type BranchItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parentId: string | null;
  createdAt: string;
};

/**
 * Build a branch tree from backend messages.
 *
 * Prefer explicit parent_message_id. For legacy rows (pre-regenerate fix),
 * collapse consecutive duplicate user texts into one node and attach the
 * following assistants as siblings under that user.
 */
export function buildBranchItems(
  messages: readonly ChatMessage[],
): BranchItem[] {
  const items: BranchItem[] = [];
  const idSet = new Set<string>();
  /** Skipped duplicate-user / empty-assistant ids → canonical kept parent. */
  const remapParent = new Map<string, string>();
  let lastId: string | null = null;
  let lastUser: { id: string; content: string } | null = null;

  const resolveParent = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    let cur: string | null = raw;
    const seen = new Set<string>();
    while (cur && remapParent.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = remapParent.get(cur) ?? null;
    }
    if (cur && idSet.has(cur)) return cur;
    return null;
  };

  for (const message of messages) {
    const role =
      message.role === "assistant" || message.role === "user"
        ? message.role
        : "assistant";
    const content = message.content ?? "";

    // Failed/aborted runs leave empty assistant stubs — drop them.
    if (role === "assistant" && !content.trim()) {
      if (lastUser) remapParent.set(message.id, lastUser.id);
      else if (lastId) remapParent.set(message.id, lastId);
      continue;
    }

    // Legacy regenerate re-posted the same user text (U→A→U→A…). Collapse
    // onto the previous kept user so assistants become BranchPicker siblings.
    if (
      role === "user" &&
      lastUser &&
      lastUser.content.trim() === content.trim()
    ) {
      remapParent.set(message.id, lastUser.id);
      continue;
    }

    let parentId =
      resolveParent(message.parent_message_id) ??
      (lastId && idSet.has(lastId) ? lastId : null);

    // After collapsing a duplicate user, assistants must sibling under that user.
    if (
      role === "assistant" &&
      lastUser &&
      message.parent_message_id &&
      remapParent.has(message.parent_message_id)
    ) {
      parentId = lastUser.id;
    }

    items.push({
      id: message.id,
      role,
      content,
      parentId,
      createdAt: message.created_at,
    });
    idSet.add(message.id);
    lastId = message.id;
    if (role === "user") {
      lastUser = { id: message.id, content };
    }
  }

  return items;
}

function toUIMessage(item: BranchItem): UIMessage {
  return {
    id: item.id,
    role: item.role,
    parts: [{ type: "text", text: item.content }],
    metadata: {
      backendMessageId: item.id,
      custom: {
        backendMessageId: item.id,
      },
    },
  } as UIMessage;
}

/**
 * Load backend messages into an empty assistant-ui thread as a branch tree.
 *
 * Uses ExportedMessageRepository + bindExternalStoreMessage so AI SDK
 * onImport keeps Vercel UIMessages (plain import previously wiped the chat).
 */
export function importChatMessagesIntoThread(
  thread: ThreadLike,
  sessionId: string,
  messages: readonly ChatMessage[],
  options?: { replace?: boolean },
): void {
  if (thread.getState().messages.length > 0) {
    if (!options?.replace) return;
    // Re-open after code/data fix — clear stale linear duplicates first.
    thread.reset?.();
    if (thread.getState().messages.length > 0) return;
  }
  if (messages.length === 0) {
    rememberSessionUserMessageIds(sessionId, []);
    return;
  }

  const branchItems = buildBranchItems(messages);
  const userBackendIds = branchItems
    .filter((item) => item.role === "user")
    .map((item) => item.id);

  if (branchItems.length === 0) {
    rememberSessionUserMessageIds(sessionId, []);
    return;
  }

  const repo = ExportedMessageRepository.fromBranchableArray(
    branchItems.map((item) => ({
      parentId: item.parentId,
      message: {
        id: item.id,
        role: item.role,
        content: [{ type: "text" as const, text: item.content }],
        createdAt: new Date(item.createdAt),
        // Must live on ThreadMessage.metadata — bindExternalStoreMessage
        // UIMessage custom fields are NOT what useAuiState(message.metadata) reads.
        metadata: {
          custom: {
            backendMessageId: item.id,
          },
        },
      },
    })),
    { headId: branchItems[branchItems.length - 1]?.id ?? null },
  );

  for (const entry of repo.messages) {
    const source = branchItems.find((item) => item.id === entry.message.id);
    if (!source) continue;
    bindExternalStoreMessage(entry.message, toUIMessage(source));
  }

  try {
    thread.import(repo);
  } catch {
    // Fallback: linear append if import path rejects the repository shape.
    for (const item of branchItems) {
      thread.append({
        id: item.id,
        role: item.role,
        content: [{ type: "text", text: item.content }],
        startRun: false,
        parentId: item.parentId,
        metadata: {
          custom: {
            backendMessageId: item.id,
          },
        },
      } as never);
    }
  }

  rememberSessionUserMessageIds(sessionId, userBackendIds);
}
