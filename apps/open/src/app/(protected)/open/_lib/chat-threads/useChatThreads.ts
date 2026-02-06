"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "../../_components/chat/MOChatLayoutClient";
import {
  addMessage,
  setMessages as cacheSetMessages,
  setStructuredResponse as cacheSetStructuredResponse,
  createThreadMutationOptions,
  setTitle,
  threadListQueryOptions,
  threadMessagesQueryOptions,
  updateThreadTitle,
} from "./queries";
import type {
  StreamingOverlay,
  UseChatThreadsOptions,
  UseChatThreadsReturn,
} from "./types";

/**
 * Unified hook for managing chat threads.
 *
 * Design principles:
 * - React Query cache is the single source of truth for thread data
 * - Cache operations are pure functions in queries.ts
 * - Mutation handles all thread creation logic (cache + state updates)
 * - Local state only for selection (threadId per collection) and streaming overlay
 */
export function useChatThreads({
  collectionId,
  initialThreadIdsByCollection,
}: UseChatThreadsOptions): UseChatThreadsReturn {
  const queryClient = useQueryClient();

  // ============================================
  // LOCAL STATE
  // ============================================

  const [threadIdsByCollection, setThreadIdsByCollection] = useState<
    Record<string, string>
  >(initialThreadIdsByCollection ?? {});

  const [streamingOverlay, setStreamingOverlay] = useState<
    (StreamingOverlay & { threadId: string }) | null
  >(null);

  // ============================================
  // DERIVED STATE
  // ============================================

  const currentThreadId = collectionId
    ? (threadIdsByCollection[collectionId] ?? null)
    : null;

  // True when collection is selected but has no thread yet (needs initial creation)
  const needsInitialThread = !!collectionId && !currentThreadId;

  // ============================================
  // QUERIES
  // ============================================

  // Disable thread list query while creating initial thread to prevent race condition:
  // - Without this, query would fetch [] from server
  // - Mutation would add thread to cache
  // - Query response could overwrite cache with stale []
  const threadListQuery = useQuery({
    ...threadListQueryOptions(collectionId),
    enabled: !!collectionId && !needsInitialThread,
  });
  const messagesQuery = useQuery(threadMessagesQueryOptions(currentThreadId));

  // ============================================
  // MUTATION
  // ============================================

  const createThreadMutation = useMutation(
    createThreadMutationOptions(queryClient, {
      onBeforeCreate: () => {
        // Clear streaming overlay when starting a new thread
        setStreamingOverlay(null);
      },
      onThreadCreated: (mutationCollectionId, threadId) => {
        // Select the newly created thread
        setThreadIdsByCollection((prev) => ({
          ...prev,
          [mutationCollectionId]: threadId,
        }));
      },
    }),
  );

  // ============================================
  // INITIAL THREAD CREATION
  // ============================================

  // When a collection is selected but has no thread yet (e.g., new collection),
  // automatically create an initial thread. This ensures the user always has
  // a thread to chat in when viewing a collection.
  useEffect(() => {
    if (!collectionId) return;
    if (threadIdsByCollection[collectionId]) return;
    if (createThreadMutation.isPending) return;

    createThreadMutation.mutate(collectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, threadIdsByCollection]);

  // ============================================
  // ACTIONS
  // ============================================

  const switchThread = useCallback(
    (threadId: string) => {
      if (!collectionId) return;
      setStreamingOverlay(null);
      setThreadIdsByCollection((prev) => ({
        ...prev,
        [collectionId]: threadId,
      }));
    },
    [collectionId],
  );

  const setThreadTitle = useCallback(
    (threadId: string, title: string) => {
      if (threadId === currentThreadId) {
        setTitle(queryClient, threadId, title);
      }
      if (collectionId) {
        updateThreadTitle(queryClient, collectionId, threadId, title);
      }
    },
    [queryClient, currentThreadId, collectionId],
  );

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      if (!currentThreadId) return;
      cacheSetMessages(queryClient, currentThreadId, updater);
    },
    [queryClient, currentThreadId],
  );

  const setStructuredResponse = useCallback(
    (
      response: { quickReplies?: Array<{ id: string; label: string }> } | null,
    ) => {
      if (!currentThreadId) return;
      cacheSetStructuredResponse(queryClient, currentThreadId, response);
    },
    [queryClient, currentThreadId],
  );

  const startNewChat = useCallback(() => {
    if (!collectionId) return;

    const messages = messagesQuery.data?.messages ?? [];
    if (messages.length === 0) return;

    const threads = threadListQuery.data ?? [];
    const newestThread = threads[0];

    // Reuse empty thread if available (no title means no messages sent yet)
    if (
      newestThread &&
      newestThread.id !== currentThreadId &&
      !newestThread.title
    ) {
      switchThread(newestThread.id);
      return;
    }

    // Create new thread via mutation (handles cache + state updates)
    createThreadMutation.mutate(collectionId);
  }, [
    collectionId,
    messagesQuery.data?.messages,
    threadListQuery.data,
    currentThreadId,
    switchThread,
    createThreadMutation,
  ]);

  const retryCreateThread = useCallback(() => {
    if (!collectionId) return;
    createThreadMutation.reset();
    createThreadMutation.mutate(collectionId);
  }, [collectionId, createThreadMutation]);

  // ============================================
  // STREAMING
  // ============================================

  const startStreaming = useCallback(
    (messageId: string) => {
      if (!currentThreadId) return;
      setStreamingOverlay({
        messageId,
        content: "",
        isStreaming: true,
        threadId: currentThreadId,
      });
    },
    [currentThreadId],
  );

  const updateStreamingContent = useCallback((content: string) => {
    setStreamingOverlay((prev) => (prev ? { ...prev, content } : null));
  }, []);

  const endStreaming = useCallback(
    (finalMessage: ChatMessage) => {
      if (currentThreadId) {
        addMessage(queryClient, currentThreadId, finalMessage);
      }
      setStreamingOverlay(null);
    },
    [queryClient, currentThreadId],
  );

  // ============================================
  // DERIVED DATA
  // ============================================

  const threadTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    for (const thread of threadListQuery.data ?? []) {
      if (thread.title) {
        titles[thread.id] = thread.title;
      }
    }
    return titles;
  }, [threadListQuery.data]);

  const derivedMessages = useMemo(() => {
    const cachedMessages = messagesQuery.data?.messages ?? [];

    if (!streamingOverlay || streamingOverlay.threadId !== currentThreadId) {
      return cachedMessages;
    }

    const existingIdx = cachedMessages.findIndex(
      (m) => m.id === streamingOverlay.messageId,
    );

    if (existingIdx >= 0) {
      return cachedMessages.map((m, idx) =>
        idx === existingIdx
          ? { ...m, content: streamingOverlay.content, isStreaming: true }
          : m,
      );
    }

    return [
      ...cachedMessages,
      {
        id: streamingOverlay.messageId,
        role: "assistant" as const,
        content: streamingOverlay.content,
        timestamp: Date.now(),
        isStreaming: true,
      },
    ];
  }, [messagesQuery.data?.messages, streamingOverlay, currentThreadId]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Query data
    threads: threadListQuery.data ?? [],
    messages: derivedMessages,
    threadTitle: messagesQuery.data?.title ?? null,
    threadTitles,
    structuredResponse: messagesQuery.data?.structuredResponse ?? null,

    // Loading/error states
    isLoadingThreads: threadListQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    threadsError: threadListQuery.error as Error | null,
    messagesError: messagesQuery.error as Error | null,

    // Local state
    currentThreadId,

    // Thread creation
    isCreatingThread: createThreadMutation.isPending,
    createThreadError: createThreadMutation.error,

    // Actions
    switchThread,
    startNewChat,
    setThreadTitle,
    setMessages,
    setStructuredResponse,
    retryCreateThread,

    // Streaming
    startStreaming,
    updateStreamingContent,
    endStreaming,
    isStreaming:
      !!streamingOverlay && streamingOverlay.threadId === currentThreadId,
  };
}
