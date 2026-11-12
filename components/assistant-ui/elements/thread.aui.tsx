"use client";

import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { ComposerActiveProject } from "@/components/assistant-ui/elements/composer-active-project.aui";
import {
  ComposerModePicker,
  ComposerModelPicker,
} from "@/components/assistant-ui/elements/composer-mode-model.aui";
import { ComposerProjectPicker } from "@/components/assistant-ui/elements/composer-project-picker.aui";
import { CreateProjectScreen } from "@/components/assistant-ui/elements/create-project-screen.aui";
import { BuildPage } from "@/components/assistant-ui/elements/build-page.aui";
import { ImageGenPage } from "@/components/assistant-ui/elements/image-gen-page.aui";
import { LibraryPage } from "@/components/assistant-ui/elements/library-page.aui";
import { ResearchPage } from "@/components/assistant-ui/elements/research-page.aui";
import { SlidesPage } from "@/components/assistant-ui/elements/slides-page.aui";
import {
  ContextRail,
  ThreadTopActions,
} from "@/components/assistant-ui/elements/context-rail.aui";
import { ProjectsBrowse } from "@/components/assistant-ui/elements/projects-browse.aui";
import { WelcomeTagline } from "@/components/assistant-ui/elements/welcome-tagline.aui";
import { useProjectsStore } from "@/lib/projects-store";
import { File, getFileHref } from "@/components/assistant-ui/elements/file";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/elements/follow-up-suggestions.aui";
import { Image } from "@/components/assistant-ui/elements/image";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/elements/tool-group.aui";
import { SelectionAskMenu } from "@/components/assistant-ui/elements/selection-ask-menu.aui";
import {
  flushInlineComposerDraft,
  InlineChipComposerInput,
} from "@/components/assistant-ui/elements/inline-chip-composer-input";
import { SelectionAwareText } from "@/components/assistant-ui/elements/selection-chip";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getChatSession } from "@/lib/chat-api";
import { useAgentRunStatusStore } from "@/lib/agent-run-status-store";
import { getBackendSessionId } from "@/lib/chat-session-map";
import { useChatSessionsStore } from "@/lib/chat-sessions-store";
import { useContextRailStore } from "@/lib/context-rail-store";
import { openBackendChatSession } from "@/lib/open-chat-session";
import {
  getLastSessionUserMessageId,
  setPendingMessageEdit,
} from "@/lib/pending-message-edit";
import { resolveBackendMessageId } from "@/lib/backend-message-id";
import { useSubsessionsStore } from "@/lib/subsessions-store";
import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type FileMessagePartComponent,
  type ImageMessagePartComponent,
  type TextMessagePartComponent,
  type ToolCallMessagePartComponent,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AudioLinesIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  MessageSquareIcon,
  MicIcon,
  PencilIcon,
  PhoneIcon,
  RefreshCwIcon,
  SquareIcon,
  PlayIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";

export type ThreadGroupPart = MessagePrimitive.GroupedParts.GroupPart;

const DefaultToolGroup: FC<PropsWithChildren<{ group: ThreadGroupPart }>> = ({
  group,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <ToolGroupRoot
      variant="ghost"
      open={open || group.counts.requiresAction > 0}
      onOpenChange={setOpen}
    >
      <ToolGroupTrigger
        count={group.indices.length}
        active={group.status.type === "running"}
      />
      <ToolGroupContent>{children}</ToolGroupContent>
    </ToolGroupRoot>
  );
};

const shouldShowComposerResume = (s: AssistantState) =>
  !!s.thread.canResume && s.composer.type === "thread" && s.composer.isEmpty;

/**
 * Optional component overrides for the thread. `AssistantMessage` and
 * `Welcome` replace whole sections; the remaining slots override how the
 * assistant message renders tool calls and part groups. Tool UIs registered
 * by name (toolkit `render`, `useAssistantDataUI`) take precedence over
 * `ToolFallback`. When `TaskGroup` is set, tool calls that carry a nested
 * conversation and have no registered UI render through it instead of the
 * tool group; without it they render like any other tool call.
 * `ComposerExtra` renders in the composer's action row beside the attach
 * button.
 */
export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  ToolFallback?: ToolCallMessagePartComponent | undefined;
  ToolGroup?:
    | ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>>
    | undefined;
  ReasoningGroup?:
    | ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>>
    | undefined;
  TaskGroup?: ComponentType<{ group: ThreadGroupPart }> | undefined;
  ComposerExtra?: ComponentType | undefined;
};

const messageGroupBy = groupPartByType({
  reasoning: ["group-chainOfThought", "group-reasoning"],
  "tool-call": ["group-chainOfThought", "group-tool"],
  "standalone-tool-call": [],
});

type ThreadGroupKey =
  | "group-chainOfThought"
  | "group-reasoning"
  | "group-tool"
  | "group-task";

