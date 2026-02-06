/**
 * Utility functions for chat threads.
 */

/**
 * Parse structured JSON response from assistant message content.
 * Returns the message text if JSON parsing succeeds, or the original content otherwise.
 *
 * NOTE: This is a fallback for legacy messages that were saved with raw JSON content.
 * New messages are parsed at save time in the chat API route, so they already
 * contain just the message text. This function ensures backwards compatibility.
 */
export function parseAssistantContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return content;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    // Not valid JSON, return original
  }
  return content;
}
