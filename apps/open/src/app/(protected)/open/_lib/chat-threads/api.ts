/**
 * API fetch functions for chat threads.
 */

import type { ChatThreadResponse } from "@/db/repositories/types";
import type { ChatMessage } from "../../_components/chat/MOChatLayoutClient";
import type { ThreadMessagesData, ThreadSummary } from "./types";
import { parseAssistantContent } from "./utils";

/**
 * Fetch thread summaries for a collection.
 * Uses the lightweight /list endpoint which only returns id, title, createdAt (no messages).
 */
export async function fetchThreadList(
  collectionId: string,
): Promise<ThreadSummary[]> {
  const response = await fetch(
    `/api/open/chat-threads/list?collectionId=${collectionId}&limit=50`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch threads");
  }

  return response.json();
}

/**
 * Fetch thread messages by thread ID.
 */
export async function fetchThreadMessages(
  threadId: string,
): Promise<ThreadMessagesData> {
  const response = await fetch(`/api/open/chat-threads/${threadId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch thread messages");
  }

  const thread: ChatThreadResponse = await response.json();

  // Convert server messages to ChatMessage format
  const messages: ChatMessage[] = (thread.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content:
      m.role === "assistant" ? parseAssistantContent(m.content) : m.content,
    timestamp: m.createdAt,
  }));

  return {
    messages,
    title: thread.title ?? null,
    structuredResponse: null,
  };
}

/**
 * Create a new thread for a collection.
 */
export async function createThread(
  collectionId: string,
): Promise<ChatThreadResponse> {
  const response = await fetch("/api/open/chat-threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionId,
      data: {},
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create thread");
  }

  return response.json();
}