const TASK_GROUP_PATH: readonly ThreadGroupKey[] = [
  "group-chainOfThought",
  "group-task",
];

const taskAwareGroupBy = (
  part: Parameters<typeof messageGroupBy>[0],
  context?: Parameters<typeof messageGroupBy>[1],
): readonly ThreadGroupKey[] => {
  const path = messageGroupBy(part, context);
  return part.type === "tool-call" &&
    part.messages !== undefined &&
    path.length > 0 &&
    !context?.toolUIs?.[part.toolName]?.length
    ? TASK_GROUP_PATH
    : path;
};

export type ThreadProps = {
  components?: ThreadComponents | undefined;
  autoFocus?: boolean | undefined;
};

const EMPTY_COMPONENTS: ThreadComponents = {};

const ThreadComponentsContext =
  createContext<ThreadComponents>(EMPTY_COMPONENTS);

// Native thread history fetch (rare) — keep for a11y status only.
const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

/** Backend session open: history not hydrated yet — dock composer, no Welcome. */
function useAwaitingBackendHistory(): boolean {
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const hydratedIds = useChatSessionsStore((s) => s.hydratedMessageSessionIds);
  const openingSessionId = useChatSessionsStore((s) => s.openingSessionId);

  if (messageCount > 0) return false;
  // Cover the gap between click and setBackendSessionId / hydrate.
  if (openingSessionId) return true;
  if (!mainThreadId) return false;
  const sessionId = getBackendSessionId(mainThreadId);
  if (!sessionId) return false;
  return !hydratedIds[sessionId];
}

export const Thread: FC<ThreadProps> = ({
  components = EMPTY_COMPONENTS,
  autoFocus = true,
}) => {
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const awaitingBackendHistory = useAwaitingBackendHistory();
  // Keep New chat centered (hero + composer) while drafting. Suggestions already
  // hide on type; leave this surface only when messages exist, a run starts, or
  // history is loading — never when the composer merely has draft text.
  const newChatSpotlight = useProjectsStore((s) => s.newChatSpotlight);
  const showWelcome =
    newChatSpotlight &&
    messageCount === 0 &&
    !isRunning &&
    !awaitingBackendHistory;

  return (
    <ThreadComponentsContext.Provider value={components}>
      <div className="relative flex h-full w-full min-w-0 overflow-hidden bg-[#121214]">
        <div className="relative min-w-0 flex-1">
          <ThreadRoot
            isEmpty={showWelcome}
            showWelcome={showWelcome}
            awaitingHistory={awaitingBackendHistory}
            autoFocus={autoFocus}
          />
        </div>
        <ContextRail />
      </div>
    </ThreadComponentsContext.Provider>
  );
};

