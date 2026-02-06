import type { ChatMessage } from "../../_components/chat/MOChatLayoutClient";
import type { StructuredResponse } from "../../_types/chat";

/**
 * Thread summary for the dropdown list (simplified from ChatThreadResponse).
 */
export interface ThreadSummary {
  id: string;
  title?: string;
  createdAt: number;
}

/**
 * Thread messages data structure stored in React Query cache.
 */
export interface ThreadMessagesData {
  messages: ChatMessage[];
  title: string | null;
  structuredResponse: StructuredResponse | null;
}

/**
 * Streaming overlay for high-frequency updates during streaming.
 * This is temporary state that merges with query data.
 */
export interface StreamingOverlay {
  messageId: string;
  content: string;
  isStreaming: boolean;
}

/**
 * Options for the useChatThreads hook.
 */
export interface UseChatThreadsOptions {
  /** The currently selected collection ID */
  collectionId: string | null;
  /** Initial thread IDs keyed by collection (from SSR) */
  initialThreadIdsByCollection?: Record<string, string>;
}

/**
 * Return type for the useChatThreads hook.
 */
export interface UseChatThreadsReturn {
  // ===== Query data =====
  /** List of threads for current collection */
  threads: ThreadSummary[];
  /** Messages for current thread (merged with streaming overlay) */
  messages: ChatMessage[];
  /** Title of current thread */
  threadTitle: string | null;
  /** Thread titles keyed by threadId (for quick lookup) */
  threadTitles: Record<string, string>;
  /** Structured response (quick replies, etc.) */
  structuredResponse: StructuredResponse | null;

  // ===== Loading/error states =====
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  threadsError: Error | null;
  messagesError: Error | null;

  // ===== Local state =====
  /** Currently selected thread ID */
  currentThreadId: string | null;

  // ===== Thread creation =====
  isCreatingThread: boolean;
  createThreadError: Error | null;

  // ===== Actions =====
  /** Switch to a different thread */
  switchThread: (threadId: string) => void;
  /** Start a new chat (creates new thread or reuses empty one) */
  startNewChat: () => void;
  /** Set thread title (updates both messages cache and thread list) */
  setThreadTitle: (threadId: string, title: string) => void;
  /** Set messages for current thread (functional or direct) */
  setMessages: (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  /** Set structured response for current thread */
  setStructuredResponse: (response: StructuredResponse | null) => void;
  /** Retry thread creation after error */
  retryCreateThread: () => void;

  // ===== Streaming =====
  /** Start streaming a new message */
  startStreaming: (messageId: string) => void;
  /** Update streaming content (high-frequency, doesn't touch query cache) */
  updateStreamingContent: (content: string) => void;
  /** End streaming and commit final message to cache */
  endStreaming: (finalMessage: ChatMessage) => void;
  /** Whether currently streaming */
  isStreaming: boolean;
}
