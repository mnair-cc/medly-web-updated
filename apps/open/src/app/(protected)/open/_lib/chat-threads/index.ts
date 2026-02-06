// API functions
export { createThread, fetchThreadList, fetchThreadMessages } from "./api";

// React Query options
export {
  createThreadMutationOptions,
  threadListQueryOptions,
  threadMessagesQueryOptions,
} from "./queries";

// Cache operations (for streaming/external updates)
export {
  addMessage,
  setMessages,
  setStructuredResponse,
  setTitle,
  updateThreadTitle,
} from "./queries";

// Types
export type {
  StreamingOverlay,
  ThreadMessagesData,
  ThreadSummary,
  UseChatThreadsOptions,
  UseChatThreadsReturn,
} from "./types";

// Hook
export { useChatThreads } from "./useChatThreads";
