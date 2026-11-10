/**
 * Edit composer sets this right before send(); AgentChatTransport consumes it
 * so POST …/messages/{id}/edit is used instead of creating a new message.
 */
let pending: { sessionId: string; messageId: string } | null = null;

export function setPendingMessageEdit(next: {
  sessionId: string;
  messageId: string;
}): void {
  pending = next;
}

export function takePendingMessageEdit(): {
  sessionId: string;
  messageId: string;
} | null {
  const next = pending;
  pending = null;
  return next;
}

/** Last user message id per backend session (from run_started / hydrate). */
const lastUserMessageIdBySession = new Map<string, string>();

export function rememberSessionUserMessageId(
  sessionId: string,
  messageId: string,
): void {
  lastUserMessageIdBySession.set(sessionId, messageId);
}

export function getLastSessionUserMessageId(
  sessionId: string,
): string | undefined {
  return lastUserMessageIdBySession.get(sessionId);
}

export function rememberSessionUserMessageIds(
  sessionId: string,
  messageIds: string[],
): void {
  const last = messageIds[messageIds.length - 1];
  if (last) lastUserMessageIdBySession.set(sessionId, last);
}
