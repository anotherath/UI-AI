/** Resolve the backend message UUID from an assistant-ui / UI message. */
export function resolveBackendMessageId(message: {
  id?: string;
  metadata?: {
    custom?: Record<string, unknown>;
    backendMessageId?: unknown;
  };
}): string | null {
  const custom = message.metadata?.custom;
  const fromCustom =
    custom && typeof custom.backendMessageId === "string"
      ? custom.backendMessageId.trim()
      : "";
  if (fromCustom) return fromCustom;

  const fromMeta =
    typeof message.metadata?.backendMessageId === "string"
      ? message.metadata.backendMessageId.trim()
      : "";
  if (fromMeta) return fromMeta;

  const id = typeof message.id === "string" ? message.id.trim() : "";
  if (
    id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return id;
  }
  return null;
}
