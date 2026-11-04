"use client";

import { useEffect, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useProjectsStore } from "@/lib/projects-store";

/**
 * Permanent project membership:
 * - Bind only on the first message while a project is selected.
 * - Once bound, never move / unbind.
 * - Once a chat has messages without a project, it stays project-less forever.
 * CHATS lists every chat; Projects only nest that project's chats.
 */
export function useProjectThreadBinding() {
  const aui = useAui();
  const selectedId = useProjectsStore((s) => s.selectedId);
  const assignThreadProject = useProjectsStore((s) => s.assignThreadProject);
  const restoreProjectSelection = useProjectsStore(
    (s) => s.restoreProjectSelection,
  );
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const messageCount = useAuiState((s) => s.threads.main.messages.length);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const prevThreadIdRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef<number>(0);
  const didResetOnLoadRef = useRef(false);

  // F5 / first mount → always land on a clean New chat (no project).
  useEffect(() => {
    if (didResetOnLoadRef.current) return;
    didResetOnLoadRef.current = true;
    useProjectsStore.getState().startNormalChat();
    aui.threads.switchToNewThread();
  }, [aui]);

  useEffect(() => {
    if (!mainThreadId) return;

    const prevThreadId = prevThreadIdRef.current;
    const isFirstLoad = prevThreadId === null;
    const threadChanged = prevThreadId !== mainThreadId;
    if (threadChanged) prevMessageCountRef.current = 0;
    prevThreadIdRef.current = mainThreadId;

    const mapped = useProjectsStore.getState().threadProjects[mainThreadId];
    const item = threadItems.find((entry) => entry.id === mainThreadId);
    const customProject = item?.custom?.projectId;
    const boundId =
      mapped ??
      (typeof customProject === "string" ? customProject : undefined);
    const hasHistory = messageCount > 0 || Boolean(item?.lastMessageAt);
    const firstMessageJustArrived =
      !threadChanged &&
      prevMessageCountRef.current === 0 &&
      messageCount > 0;
    prevMessageCountRef.current = messageCount;

    // Top New chat owns the sidebar highlight — never pull project selection back.
    if (useProjectsStore.getState().newChatSpotlight) return;

    // Opening a bound chat restores project context (never rebinds / never
    // steals the CHATS highlight if the user opened it from CHATS).
    if (threadChanged && !isFirstLoad && boundId && hasHistory) {
      const stillExists = useProjectsStore
        .getState()
        .projects.some((project) => project.id === boundId);
      if (stillExists) {
        if (boundId !== useProjectsStore.getState().selectedId) {
          restoreProjectSelection(boundId);
        }
        if (!mapped) assignThreadProject(mainThreadId, boundId);
      }
      return;
    }

    if (isFirstLoad) return;

    // Bound forever — never move to another project.
    if (boundId) {
      if (!mapped) assignThreadProject(mainThreadId, boundId);
      return;
    }

    // Unbound chat that already has history stays project-less forever.
    if (hasHistory && !firstMessageJustArrived) return;

    // First message while a project is selected → permanent bind.
    if (!firstMessageJustArrived) return;
    const projectId = useProjectsStore.getState().selectedId;
    if (!projectId) return;

    assignThreadProject(mainThreadId, projectId);

    try {
      const threadItem = aui.threads.item({ id: mainThreadId });
      threadItem.updateCustom({
        ...(threadItem.getState().custom ?? {}),
        projectId,
      });
    } catch {
      // Runtime may not support custom metadata.
    }
  }, [
    aui,
    assignThreadProject,
    mainThreadId,
    messageCount,
    restoreProjectSelection,
    selectedId,
    threadItems,
  ]);
}