const SessionOpenErrorBanner: FC = () => {
  const aui = useAui();
  const openError = useChatSessionsStore((s) => s.openError);
  const activeSessionId = useChatSessionsStore((s) => s.activeSessionId);
  const sessions = useChatSessionsStore((s) => s.sessions);
  const clearOpenError = useChatSessionsStore((s) => s.clearOpenError);
  const clearMessagesHydrated = useChatSessionsStore(
    (s) => s.clearMessagesHydrated,
  );
  const [reloading, setReloading] = useState(false);

  if (!openError) return null;
  if (activeSessionId && openError.sessionId !== activeSessionId) return null;

  const reload = async () => {
    if (reloading) return;
    const sessionId = openError.sessionId;
    setReloading(true);
    clearOpenError(sessionId);
    clearMessagesHydrated(sessionId);
    try {
      const cached = sessions.find((session) => session.id === sessionId);
      const session = cached ?? (await getChatSession(sessionId));
      await openBackendChatSession(aui, session);
    } catch {
      // openBackendChatSession reports openError itself
    } finally {
      setReloading(false);
    }
  };

  return (
    <div
      role="alert"
      data-slot="aui_session-open-error"
      className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-red-50">
            Không tải được tin nhắn
            <span className="ms-2 font-mono text-xs text-red-200/80">
              [{openError.code}]
            </span>
          </p>
          <p className="break-words font-mono text-xs leading-relaxed text-red-100/90">
            {openError.message}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-red-100/80 hover:bg-red-500/20 hover:text-white disabled:opacity-50"
            disabled={reloading}
            onClick={() => {
              void reload();
            }}
          >
            {reloading ? "Đang tải…" : "Tải lại"}
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-red-100/80 hover:bg-red-500/20 hover:text-white"
            disabled={reloading}
            onClick={() => clearOpenError(openError.sessionId)}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const ThreadRoot: FC<{
  isEmpty: boolean;
  showWelcome: boolean;
  awaitingHistory: boolean;
  autoFocus: boolean;
}> = ({ isEmpty, showWelcome, awaitingHistory, autoFocus }) => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext);
  const auiHistoryLoading = useAuiState(isHistoryLoadingView);
  const isBrowsingProjects = useProjectsStore((s) => s.isBrowsing);
  const isCreatingProject = useProjectsStore((s) => s.isCreating);
  const isLibrary = useProjectsStore((s) => s.isLibrary);
  const isImageGen = useProjectsStore((s) => s.isImageGen);
  const isSlides = useProjectsStore((s) => s.isSlides);
  const isBuild = useProjectsStore((s) => s.isBuild);
  const isResearch = useProjectsStore((s) => s.isResearch);
  // Imagine / Slides / Build / Research share the same standalone hero shell.
  const showModeSurface = isImageGen || isSlides || isBuild || isResearch;
  const showSidePane =
    isBrowsingProjects ||
    isCreatingProject ||
    isLibrary ||
    showModeSurface;

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root relative bg-[#121214] @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--composer-bg" as string]: "#1c1c21",
        ["--composer-radius" as string]: "1.75rem",
        ["--composer-padding" as string]: "12px",
      }}
    >
      {/* Mobile: sidebar is a sheet — trigger lives in the thread chrome */}
      <div className="pointer-events-none absolute top-0 left-0 z-20 flex h-10 items-center px-2.5 pt-1 md:hidden">
        <SidebarTrigger
          size="icon"
          className="pointer-events-auto size-8 text-zinc-400 hover:bg-white/5 hover:text-white"
        />
      </div>
      <ThreadTopActions />
      <SelectionAskMenu />
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        autoScroll={false}
        data-slot="aui_thread-viewport"
        // No scroll-smooth: CSS smooth + growing stream = scroll thrash (Grok #4).
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]"
      >
        {showSidePane ? (
          <div
            className={cn(
              "flex w-full flex-1 flex-col items-stretch",
              showModeSurface
                ? "justify-start"
                : "justify-start px-6 pt-6 md:px-10",
            )}
          >
            {isCreatingProject ? (
              <CreateProjectScreen />
            ) : isLibrary ? (
              <LibraryPage />
            ) : isImageGen ? (
              <ImageGenPage />
            ) : isSlides ? (
              <SlidesPage />
            ) : isBuild ? (
              <BuildPage />
            ) : isResearch ? (
              <ResearchPage />
            ) : (
              <ProjectsBrowse />
            )}
          </div>
        ) : (
          <div
            className={cn(
              // Extra top pad once messages exist so bubbles clear Files/Notes chrome
              "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4",
              isEmpty ? "justify-center pt-4" : "pt-12",
            )}
          >
            {showWelcome ? <Welcome /> : null}
            <SessionOpenErrorBanner />
            {(auiHistoryLoading || awaitingHistory) ? (
              <span className="sr-only" role="status">
                Loading conversation
              </span>
            ) : null}

            <ThreadLoadEarlier />

            <div
              data-slot="aui_message-group"
              className="mb-14 flex flex-col gap-y-6 empty:hidden"
            >
              <ThreadPrimitive.Messages>
                {() => <ThreadMessage />}
              </ThreadPrimitive.Messages>
            </div>

            <ThreadPrimitive.ViewportFooter
              className={cn(
                "aui-thread-viewport-footer flex flex-col gap-4 overflow-visible bg-gradient-to-t from-[#121214] via-[#121214]/95 to-transparent pb-5 md:pb-7",
                !isEmpty && "sticky bottom-0 mt-auto",
              )}
            >
              <ThreadScrollToBottom />
              <ThreadFollowupSuggestions />
              <Composer
                autoFocus={autoFocus}
                showProjectPicker={showWelcome}
              />
              {showWelcome ? <ComposerEmptySuggestions /> : null}
            </ThreadPrimitive.ViewportFooter>
          </div>
        )}
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  const isSpoken = useAuiState((s) => s.message.metadata.modality === "voice");

  if (isEditing) return <EditComposer />;
  if (isSpoken) return <SpokenMessage />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessageComponent />;
};

type VoiceRunPosition = "single" | "start" | "middle" | "end";

const useVoiceRunPosition = (): VoiceRunPosition =>
  useAuiState((s) => {
    const before =
      s.thread.messages[s.message.index - 1]?.metadata.modality === "voice";
    const after =
      s.thread.messages[s.message.index + 1]?.metadata.modality === "voice";
    if (before) return after ? "middle" : "end";
    return after ? "start" : "single";
  });

const SpokenText: TextMessagePartComponent = ({ text }) => (
  <p className="aui-spoken-message-text m-0">{text}</p>
);

const SpokenMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const position = useVoiceRunPosition();
  const isSpeaking = useAuiState(
    (s) =>
      s.message.role === "assistant" && s.message.status?.type === "running",
  );
  const opensExchange = position === "start" || position === "single";

  return (
    <MessagePrimitive.Root
      data-slot="aui_spoken-message-root"
      data-role={role}
      data-voice-run={position}
      className={cn(
        "aui-spoken-message bg-muted/40 mx-2 px-3 py-1.5 [contain-intrinsic-size:auto_48px] [content-visibility:auto]",
        position === "single" && "rounded-xl py-2",
        position === "start" && "rounded-t-xl pt-2",
        position === "middle" && "-mt-6",
        position === "end" && "-mt-6 rounded-b-xl pb-2",
      )}
    >
      {opensExchange && (
        <div
          data-slot="aui_spoken-exchange-header"
          className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs"
        >
          <PhoneIcon className="size-3" aria-hidden />
          <span>Voice conversation</span>
        </div>
      )}
      <div
        data-slot="aui_spoken-message-content"
        className="text-foreground flex items-start gap-2 text-sm leading-relaxed"
      >
        <span className="text-muted-foreground mt-1 shrink-0" aria-hidden>
          {role === "user" ? (
            <MicIcon className="size-3.5" />
          ) : (
            <AudioLinesIcon className="size-3.5" />
          )}
        </span>
        <span className="sr-only">
          {role === "user" ? "You said" : "Assistant said"}
        </span>
        <div className="min-w-0 flex-1 wrap-break-word">
          <MessagePrimitive.Parts components={{ Text: SpokenText }} />
          {isSpeaking && (
            <span
              data-slot="aui_spoken-message-indicator"
              role="status"
              className="text-muted-foreground ms-1 animate-pulse font-sans"
              aria-label="Assistant is speaking"
            >
              ●
            </span>
          )}
        </div>
        <SpokenActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const SpokenActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="always"
      className="aui-spoken-action-bar text-muted-foreground flex shrink-0 gap-1"
    >
      <ActionBarPrimitive.Copy render={<TooltipIconButton tooltip="Copy" className="size-6" />}><AuiIf condition={(s) => s.message.isCopied}>
                      <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
                    </AuiIf><AuiIf condition={(s) => !s.message.isCopied}>
                      <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
                    </AuiIf></ActionBarPrimitive.Copy>
    </ActionBarPrimitive.Root>
  );
};

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']):not([disabled])";

const nextFocusable = (start: Element) => {
  for (
    let element = start.nextElementSibling;
    element;
    element = element.nextElementSibling
  ) {
    const target = element.matches(FOCUSABLE_SELECTOR)
      ? element
      : element.querySelector(FOCUSABLE_SELECTOR);
    if (target instanceof HTMLElement) return target;
  }
  return null;
};

