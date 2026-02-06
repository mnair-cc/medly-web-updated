/**
 * React Query options and cache operations for chat threads.
 * Single surface for all query/mutation/cache operations.
 */

import { queryKeys } from "@/app/_lib/query-keys";
import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "../../_components/chat/MOChatLayoutClient";
import { createThread, fetchThreadList, fetchThreadMessages } from "./api";
import type { ThreadMessagesData, ThreadSummary } from "./types";

// ============================================
// QUERY OPTIONS
// ============================================

export const threadListQueryOptions = (collectionId: string | null) => ({
  queryKey: queryKeys.chatThreads(collectionId ?? ""),
  queryFn: () => fetchThreadList(collectionId!),
  enabled: !!collectionId,
  staleTime: Infinity,
});

export const threadMessagesQueryOptions = (threadId: string | null) => ({
  queryKey: queryKeys.threadMessages(threadId ?? ""),
  queryFn: () => fetchThreadMessages(threadId!),
  enabled: !!threadId,
  staleTime: Infinity,
});

// ============================================
// CACHE OPERATIONS (pure functions for streaming/external updates)
// ============================================

const emptyMessagesData: ThreadMessagesData = {
  messages: [],
  title: null,
  structuredResponse: null,
};

export function setMessages(
  queryClient: QueryClient,
  threadId: string,
  updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
): void {
  const key = queryKeys.threadMessages(threadId);
  queryClient.setQueryData<ThreadMessagesData>(key, (old) => {
    const existing = old ?? emptyMessagesData;
    const newMessages =
      typeof updater === "function" ? updater(existing.messages) : updater;
    return { ...existing, messages: newMessages };
  });
}

export function setTitle(
  queryClient: QueryClient,
  threadId: string,
  title: string,
): void {
  const key = queryKeys.threadMessages(threadId);
  queryClient.setQueryData<ThreadMessagesData>(key, (old) => {
    if (!old) return old;
    return { ...old, title };
  });
}

export function setStructuredResponse(
  queryClient: QueryClient,
  threadId: string,
  response: { quickReplies?: Array<{ id: string; label: string }> } | null,
): void {
  const key = queryKeys.threadMessages(threadId);
  queryClient.setQueryData<ThreadMessagesData>(key, (old) => {
    if (!old) return old;
    return { ...old, structuredResponse: response };
  });
}

export function addMessage(
  queryClient: QueryClient,
  threadId: string,
  message: ChatMessage,
): void {
  const key = queryKeys.threadMessages(threadId);
  queryClient.setQueryData<ThreadMessagesData>(key, (old) => {
    const existing = old ?? emptyMessagesData;
    if (existing.messages.some((m) => m.id === message.id)) return existing;
    return { ...existing, messages: [...existing.messages, message] };
  });
}

export function updateThreadTitle(
  queryClient: QueryClient,
  collectionId: string,
  threadId: string,
  title: string,
): void {
  const key = queryKeys.chatThreads(collectionId);
  queryClient.setQueryData<ThreadSummary[]>(key, (old) => {
    if (!old) return old;
    return old.map((t) => (t.id === threadId ? { ...t, title } : t));
  });
}

// ============================================
// MUTATION OPTIONS
// ============================================

export interface CreateThreadMutationCallbacks {
  /** Called after thread is created and cache is updated. Use to update local state (e.g., select the new thread). */
  onThreadCreated: (collectionId: string, threadId: string) => void;
  /** Called before mutation starts. Use to reset local state (e.g., clear streaming overlay). */
  onBeforeCreate?: () => void;
}

/**
 * Mutation options for creating a new thread.
 * Cache updates happen in onSuccess after the thread is created.
 *
 * Note: The thread list query is disabled while creating initial thread
 * (see useChatThreads) to prevent race conditions. No pre-seeding needed in onMutate.
 */
export const createThreadMutationOptions = (
  queryClient: QueryClient,
  callbacks: CreateThreadMutationCallbacks,
) => ({
  mutationFn: createThread,
  retry: 2,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 4000),

  // Before mutation: reset local state (e.g., clear streaming overlay)
  onMutate: () => {
    callbacks.onBeforeCreate?.();
  },

  // After mutation: update caches and notify
  onSuccess: (
    thread: Awaited<ReturnType<typeof createThread>>,
    collectionId: string,
  ) => {
    // Pre-seed messages cache for the new thread
    const messagesKey = queryKeys.threadMessages(thread.id);
    if (!queryClient.getQueryData(messagesKey)) {
      queryClient.setQueryData<ThreadMessagesData>(
        messagesKey,
        emptyMessagesData,
      );
    }

    // Add thread to list cache (or initialize if empty)
    const listKey = queryKeys.chatThreads(collectionId);
    queryClient.setQueryData<ThreadSummary[]>(listKey, (old) => {
      const existing = old ?? [];
      if (existing.some((t) => t.id === thread.id)) return existing;
      return [
        { id: thread.id, title: thread.title, createdAt: thread.createdAt },
        ...existing,
      ];
    });

    callbacks.onThreadCreated(collectionId, thread.id);
  },
});
