import {
  DefaultChatTransport,
  readUIMessageStream,
  type UIMessage,
} from "ai";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export type SubsessionChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function toUIMessage(turn: SubsessionChatTurn): UIMessage {
  return {
    id: turn.id,
    role: turn.role,
    parts: [{ type: "text", text: turn.content }],
  };
}

function textFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

/** Stream an assistant reply into a subsession via the same /api/chat as main. */
export async function streamSubsessionReply(options: {
  chatId: string;
  messages: SubsessionChatTurn[];
  assistantId: string;
  onUpdate: (content: string) => void;
  onError: (error: string) => void;
  abortSignal?: AbortSignal;
}): Promise<void> {
  try {
    const chunkStream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: options.chatId,
      messageId: undefined,
      messages: options.messages.map(toUIMessage),
      abortSignal: options.abortSignal,
    });

    for await (const message of readUIMessageStream({
      message: {
        id: options.assistantId,
        role: "assistant",
        parts: [],
      },
      stream: chunkStream,
      onError: (error) => {
        options.onError(
          error instanceof Error ? error.message : String(error),
        );
      },
    })) {
      options.onUpdate(textFromUIMessage(message));
    }
  } catch (error) {
    if (options.abortSignal?.aborted) return;
    options.onError(error instanceof Error ? error.message : String(error));
  }
}