const ThreadLoadEarlier: FC = () => {
  const visible = useAuiState(
    (s) => s.thread.hasEarlier || s.thread.isLoadingEarlier,
  );
  const loading = useAuiState((s) => s.thread.isLoadingEarlier);
  const slotRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<Element | null>(null);

  // The last page removes the button; a keyboard user on it continues from the
  // next control in tab order rather than from the document body.
  useLayoutEffect(() => {
    const focused = focusedRef.current;
    const slot = slotRef.current;
    if (visible || !focused || focused.isConnected || !slot) return;
    focusedRef.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    nextFocusable(slot)?.focus();
  }, [visible]);

  return (
    <div
      ref={slotRef}
      className="contents"
      onFocus={(event) => {
        focusedRef.current = event.target;
      }}
    >
      <span role="status" className="sr-only">
        {loading ? "Loading earlier messages" : ""}
      </span>
      {visible && (
        <ThreadPrimitive.LoadEarlier render={<Button variant="ghost" size="sm" data-slot="aui_thread-load-earlier" className="aui-thread-load-earlier text-muted-foreground mb-6 self-center rounded-full" />}><span
                            className={cn(loading && "shimmer motion-reduce:animate-none")}
                          >
                            {loading ? "Loading earlier messages" : "Load earlier messages"}
                          </span></ThreadPrimitive.LoadEarlier>
      )}
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom render={<TooltipIconButton tooltip="Scroll to bottom" variant="outline" className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible" />}><ArrowDownIcon /></ThreadPrimitive.ScrollToBottom>
  );
};

const ModeWelcome: FC<{
  title: string;
  prompts?: readonly string[];
}> = ({ title, prompts }) => {
  return (
    <div className="aui-thread-welcome-root mb-2 flex w-full flex-col items-center">
      <div className="mb-8 flex flex-col items-center px-2 text-center">
        <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both h-9 text-3xl font-semibold leading-9 tracking-tight text-zinc-100 duration-200">
          {title}
        </p>
        {prompts ? (
          <WelcomeTagline prompts={prompts} fallback={prompts[0]} />
        ) : (
          <WelcomeTagline />
        )}
      </div>
    </div>
  );
};

const ThreadWelcome: FC = () => {
  return <ModeWelcome title="Another Intelligence" />;
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-col">
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

/** Renders suggestions; when the composer has text, hide but keep layout height. */
const ComposerEmptySuggestions: FC = () => {
  const composerEmpty = useAuiState((s) => s.composer.isEmpty);

  return (
    <div
      className={cn(
        "w-full",
        !composerEmpty && "invisible pointer-events-none",
      )}
      aria-hidden={!composerEmpty}
    >
      <ThreadSuggestions />
    </div>
  );
};


const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send render={<button type="button" className="aui-thread-welcome-suggestion group hover:bg-foreground/[0.03] focus-visible:ring-ring/50 flex w-full items-baseline gap-2.5 rounded-md px-2 py-2 text-start text-sm transition-colors outline-none focus-visible:ring-1 motion-reduce:transition-none" />}><span
                      aria-hidden
                      className="text-muted-foreground/60 group-hover:text-foreground font-mono text-xs transition-colors motion-reduce:transition-none"
                    >
                      {">"}
                    </span><span className="min-w-0 flex-1 truncate">
                      <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 text-foreground" />{" "}
                      <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
                    </span></SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer: FC<{
  autoFocus: boolean;
  /** Project pills + Add under the bar — only for true New chat, not history load. */
  showProjectPicker?: boolean;
}> = ({ autoFocus, showProjectPicker = true }) => {
  const inputRef = useRef<HTMLDivElement | null>(null);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);

  // Focus the input whenever the chat UI is shown / session changes.
  useLayoutEffect(() => {
    if (!autoFocus) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current
        ?.querySelector<HTMLElement>(".aui-lexical-input")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, mainThreadId]);

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col gap-2">
      <ComposerPrimitive.AttachmentDropzone
        render={
          <div
            data-slot="aui_composer-shell"
            className="flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border border-white/10 bg-(--composer-bg) p-(--composer-padding) shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-white/15 data-[dragging=true]:border-dashed data-[dragging=true]:border-white/30 data-[dragging=true]:bg-[#171717]"
          />
        }
      >
        <ComposerAttachments />
        <div ref={inputRef}>
          <InlineChipComposerInput
            placeholder="Ask anything"
            autoFocus={autoFocus}
            aria-label="Message input"
            className="aui-composer-input relative max-h-48 min-h-11 w-full overflow-x-hidden overflow-y-auto px-3 py-2 text-base leading-6 text-zinc-100 caret-white"
          />
        </div>
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
      {showProjectPicker ? <ComposerProjectPicker /> : null}
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  const { ComposerExtra } = useContext(ThreadComponentsContext);
  // The stop control only cancels the send while no run it could stop is going.
  const isSending = useAuiState(
    (s) =>
      s.composer.submission !== undefined &&
      !(s.thread.isRunning && s.thread.capabilities.cancel),
  );
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="aui-composer-action-start flex min-w-0 items-center gap-1.5">
        <ComposerModePicker />
        <ComposerActiveProject />
        {ComposerExtra ? <ComposerExtra /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <AuiIf condition={(s) => s.thread.capabilities.dictation}>
          <AuiIf condition={(s) => s.composer.dictation == null}>
            <ComposerPrimitive.Dictate render={<TooltipIconButton tooltip="Voice input" side="bottom" type="button" variant="ghost" size="icon" className="aui-composer-dictate text-muted-foreground hover:text-foreground size-7 rounded-full" aria-label="Start voice input" />}><MicIcon className="aui-composer-dictate-icon size-4" /></ComposerPrimitive.Dictate>
          </AuiIf>
          <AuiIf condition={(s) => s.composer.dictation != null}>
            <ComposerPrimitive.StopDictation render={<TooltipIconButton tooltip="Stop dictation" side="bottom" type="button" variant="ghost" size="icon" className="aui-composer-stop-dictation text-destructive size-7 rounded-full" aria-label="Stop voice input" />}><SquareIcon className="aui-composer-stop-dictation-icon size-3.5 animate-pulse fill-current" /></ComposerPrimitive.StopDictation>
          </AuiIf>
        </AuiIf>
        <ComposerModelPicker />
        <AuiIf
          condition={(s) =>
            (!s.composer.canCancel ||
              (s.thread.voice !== undefined &&
                s.composer.submission === undefined)) &&
            !shouldShowComposerResume(s)
          }
        >
          <span
            className="contents"
            onPointerDownCapture={() => flushInlineComposerDraft()}
          >
            <ComposerPrimitive.Send render={<TooltipIconButton tooltip="Send message" side="bottom" type="button" variant="default" size="icon" className="aui-composer-send size-7 rounded-full" aria-label="Send message" />}><ArrowUpIcon className="aui-composer-send-icon size-4" /></ComposerPrimitive.Send>
          </span>
        </AuiIf>
        <AuiIf condition={shouldShowComposerResume}>
          <ComposerPrimitive.Resume render={<TooltipIconButton tooltip="Resume generating" side="bottom" type="button" variant="default" size="icon" className="aui-composer-resume size-7 rounded-full" aria-label="Resume generating" />}><PlayIcon className="aui-composer-resume-icon size-4" /></ComposerPrimitive.Resume>
        </AuiIf>
        <AuiIf
          condition={(s) =>
            s.composer.canCancel &&
            (s.thread.voice === undefined ||
              s.composer.submission !== undefined)
          }
        >
          <ComposerPrimitive.Cancel render={<Button type="button" variant="default" size="icon" className="aui-composer-cancel size-7 rounded-full" aria-label={isSending ? "Cancel sending" : "Stop generating"} />}><SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" /></ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const useRunElapsedMs = (threadId: string | undefined, active: boolean) => {
  const startedAt = useAgentRunStatusStore((s) =>
    threadId ? s.startedAtByThreadId[threadId] : undefined,
  );
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsedMs(0);
      return;
    }
    const tick = () => {
      setElapsedMs(Math.max(0, Date.now() - startedAt));
    };
    tick();
    if (!active) return;
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [startedAt, active]);

  if (!startedAt) return null;
  return elapsedMs;
};

