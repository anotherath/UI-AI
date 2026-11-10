"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { AuthProvider } from "@/components/auth/auth-provider";
import { LoginGate } from "@/components/auth/login-gate";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { SyncBackendSessions } from "@/components/assistant-ui/sync-backend-sessions";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/elements/threadlist-sidebar.aui";
import { AgentChatTransport } from "@/lib/agent-chat-transport";

export const Assistant = () => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Main chat → agent-ai-rag SSE (cookie session on :8000).
    // canResume: after refresh, reconnect to background run via
    // GET …/runs/{runId}/stream (see AgentChatTransport.reconnectToStream).
    transport: new AgentChatTransport(),
    canResume: true,
  });

  return (
    <AuthProvider>
      <AssistantRuntimeProvider runtime={runtime}>
        <LoginGate>
          <SyncBackendSessions />
          <SidebarProvider defaultOpen>
            <div className="flex h-dvh w-full bg-[#121214]">
              <ThreadListSidebar />
              <SidebarInset className="bg-[#121214] md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none">
                <div className="flex-1 overflow-hidden bg-[#121214]">
                  <Thread />
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </LoginGate>
      </AssistantRuntimeProvider>
    </AuthProvider>
  );
};