const AssistantRunIndicator: FC<{
  label: string;
  threadId: string | undefined;
}> = ({ label, threadId }) => {
  const isTerminal = label === "Done";
  const elapsedMs = useRunElapsedMs(threadId, !isTerminal);

  return (
    <div
      data-slot="aui_assistant-message-indicator"
      className="mb-1.5 flex min-h-8 w-full items-center gap-2.5 font-sans text-[15px] font-medium leading-snug tracking-tight text-zinc-300"
      aria-label={
        elapsedMs == null ? label : `${label} ${elapsedMs}ms`
      }
      role="status"
    >
      {!isTerminal ? (
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
          <span className="size-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
        </span>
      ) : (
        <span
          className="size-1.5 shrink-0 rounded-full bg-zinc-600"
          aria-hidden
        />
      )}
      <span
        key={label}
        className={cn(
          "min-w-0 fade-in slide-in-from-left-1 animate-in fill-mode-both duration-200",
          isTerminal ? "text-zinc-500" : "text-zinc-300",
          !isTerminal && "shimmer motion-reduce:animate-none",
        )}
      >
        {label}
      </span>
      {elapsedMs != null ? (
        <span
          className={cn(
            "ms-auto shrink-0 tabular-nums text-xs font-normal tracking-normal",
            isTerminal ? "text-zinc-600" : "text-zinc-500",
          )}
        >
          {elapsedMs}ms
        </span>
      ) : null}
    </div>
  );
};

function readRunDurationMs(message: {
  metadata?: {
    timing?: { totalStreamTime?: number };
    custom?: Record<string, unknown>;
    runDurationMs?: unknown;
  };
}): number | null {
  const custom = message.metadata?.custom?.runDurationMs;
  const top = message.metadata?.runDurationMs;
  const timing = message.metadata?.timing?.totalStreamTime;
  for (const value of [custom, top, timing]) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  }
  return null;
}

const AssistantMessage: FC = () => {
  const {
    ToolFallback: ToolFallbackComponent = ToolFallback,
    ToolGroup,
    TaskGroup: TaskGroupComponent,
  } = useContext(ThreadComponentsContext);
  const groupBy = TaskGroupComponent ? taskAwareGroupBy : messageGroupBy;
  // content-visibility on a growing stream forces intrinsic-size thrash → stutter.
  const isRunning = useAuiState(
    (s) => s.message.status?.type === "running",
  );
  const isLast = useAuiState((s) => s.message.isLast);
  const messageId = useAuiState((s) => s.message.id);
  const messageDurationMs = useAuiState((s) => readRunDurationMs(s.message));
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  // Keyed by thread id so new chats update before backend session map exists.
  const runStatus = useAgentRunStatusStore((s) =>
    mainThreadId ? s.byThreadId[mainThreadId] : undefined,
  );
  const liveDurationMs = useAgentRunStatusStore((s) =>
    mainThreadId && isLast
      ? s.durationMsByThreadId[mainThreadId]
      : undefined,
  );
  const runDurationMs =
    isLast && !isRunning
      ? (messageDurationMs ??
        (typeof liveDurationMs === "number" ? liveDurationMs : null))
      : null;

  const ACTION_BAR_PT = "pt-1.5";
  // Keep the action bar inside the contained root's paint box, then cancel its reserved space in flow.
  const ACTION_BAR_HEIGHT = `min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      data-message-id={messageId}
      className={cn(
        "fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150",
        !isRunning &&
          "[contain-intrinsic-size:auto_200px] [content-visibility:auto]",
      )}
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-foreground px-2 font-sans text-[16px] leading-[1.7] wrap-break-word text-zinc-100"
      >
        <MessagePrimitive.GroupedParts groupBy={groupBy}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-task":
                return TaskGroupComponent ? (
                  <TaskGroupComponent group={part} />
                ) : null;
              case "group-tool":
                if (ToolGroup) {
                  return <ToolGroup group={part}>{children}</ToolGroup>;
                }
                return (
                  <DefaultToolGroup group={part}>{children}</DefaultToolGroup>
                );
              case "group-reasoning":
              case "reasoning":
                // Agent steps render as ● + status on the indicator — not a box.
                return null;
              case "text":
                return <MarkdownText />;
              case "tool-call":
                return part.toolUI ?? <ToolFallbackComponent {...part} />;
              case "data":
                return part.dataRendererUI;
              case "file":
                return (
                  <div data-slot="aui_assistant-message-file" className="py-1">
                    <MessageFile {...part} />
                  </div>
                );
              case "image":
                return (
                  <div data-slot="aui_assistant-message-image" className="py-1">
                    <Image {...part} />
                  </div>
                );
              case "indicator": {
                // Only FE-invented labels: Thinking (no status yet) and Done (run end).
                // Everything else is the exact agent stream string.
                const label =
                  runStatus ?? (isRunning ? "Thinking" : null);
                if (!label) return null;
                return (
                  <AssistantRunIndicator
                    label={label}
                    threadId={mainThreadId}
                  />
                );
              }
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn(
          "flex w-full min-w-0 items-center gap-2 px-2",
          ACTION_BAR_HEIGHT,
        )}
      >
        <BranchPicker />
        <AssistantActionBar />
        {runDurationMs != null ? (
          <span
            data-slot="aui_assistant-message-duration"
            className="ms-auto shrink-0 self-center text-xs tabular-nums text-zinc-500"
            aria-label={`Generated in ${runDurationMs}ms`}
          >
            {runDurationMs}ms
          </span>
        ) : null}
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  const openFork = useSubsessionsStore((s) => s.openFork);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const forkedFromMessageId = useAuiState((s) =>
    resolveBackendMessageId(s.message),
  );

  const openNewSubsession = () => {
    if (!mainThreadId || !forkedFromMessageId) return;
    void openFork({
      parentThreadId: mainThreadId,
      forkedFromMessageId,
      forceNew: true,
    })
      .then(() => setPanel("subsession-chat"))
      .catch(() => {
        // Keep main thread usable if fork fails.
      });
  };

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex gap-1 duration-200"
    >
      <ActionBarPrimitive.Copy render={<TooltipIconButton tooltip="Copy" />}><AuiIf condition={(s) => s.message.isCopied}>
                      <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
                    </AuiIf><AuiIf condition={(s) => !s.message.isCopied}>
                      <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
                    </AuiIf></ActionBarPrimitive.Copy>
      <AuiIf condition={(s) => s.thread.capabilities.feedback}>
        <ActionBarPrimitive.FeedbackPositive render={<TooltipIconButton tooltip="Helpful" className="data-[submitted=true]:bg-accent data-[submitted=true]:text-accent-foreground" />}><ThumbsUpIcon /></ActionBarPrimitive.FeedbackPositive>
        <ActionBarPrimitive.FeedbackNegative render={<TooltipIconButton tooltip="Not helpful" className="data-[submitted=true]:bg-accent data-[submitted=true]:text-accent-foreground" />}><ThumbsDownIcon /></ActionBarPrimitive.FeedbackNegative>
      </AuiIf>
      <ActionBarPrimitive.Reload render={<TooltipIconButton tooltip="Refresh" />}><RefreshCwIcon /></ActionBarPrimitive.Reload>
      <TooltipIconButton
        tooltip="New subsession"
        type="button"
        onClick={openNewSubsession}
      >
        <MessageSquareIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Root>
  );
};

const MessageFile: FileMessagePartComponent = (part) => {
  const image = part.mimeType.toLowerCase().startsWith("image/")
    ? getFileHref(part.data, part.mimeType, part.sourceType)
    : null;
  if (!image) return <File {...part} />;
  return (
    <Image
      type="image"
      image={image}
      status={part.status}
      {...(part.filename !== undefined && { filename: part.filename })}
    />
  );
};

const UserFilePart: FileMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-file" className="py-1">
    <MessageFile {...part} />
  </div>
);

const UserImagePart: ImageMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-image" className="py-1">
    <Image {...part} />
  </div>
);

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="group/user-msg fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-muted text-foreground w-fit max-w-full rounded-(--composer-radius) px-4 py-2.5 font-sans text-[16px] leading-[1.7] wrap-break-word whitespace-pre-wrap text-zinc-100 empty:hidden">
          <MessagePrimitive.Parts
            components={{
              Text: SelectionAwareText,
              File: UserFilePart,
              Image: UserImagePart,
            }}
          />
        </div>
        {/* Hover bridge: padding covers the gap so Edit stays clickable. */}
        <div className="aui-user-action-bar-wrapper absolute inset-y-0 end-full flex items-center pe-1 pl-2 opacity-0 transition-opacity peer-empty:hidden group-hover/user-msg:opacity-100 group-focus-within/user-msg:opacity-100">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="aui-user-action-bar-root flex flex-row items-center gap-0.5"
    >
      <ActionBarPrimitive.Copy
        render={
          <TooltipIconButton
            tooltip="Copy"
            side="top"
            type="button"
            aria-label="Copy"
            className="aui-user-action-copy size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          />
        }
      >
        <AuiIf condition={(s) => s.message.isCopied}>
          <CheckIcon
            className="size-3.5 animate-in zoom-in-50 fade-in duration-200 ease-out"
            aria-hidden
          />
        </AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}>
          <CopyIcon
            className="size-3.5 animate-in zoom-in-75 fade-in duration-150"
            aria-hidden
          />
        </AuiIf>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Edit
        render={
          <TooltipIconButton
            tooltip="Edit"
            side="top"
            type="button"
            aria-label="Edit"
            className="aui-user-action-edit size-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          />
        }
      >
        <PencilIcon className="size-3.5" aria-hidden />
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const aui = useAui();
  const openFork = useSubsessionsStore((s) => s.openFork);
  const appendMessage = useSubsessionsStore((s) => s.appendMessage);
  const queueReply = useSubsessionsStore((s) => s.queueReply);
  const setPanel = useContextRailStore((s) => s.setPanel);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const isLatestUserMessage = useAuiState((s) => {
    const { messages } = s.thread;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return messages[i]!.id === s.message.id;
      }
    }
    return s.message.isLast;
  });
  const backendMessageId = useAuiState((s) =>
    resolveBackendMessageId(s.message),
  );

  const submitEdit = () => {
    flushInlineComposerDraft();
    const text = aui.composer.getState().text.trim();
    if (!text) return;

    const sessionId = mainThreadId
      ? getBackendSessionId(mainThreadId)
      : null;
    const messageId =
      backendMessageId ??
      (sessionId ? getLastSessionUserMessageId(sessionId) : undefined);
    if (sessionId && messageId) {
      setPendingMessageEdit({ sessionId, messageId });
    }

    // Always send through assistant-ui so the bubble text updates in-thread.
    aui.composer.send();
  };

  const startInSubsession = () => {
    flushInlineComposerDraft();
    const text = aui.composer.getState().text.trim();
    if (!text || !mainThreadId || !backendMessageId) return;

    aui.composer.cancel();
    void openFork({
      parentThreadId: mainThreadId,
      forkedFromMessageId: backendMessageId,
      forceNew: true,
    })
      .then((subsessionId) => {
        appendMessage(subsessionId, {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
        });
        queueReply(subsessionId);
        setPanel("subsession-chat");
      })
      .catch(() => {
        // Keep editor usable if fork fails.
      });
  };

  const primarySubmit = isLatestUserMessage ? submitEdit : startInSubsession;

  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2"
    >
      <ComposerPrimitive.Root
        className="aui-edit-composer-root border-foreground/10 focus-within:border-foreground/25 ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-(--composer-radius) border bg-(--composer-bg)"
        onSubmit={(event) => {
          event.preventDefault();
          primarySubmit();
        }}
      >
        <InlineChipComposerInput
          autoFocus
          placeholder="Edit message"
          aria-label="Edit message"
          onEnter={primarySubmit}
          className="aui-edit-composer-input text-foreground relative min-h-14 w-full px-4 pt-3 pb-1 text-base leading-6 text-zinc-100 caret-white"
        />
        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex flex-wrap items-center justify-end gap-1.5">
          <ComposerPrimitive.Cancel
            render={<Button variant="ghost" size="sm" className="h-8 px-3" />}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          {isLatestUserMessage ? (
            <Button
              size="sm"
              className="h-8 px-3"
              type="button"
              onClick={submitEdit}
            >
              Update
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 px-3"
              type="button"
              onClick={startInSubsession}
            >
              Update in subsession
            </Button>
          )}
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground me-1 inline-flex items-center gap-0.5 text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous
        render={
          <TooltipIconButton tooltip="Previous answer" />
        }
      >
        <ChevronLeftIcon />
      </BranchPickerPrimitive.Previous>
      <span
        className="aui-branch-picker-state min-w-8 text-center font-medium tabular-nums"
        title="Answer versions"
      >
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next
        render={<TooltipIconButton tooltip="Next answer" />}
      >
        <ChevronRightIcon />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
