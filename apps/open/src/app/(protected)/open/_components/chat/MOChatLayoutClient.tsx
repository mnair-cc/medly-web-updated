"use client";

import type {
  MockPage,
  QuestionSessionPageType,
  SessionType,
} from "@/app/(protected)/sessions/types";
import { useUser } from "@/app/_context/UserProvider";
import { useSocket } from "@/app/_hooks/useSocket";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import type { CollectionContext } from "../../_ai/systemPrompt";
import { useAITaskSafe } from "../../_context/AITaskProvider";
import { useTriggerProcessor } from "../../_hooks/useTriggerProcessor";
import { useChatThreads } from "../../_lib/chat-threads";
import type {
  ChatAttachments,
  ChatIntent,
  FileUploadedContext,
  StructuredResponse,
} from "../../_types/chat";
import type { SourceReference } from "../../_types/content";
import type { UploadTriggerPayload } from "../../_types/triggers";
import OpenLayoutSwitch from "../layout/OpenLayoutSwitch";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";

// ============================================
// TYPES
// ============================================

// Header context data
export interface HeaderData {
  sessionTitle: string;
  sessionSubtitle: string;
  sessionType: SessionType;
  documentId?: string;
  documentType?: "document" | "practice" | "flashcards" | "notes";
  pageType: QuestionSessionPageType;
  returnUrl: string;
  hasNotes?: boolean;
  pages?: MockPage[];
  currentPageIndex?: number;
  onPageTypeChange?: (pageType: QuestionSessionPageType) => void;
  onSummaryButtonClick?: () => void;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export type PageType = "document" | "flashcards" | "notes" | "questions";

export type PageCapability =
  | "createFlashcards"
  | "updateFlashcards"
  | "deleteFlashcards"
  | "startFlashcardGeneration"
  | "addStreamedFlashcard"
  | "endFlashcardGeneration"
  | "createQuestions"
  | "highlightText"
  | "highlightArea"
  | "addComment"
  | "addNote"
  | "editNotes"
  | "rewriteNotes"
  | "navigateToPage"
  | "createNotesDocument"
  | "createFlashcardsDocument"
  | "createPracticeDocument"
  | "navigateToDocument";

export type MessageType = "userMessage" | "apiMessage" | "systemMessage";

export interface DraggedContextItem {
  id: string;
  name: string;
  type: "document" | "folder";
  documentType?: "document" | "practice" | "flashcards" | "notes" | "canvas";
  documentIds: string[]; // For folders: all docs inside
}

export interface ChatMessageAttachments {
  selectedText?: string | null;
  screenshot?: {
    dataUrl: string;
  } | null;
  draggedContexts?: DraggedContextItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachments?: ChatMessageAttachments;
  isStatusMessage?: boolean;
  isStreaming?: boolean; // True while tokens are still arriving
  invocationId?: string; // Groups messages from same API invocation
  // Tool call message fields
  isToolCall?: boolean;
  toolCallId?: string;
  toolName?: string;
  toolCallStatus?: "running" | "completed" | "error";
  toolDisplayDetail?: string; // e.g., document title for readDocument
  // Awaiting response fields (persistent until next user action)
  isAwaitingResponse?: boolean;
  awaitingText?: string;
}

export interface SelectedScreenshot {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ToolCallState {
  toolCallId: string;
  toolName: string;
  status: "running" | "completed" | "error";
  toolDisplayDetail?: string; // e.g., document title for readDocument
}

export interface PageContext {
  pageType: PageType;
  currentPageText?: string;
  allPagesText?: Array<{ page: number; text: string }>;
  pageScreenshot?: string | null;
  selectedText?: string | null;
  highlightedText?: string[];
  documentTranscription?: string;
  documentNotes?: string;
  pageNotes?: string;
  isTranscribing?: boolean;
  // Session-level context
  sourceReferences?: SourceReference[];
  documentId?: string;
  // Extensible: pages can add custom context
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CapabilityHandler<T = any> = (params: T) => Promise<unknown> | unknown;

interface RegisteredCapability {
  id: string;
  capability: PageCapability;
  handler: CapabilityHandler;
  pageType: PageType;
  priority: number;
}

type ContextCollector = () => Promise<Partial<PageContext>>;

interface RegisteredContextCollector {
  id: string;
  pageType: PageType;
  collector: ContextCollector;
}

// ============================================
// CONTEXT TYPE
// ============================================

interface ChatContextValue {
  // Chat state
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  userInput: string;
  setUserInput: (input: string) => void;

  // Thread list and current thread
  threads: Array<{ id: string; title?: string; createdAt: number }>;
  currentThreadId: string | null;

  // Thread creation state
  isCreatingThread: boolean;
  createThreadError: Error | null;
  retryCreateThread: () => void;

  // Thread titles (keyed by threadId)
  threadTitles: Record<string, string>;
  setThreadTitle: (threadId: string, title: string) => void;

  // PDF URL for citation preview
  pdfUrl: string | null;
  setPdfUrl: (url: string | null) => void;

  // PDF navigation for citation clicks
  targetPdfDocumentId: string | null;
  setTargetPdfDocumentId: (documentId: string | null) => void;
  targetPdfPage: number | null;
  setTargetPdfPage: (page: number | null) => void;
  targetHighlightText: string | null;
  setTargetHighlightText: (text: string | null) => void;

  // Selected text (from document/notes selection)
  selectedText: string | null;
  updateSelectedText: (text: string | null) => void;

  // Selected screenshot (from rectangle selection on document)
  selectedScreenshot: SelectedScreenshot | null;
  updateSelectedScreenshot: (screenshot: SelectedScreenshot | null) => void;

  // Skills (slash commands)
  currentSkill: string | null;
  updateCurrentSkill: (skill: string | null) => void;
  currentSkillPrompt: string | null;
  updateCurrentSkillPrompt: (prompt: string | null) => void;

  // Dragged context (from sidebar)
  draggedContexts: DraggedContextItem[];
  addDraggedContext: (item: DraggedContextItem) => void;
  removeDraggedContext: (id: string) => void;

  // Chat actions (OpenAI-style API)
  sendMessage: (content: string, attachments?: ChatAttachments) => void;
  sendSystemEvent: <T extends Exclude<ChatIntent["type"], "userMessage">>(
    type: T,
    context: Extract<ChatIntent, { type: T }> extends { context: infer C }
      ? C
      : never,
  ) => void;
  startNewChat: () => void;
  switchToThread: (threadId: string) => void;

  // Chat visibility
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;

  // Page context
  currentPageType: PageType;
  setCurrentPageType: (type: PageType) => void;
  collectPageContext: () => Promise<PageContext>;

  // Capability registry
  registerCapability: (
    capability: PageCapability,
    handler: CapabilityHandler,
    pageType: PageType,
    priority?: number,
  ) => () => void;
  executeCapability: <T>(
    capability: PageCapability,
    params: T,
  ) => Promise<{ success: boolean; error?: string }>;
  hasCapability: (capability: PageCapability) => boolean;
  getAvailableCapabilities: () => PageCapability[];

  // Context collectors
  registerContextCollector: (
    pageType: PageType,
    collector: ContextCollector,
  ) => () => void;

  // Trigger events (for upload → AI flow)
  sendTriggerEvent: (payload: UploadTriggerPayload) => void;

  // Structured response (quick replies, etc.)
  structuredResponse: StructuredResponse | null;
  clearStructuredResponse: () => void;

  // Socket access
  socket: Socket | null;
  socketError: Error | null;

  // Header state
  headerData: HeaderData | null;
  setHeaderData: (data: HeaderData | null) => void;
  updateHeaderData: (data: Partial<HeaderData>) => void;
}

// ============================================
// CONTEXT + HOOKS
// ============================================

const ChatContext = createContext<ChatContextValue | null>(null);

export const useAiChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useAiChat must be used within MOChatLayoutClient");
  }
  return context;
};

/**
 * Hook for pages to register capabilities that the AI can call
 */
export const useRegisterCapability = (
  capability: PageCapability,
  handler: CapabilityHandler,
  pageType: PageType,
  priority: number = 0,
) => {
  const { registerCapability } = useAiChat();

  useEffect(() => {
    const unregister = registerCapability(
      capability,
      handler,
      pageType,
      priority,
    );
    return unregister;
  }, [capability, handler, pageType, priority, registerCapability]);
};

/**
 * Hook for pages to register context collectors
 */
export const useRegisterContextCollector = (
  pageType: PageType,
  collector: ContextCollector,
) => {
  const { registerContextCollector } = useAiChat();

  useEffect(() => {
    const unregister = registerContextCollector(pageType, collector);
    return unregister;
  }, [pageType, collector, registerContextCollector]);
};

/**
 * Hook to access header data
 */
export const useHeaderData = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useHeaderData must be used within MOChatLayoutClient");
  }
  return {
    headerData: context.headerData,
    setHeaderData: context.setHeaderData,
    updateHeaderData: context.updateHeaderData,
  };
};

// ============================================
// PROVIDER COMPONENT
// ============================================

interface MOChatLayoutClientProps {
  children: React.ReactNode;
  initialThreadIdsByCollection?: Record<string, string>;
}

export default function MOChatLayoutClient({
  children,
  initialThreadIdsByCollection,
}: MOChatLayoutClientProps) {
  // Socket connection
  const { socket, error: socketError } = useSocket();

  // Sidebar context for collection data
  const {
    selectedCollection,
    collections,
    getCollectionContent,
    documents: allDocuments,
    createNotesDocument: sidebarCreateNotes,
    createFlashcardDocument: sidebarCreateFlashcards,
    createPracticeDocument: sidebarCreatePractice,
  } = useSidebar();

  const router = useRouter();
  const { track } = useTracking();
  const aiTask = useAITaskSafe();
  const { user } = useUser();

  // Basic chat state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Unified chat threads hook - manages threads, messages, selection, and streaming
  const {
    threads,
    messages,
    threadTitle,
    threadTitles,
    structuredResponse,
    currentThreadId,
    isCreatingThread,
    createThreadError,
    switchThread: switchToThread,
    startNewChat: hookStartNewChat,
    setThreadTitle,
    setMessages: setMessagesForCurrentThread,
    setStructuredResponse: setStructuredResponseForCurrentThread,
    retryCreateThread,
  } = useChatThreads({
    collectionId: selectedCollection,
    initialThreadIdsByCollection,
  });

  // Header state
  const [headerData, setHeaderData] = useState<HeaderData | null>(null);

  const updateHeaderData = useCallback((data: Partial<HeaderData>) => {
    setHeaderData((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  // PDF URL for citation preview
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // PDF navigation for citation clicks
  const [targetPdfDocumentId, setTargetPdfDocumentId] = useState<string | null>(
    null,
  );
  const [targetPdfPage, setTargetPdfPage] = useState<number | null>(null);
  const [targetHighlightText, setTargetHighlightText] = useState<string | null>(
    null,
  );

  // Selected text (from document/notes text selection)
  const [selectedText, setSelectedText] = useState<string | null>(null);

  // Selected screenshot (from rectangle selection on document)
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<SelectedScreenshot | null>(null);

  // Skills (slash commands)
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  const [currentSkillPrompt, setCurrentSkillPrompt] = useState<string | null>(
    null,
  );

  // Dragged context (from sidebar drag-to-chat)
  const [draggedContexts, setDraggedContexts] = useState<DraggedContextItem[]>(
    [],
  );

  // Page context
  const [currentPageType, setCurrentPageType] = useState<PageType>("document");


  // Registries (using refs to avoid re-renders on registration changes)
  const capabilityRegistry = useRef<Map<string, RegisteredCapability>>(
    new Map(),
  );
  const contextCollectorRegistry = useRef<
    Map<string, RegisteredContextCollector>
  >(new Map());
  const idCounter = useRef(0);

  // Ref for resetRateLimit (set after useTriggerProcessor is called)
  const resetRateLimitRef = useRef<(() => void) | null>(null);

  // Ref to track the currently streaming message ID
  const streamingMessageIdRef = useRef<string | null>(null);

  // Ref to store current collection context for streaming handlers
  const collectionContextRef = useRef<CollectionContext | undefined>(undefined);

  // ----------------------------------------
  // Chat visibility
  // ----------------------------------------
  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);
  const toggleChat = useCallback(() => setIsChatOpen((prev) => !prev), []);

  // ----------------------------------------
  // Selected text & skills
  // ----------------------------------------
  const updateSelectedText = useCallback((text: string | null) => {
    setSelectedText(text);
  }, []);

  const updateSelectedScreenshot = useCallback(
    (screenshot: SelectedScreenshot | null) => {
      setSelectedScreenshot(screenshot);
    },
    [],
  );

  const updateCurrentSkill = useCallback((skill: string | null) => {
    setCurrentSkill(skill);
  }, []);

  const updateCurrentSkillPrompt = useCallback((prompt: string | null) => {
    setCurrentSkillPrompt(prompt);
  }, []);

  const clearStructuredResponse = useCallback(() => {
    setStructuredResponseForCurrentThread(null);
  }, [setStructuredResponseForCurrentThread]);

  // ----------------------------------------
  // Dragged context methods
  // ----------------------------------------
  const addDraggedContext = useCallback((item: DraggedContextItem) => {
    setDraggedContexts((prev) => {
      // Prevent duplicates
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeDraggedContext = useCallback((id: string) => {
    setDraggedContexts((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Listen for custom event from sidebar drag-to-chat
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<DraggedContextItem>;
      addDraggedContext(customEvent.detail);
    };
    window.addEventListener("medly:addChatContext", handler);
    return () => window.removeEventListener("medly:addChatContext", handler);
  }, [addDraggedContext]);

  // ----------------------------------------
  // Capability registration
  // ----------------------------------------
  const registerCapability = useCallback(
    (
      capability: PageCapability,
      handler: CapabilityHandler,
      pageType: PageType,
      priority: number = 0,
    ): (() => void) => {
      const id = `cap-${idCounter.current++}`;
      const entry: RegisteredCapability = {
        id,
        capability,
        handler,
        pageType,
        priority,
      };
      capabilityRegistry.current.set(id, entry);

      console.log(`[Chat] Registered capability: ${capability} (${pageType})`);

      // Return unregister function
      return () => {
        capabilityRegistry.current.delete(id);
        console.log(
          `[Chat] Unregistered capability: ${capability} (${pageType})`,
        );
      };
    },
    [],
  );

  const hasCapability = useCallback((capability: PageCapability): boolean => {
    for (const entry of capabilityRegistry.current.values()) {
      if (entry.capability === capability) {
        return true;
      }
    }
    return false;
  }, []);

  const getAvailableCapabilities = useCallback((): PageCapability[] => {
    const capabilities = new Set<PageCapability>();
    for (const entry of capabilityRegistry.current.values()) {
      capabilities.add(entry.capability);
    }
    return Array.from(capabilities);
  }, []);

  const executeCapability = useCallback(
    async <T,>(
      capability: PageCapability,
      params: T,
    ): Promise<{ success: boolean; error?: string }> => {
      // Find all handlers for this capability
      const handlers: RegisteredCapability[] = [];
      for (const entry of capabilityRegistry.current.values()) {
        if (entry.capability === capability) {
          handlers.push(entry);
        }
      }

      if (handlers.length === 0) {
        console.warn(`[Chat] No handler for capability: ${capability}`);
        return {
          success: false,
          error: `No handler for capability: ${capability}`,
        };
      }

      // Sort by priority (highest first), prefer current page type
      handlers.sort((a, b) => {
        // Prefer handlers matching current page type
        if (a.pageType === currentPageType && b.pageType !== currentPageType) {
          return -1;
        }
        if (b.pageType === currentPageType && a.pageType !== currentPageType) {
          return 1;
        }
        // Then by priority
        return b.priority - a.priority;
      });

      // Execute the highest priority handler
      const handler = handlers[0];
      try {
        const result = await handler.handler(params);
        // Capture error from handler if it returns { success, error }
        if (result && typeof result === "object" && "success" in result) {
          const success = (result as any).success as unknown;
          const errorMessage = (result as any).error as unknown;
          if (success === false) {
            console.error(
              `[Chat] Capability failed: ${capability}`,
              errorMessage,
            );
          } else {
            console.log(`[Chat] Executed capability: ${capability}`);
          }
          return result as { success: boolean; error?: string };
        }
        console.log(`[Chat] Executed capability: ${capability}`);
        return { success: true };
      } catch (error) {
        console.error(
          `[Chat] Failed to execute capability: ${capability}`,
          error,
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [currentPageType],
  );

  // ----------------------------------------
  // Context collector registration
  // ----------------------------------------
  const registerContextCollector = useCallback(
    (pageType: PageType, collector: ContextCollector): (() => void) => {
      const id = `ctx-${idCounter.current++}`;
      const entry: RegisteredContextCollector = {
        id,
        pageType,
        collector,
      };
      contextCollectorRegistry.current.set(id, entry);

      console.log(`[Chat] Registered context collector for: ${pageType}`);

      return () => {
        contextCollectorRegistry.current.delete(id);
        console.log(`[Chat] Unregistered context collector for: ${pageType}`);
      };
    },
    [],
  );

  const collectPageContext = useCallback(async (): Promise<PageContext> => {
    const baseContext: PageContext = {
      pageType: currentPageType,
    };

    // Collect from all registered collectors
    const collectorPromises: Promise<Partial<PageContext>>[] = [];
    for (const entry of contextCollectorRegistry.current.values()) {
      collectorPromises.push(
        entry.collector().catch((error) => {
          console.error(
            `[Chat] Context collector failed for ${entry.pageType}:`,
            error,
          );
          return {};
        }),
      );
    }

    const results = await Promise.all(collectorPromises);

    // Merge all results (baseContext guarantees pageType is present)
    const merged = results.reduce<PageContext>(
      (acc, result) => ({ ...acc, ...result }),
      baseContext,
    );

    return merged;
  }, [currentPageType]);

  // ----------------------------------------
  // Global capability registration (document creation + navigation)
  // ----------------------------------------
  useEffect(() => {
    // These capabilities are available from any page type
    const unregisterFns: (() => void)[] = [];

    // Create Notes Document
    unregisterFns.push(
      registerCapability(
        "createNotesDocument",
        async (params: {
          collectionId: string;
          folderId: string | null;
          position: number;
          name: string;
          navigate?: boolean;
        }) => {
          const doc = await sidebarCreateNotes(
            params.collectionId,
            params.folderId,
            params.position,
            params.name,
          );
          if (params.navigate !== false) {
            router.push(`/open/doc/${doc.id}`);
          }
        },
        "document", // Register on document page type but works globally
        100, // High priority
      ),
    );

    // Create Flashcards Document
    unregisterFns.push(
      registerCapability(
        "createFlashcardsDocument",
        async (params: {
          collectionId: string;
          folderId: string | null;
          position: number;
          name: string;
          navigate?: boolean;
        }) => {
          const doc = await sidebarCreateFlashcards(
            [],
            params.collectionId,
            params.folderId,
            params.position,
            params.name,
          );
          // Mark checklist step: create-flashcards
          window.dispatchEvent(
            new CustomEvent("medly:checklist-step", {
              detail: { stepId: "create-flashcards" },
            }),
          );
          if (params.navigate !== false) {
            router.push(`/open/doc/${doc.id}`);
          }
        },
        "document",
        100,
      ),
    );

    // Create Practice Document
    unregisterFns.push(
      registerCapability(
        "createPracticeDocument",
        async (params: {
          collectionId: string;
          folderId: string | null;
          position: number;
          name: string;
          navigate?: boolean;
        }) => {
          const doc = await sidebarCreatePractice(
            [],
            params.collectionId,
            params.folderId,
            params.position,
            params.name,
          );
          // Mark checklist step: prepare-exam
          window.dispatchEvent(
            new CustomEvent("medly:checklist-step", {
              detail: { stepId: "prepare-exam" },
            }),
          );
          if (params.navigate !== false) {
            router.push(`/open/doc/${doc.id}`);
          }
        },
        "document",
        100,
      ),
    );

    // Navigate to Document
    unregisterFns.push(
      registerCapability(
        "navigateToDocument",
        async (params: { documentId: string }) => {
          router.push(`/open/doc/${params.documentId}`);
        },
        "document",
        100,
      ),
    );

    return () => {
      unregisterFns.forEach((fn) => fn());
    };
  }, [
    registerCapability,
    sidebarCreateNotes,
    sidebarCreateFlashcards,
    sidebarCreatePractice,
    router,
  ]);

  // ----------------------------------------
  // Helper to parse structured response from text
  // ----------------------------------------
  const tryParseStructuredResponse = useCallback(
    (
      text: string,
    ): {
      message: string;
      threadTitle?: string;
      quickReplies?: Array<{ id: string; label: string; description?: string }>;
      unlockNextUpload?: boolean;
      awaitUserResponse?: { message: string };
      uploadRequest?: { label: string };
    } | null => {
      const trimmed = text.trim();
      if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.message === "string") {
          return parsed;
        }
      } catch {
        // Not valid JSON
      }
      return null;
    },
    [],
  );

  // ----------------------------------------
  // Shared SSE stream processor
  // ----------------------------------------
  const processAgentStream = useCallback(
    async (response: Response, invocationId: string) => {
      console.log("[processAgentStream] Starting, invocationId:", invocationId);
      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        console.log(
          "[processAgentStream] Read chunk, done:",
          done,
          "value length:",
          value?.length,
        );
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        console.log("[processAgentStream] Buffer:", buffer.slice(0, 200));

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const chunk = JSON.parse(jsonStr);

            // Log all chunks for debugging
            console.log("[processAgentStream] Chunk:", chunk.type, chunk);

            if (chunk.type === "step-start") {
              // Reset for new step - only create message if we don't already have one
              accumulatedText = "";
              if (!streamingMessageIdRef.current) {
                streamingMessageIdRef.current = `msg-${Date.now()}-assistant`;
                console.log(
                  "[processAgentStream] Creating message with invocationId:",
                  invocationId,
                );
                setMessagesForCurrentThread((prev) => [
                  ...prev,
                  {
                    id: streamingMessageIdRef.current!,
                    role: "assistant",
                    content: "",
                    timestamp: Date.now(),
                    isStreaming: true,
                    invocationId,
                  } as ChatMessage,
                ]);
              }
            } else if (
              chunk.type === "finish-step" ||
              chunk.type === "finish"
            ) {
              // Finalize the streaming message
              if (streamingMessageIdRef.current && accumulatedText.trim()) {
                const stepText = accumulatedText;
                const msgIdToFinalize = streamingMessageIdRef.current;

                // Check if the accumulated text is a structured response
                const structured = tryParseStructuredResponse(stepText);
                if (structured) {
                  console.log(
                    "[processAgentStream] Parsed structured response:",
                    structured,
                  );

                  // Update message with parsed content and mark as not streaming
                  // Handle case where message doesn't exist yet due to React batching
                  setMessagesForCurrentThread((prev) => {
                    const existingMsg = prev.find(
                      (m) => m.id === msgIdToFinalize,
                    );
                    if (!existingMsg) {
                      // Create the message if it doesn't exist
                      return [
                        ...prev,
                        {
                          id: msgIdToFinalize,
                          role: "assistant" as const,
                          content: structured.message,
                          timestamp: Date.now(),
                          isStreaming: false,
                          invocationId,
                        },
                      ];
                    }
                    return prev.map((m) =>
                      m.id === msgIdToFinalize
                        ? {
                            ...m,
                            content: structured.message,
                            isStreaming: false,
                          }
                        : m,
                    );
                  });

                  // Set structured response (quick replies and/or upload request)
                  if (structured.quickReplies?.length || structured.uploadRequest) {
                    setStructuredResponseForCurrentThread({
                      quickReplies: structured.quickReplies,
                      uploadRequest: structured.uploadRequest,
                    });
                  }

                  // Save thread title if generated
                  if (structured.threadTitle && currentThreadId) {
                    setThreadTitle(currentThreadId, structured.threadTitle);
                  }

                  // Reset rate limit if flagged
                  if (
                    structured.unlockNextUpload &&
                    resetRateLimitRef.current
                  ) {
                    resetRateLimitRef.current();
                  }

                  // Add awaiting message if specified
                  const awaitMsg = structured.awaitUserResponse?.message;
                  if (awaitMsg) {
                    setMessagesForCurrentThread((prev) => [
                      ...prev,
                      {
                        id: `awaiting-${Date.now()}`,
                        role: "assistant",
                        content: "",
                        timestamp: Date.now(),
                        isAwaitingResponse: true,
                        awaitingText: awaitMsg,
                        invocationId,
                      } as ChatMessage,
                    ]);
                  }
                } else {
                  // Regular text - just mark as not streaming
                  // Handle case where message doesn't exist yet due to React batching
                  setMessagesForCurrentThread((prev) => {
                    const existingMsg = prev.find(
                      (m) => m.id === msgIdToFinalize,
                    );
                    if (!existingMsg) {
                      // Create the message if it doesn't exist
                      return [
                        ...prev,
                        {
                          id: msgIdToFinalize,
                          role: "assistant" as const,
                          content: stepText,
                          timestamp: Date.now(),
                          isStreaming: false,
                          invocationId,
                        },
                      ];
                    }
                    return prev.map((m) =>
                      m.id === msgIdToFinalize
                        ? { ...m, isStreaming: false }
                        : m,
                    );
                  });
                }
              } else if (streamingMessageIdRef.current) {
                // Empty message - remove it
                setMessagesForCurrentThread((prev) =>
                  prev.filter((m) => m.id !== streamingMessageIdRef.current),
                );
              }
              streamingMessageIdRef.current = null;
              accumulatedText = "";
            } else if (chunk.type === "text-delta") {
              accumulatedText += chunk.delta || "";

              // Calculate display content - with smart JSON handling
              let displayContent = accumulatedText;

              // Check if this looks like structured JSON
              if (accumulatedText.trimStart().startsWith("{")) {
                // Try to extract message content incrementally
                const messageMatch = accumulatedText.match(
                  /"message"\s*:\s*"((?:[^"\\]|\\.)*)(")?/,
                );
                if (messageMatch) {
                  // Unescape the message content
                  displayContent = messageMatch[1]
                    .replace(/\\n/g, "\n")
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, "\\");
                } else {
                  // Still buffering JSON, don't show anything yet
                  displayContent = "";
                }
              }

              const contentToShow = displayContent;

              // Create or update streaming message in a single setMessages call
              if (!streamingMessageIdRef.current) {
                streamingMessageIdRef.current = `msg-${Date.now()}-assistant`;
                const newMsgId = streamingMessageIdRef.current;
                console.log(
                  "[processAgentStream] CREATING streaming message:",
                  newMsgId,
                  "content:",
                  contentToShow.slice(0, 50),
                );
                setMessagesForCurrentThread((prev) => {
                  console.log(
                    "[processAgentStream] setMessages callback - prev length:",
                    prev.length,
                  );
                  const newMessages = [
                    ...prev,
                    {
                      id: newMsgId,
                      role: "assistant" as const,
                      content: contentToShow,
                      timestamp: Date.now(),
                      isStreaming: true,
                      invocationId,
                    },
                  ];
                  console.log(
                    "[processAgentStream] setMessages callback - new length:",
                    newMessages.length,
                  );
                  return newMessages;
                });
              } else {
                // Update existing streaming message (or create if not found due to React batching)
                const msgIdToUpdate = streamingMessageIdRef.current;
                setMessagesForCurrentThread((prev) => {
                  const existingMsg = prev.find((m) => m.id === msgIdToUpdate);
                  if (!existingMsg) {
                    // Message doesn't exist yet (React batching) - create it
                    return [
                      ...prev,
                      {
                        id: msgIdToUpdate,
                        role: "assistant" as const,
                        content: contentToShow,
                        timestamp: Date.now(),
                        isStreaming: true,
                        invocationId,
                      },
                    ];
                  }
                  // Update existing message
                  return prev.map((m) =>
                    m.id === msgIdToUpdate
                      ? { ...m, content: contentToShow }
                      : m,
                  );
                });
              }
            } else if (chunk.type === "tool-input-start") {
              const { toolCallId, toolName } = chunk;
              if (
                toolName !== "sendStatusMessage" &&
                toolName !== "readDocument" &&
                toolName !== "navigateToDocument"
              ) {
                setMessagesForCurrentThread((prev) => {
                  if (prev.some((m) => m.toolCallId === toolCallId))
                    return prev;
                  return [
                    ...prev,
                    {
                      id: `msg-${Date.now()}-toolcall-${toolCallId}`,
                      role: "assistant",
                      content: "",
                      timestamp: Date.now(),
                      isToolCall: true,
                      toolCallId,
                      toolName,
                      toolCallStatus: "running",
                      invocationId,
                    } as ChatMessage,
                  ];
                });
              }
            } else if (chunk.type === "tool-input-available") {
              const { toolCallId, toolName, input } = chunk;
              if (toolName === "readDocument") {
                const doc = input?.documentId
                  ? allDocuments.find((d) => d.id === input.documentId)
                  : null;
                setMessagesForCurrentThread((prev) => {
                  if (prev.some((m) => m.toolCallId === toolCallId))
                    return prev;
                  return [
                    ...prev,
                    {
                      id: `msg-${Date.now()}-toolcall-${toolCallId}`,
                      role: "assistant",
                      content: "",
                      timestamp: Date.now(),
                      isToolCall: true,
                      toolCallId,
                      toolName,
                      toolCallStatus: "running",
                      toolDisplayDetail: doc?.name,
                      invocationId,
                    } as ChatMessage,
                  ];
                });
              } else if (toolName === "navigateToDocument") {
                const doc = input?.documentId
                  ? allDocuments.find((d) => d.id === input.documentId)
                  : null;
                setMessagesForCurrentThread((prev) => {
                  if (prev.some((m) => m.toolCallId === toolCallId))
                    return prev;
                  return [
                    ...prev,
                    {
                      id: `msg-${Date.now()}-toolcall-${toolCallId}`,
                      role: "assistant",
                      content: "",
                      timestamp: Date.now(),
                      isToolCall: true,
                      toolCallId,
                      toolName,
                      toolCallStatus: "running",
                      toolDisplayDetail: doc?.name,
                      invocationId,
                    } as ChatMessage,
                  ];
                });
              }
            } else if (chunk.type === "tool-output-available") {
              const toolCallId = chunk.toolCallId;
              const toolName = (chunk as any).toolName;
              const output = chunk.output;

              console.log("[processAgentStream] tool-output-available:", {
                toolCallId: toolCallId?.slice(-10),
                toolName,
                hasAction: !!output?._action,
              });

              let capabilityError: string | undefined;

              // Special handling for streaming flashcard generation
              if (output?._action === "streamFlashcardsFromSource") {
                const { documentIds, count, instructions } = output.params as {
                  documentIds: string[];
                  count: number;
                  instructions?: string;
                };

                let streamError: string | null = null;
                let cardsGenerated = 0;
                const newCardIds: string[] = [];
                let aiTaskId: string | null = null;

                // Stream flashcards and WAIT for completion (with 30s timeout)
                const streamWithTimeout = async () => {
                  const currentCollectionContext = collectionContextRef.current;
                  if (!currentCollectionContext) {
                    throw new Error("No collection context available");
                  }

                  // Resolve source document name for progress indicator
                  const sourceDoc = documentIds[0]
                    ? currentCollectionContext.documents.find(
                        (d) => d.id === documentIds[0],
                      )
                    : null;
                  const sourceDocName = sourceDoc?.name || "source materials";

                  // Signal generation start with progress indicator
                  console.log("[MOChat] Calling startFlashcardGeneration:", {
                    totalCards: count,
                    sourceDocName,
                  });
                  await executeCapability(
                    "startFlashcardGeneration" as PageCapability,
                    {
                      totalCards: count,
                      sourceDocName,
                    },
                  );

                  // Start AI task for global loading indicator
                  if (aiTask) {
                    aiTaskId = aiTask.startTask({
                      label: "Generating flashcards",
                      totalSteps: count,
                      undoCallback: async () => {
                        // Delete newly created cards on undo
                        for (const cardId of newCardIds) {
                          try {
                            await executeCapability(
                              "deleteFlashcards" as PageCapability,
                              { cardIds: [cardId] },
                            );
                          } catch (e) {
                            console.error(
                              "[flashcard-undo] Failed to delete card:",
                              cardId,
                              e,
                            );
                          }
                        }
                      },
                    });
                  }

                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 30000);

                  try {
                    const response = await fetch(
                      "/api/open/generate-flashcards-stream",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          documentIds,
                          count,
                          instructions,
                          collectionContext: currentCollectionContext,
                        }),
                        signal: controller.signal,
                      },
                    );

                    if (!response.ok) {
                      const errorBody = await response.text();
                      let errorMessage = "Failed to start flashcard stream";
                      try {
                        const errorJson = JSON.parse(errorBody);
                        errorMessage = errorJson.error || errorMessage;
                      } catch {}
                      throw new Error(errorMessage);
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                      throw new Error("No response body");
                    }

                    const decoder = new TextDecoder();
                    let buffer = "";

                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;

                      buffer += decoder.decode(value, { stream: true });
                      const lines = buffer.split("\n");
                      buffer = lines.pop() || "";

                      for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr) continue;

                        try {
                          const data = JSON.parse(jsonStr);

                          if (data.type === "card" && data.card) {
                            cardsGenerated++;
                            // Track card ID for undo
                            if (data.card.id) {
                              newCardIds.push(data.card.id);
                            }
                            // Add each card with animation via streaming capability
                            await executeCapability(
                              "addStreamedFlashcard" as PageCapability,
                              {
                                card: data.card,
                                cardNumber: cardsGenerated,
                                totalCards: count,
                              },
                            );
                            // Update AI task progress
                            if (aiTask && aiTaskId) {
                              aiTask.updateProgress(
                                aiTaskId,
                                cardsGenerated,
                                count,
                              );
                            }
                          } else if (data.type === "error") {
                            console.error(
                              "[flashcard-stream] Error from server:",
                              data.error,
                            );
                            streamError =
                              data.error || "Flashcard generation failed";
                            // Stop processing on error
                            throw new Error(streamError);
                          }
                        } catch (parseError) {
                          // If it's our thrown error, re-throw it
                          if (
                            parseError instanceof Error &&
                            parseError.message === streamError
                          ) {
                            throw parseError;
                          }
                          // Otherwise skip malformed JSON
                        }
                      }
                    }
                  } finally {
                    clearTimeout(timeoutId);
                    // Signal generation complete
                    await executeCapability(
                      "endFlashcardGeneration" as PageCapability,
                      {},
                    );
                  }
                };

                try {
                  await streamWithTimeout();

                  // If we got an error during streaming, treat it as a failure
                  if (streamError) {
                    throw new Error(streamError);
                  }

                  // Complete AI task
                  if (aiTask && aiTaskId) {
                    aiTask.completeTask(aiTaskId);
                  }

                  // Mark checklist step: create-flashcards
                  window.dispatchEvent(
                    new CustomEvent("medly:checklist-step", {
                      detail: { stepId: "create-flashcards" },
                    }),
                  );

                  // Mark tool as completed after all cards generated
                  if (toolCallId) {
                    setMessagesForCurrentThread((prev) =>
                      prev.map((m) =>
                        m.toolCallId === toolCallId
                          ? {
                              ...m,
                              toolCallStatus: "completed" as const,
                            }
                          : m,
                      ),
                    );
                  }
                } catch (error) {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "Unknown error during flashcard generation";
                  console.error(
                    "[flashcard-stream] Stream error:",
                    errorMessage,
                  );
                  // Ensure generation indicator is hidden on error
                  await executeCapability(
                    "endFlashcardGeneration" as PageCapability,
                    {},
                  );

                  // Fail AI task
                  if (aiTask && aiTaskId) {
                    aiTask.failTask(aiTaskId, errorMessage);
                  }

                  // Update tool status to show error (just the X icon, no details)
                  if (toolCallId) {
                    setMessagesForCurrentThread((prev) =>
                      prev.map((m) =>
                        m.toolCallId === toolCallId
                          ? {
                              ...m,
                              toolCallStatus: "error" as const,
                            }
                          : m,
                      ),
                    );
                  }
                }
              } else if (output?._action === "streamQuestionsFromSource") {
                // Special handling for streaming question generation
                const { documentIds, count, instructions } = output.params as {
                  documentIds: string[];
                  count: number;
                  instructions?: string;
                };

                let streamError: string | null = null;
                let questionsGenerated = 0;
                let aiTaskId: string | null = null;

                // Stream questions and WAIT for completion (with 60s timeout - questions take longer)
                const streamWithTimeout = async () => {
                  const currentCollectionContext = collectionContextRef.current;
                  if (!currentCollectionContext) {
                    throw new Error("No collection context available");
                  }

                  // Start AI task for global loading indicator
                  if (aiTask) {
                    aiTaskId = aiTask.startTask({
                      label: "Generating questions",
                      totalSteps: count,
                      // No undo for questions currently
                    });
                  }

                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 60000);

                  try {
                    const response = await fetch(
                      "/api/open/generate-questions-stream",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          documentIds,
                          count,
                          instructions,
                          collectionContext: currentCollectionContext,
                        }),
                        signal: controller.signal,
                      },
                    );

                    if (!response.ok) {
                      const errorBody = await response.text();
                      let errorMessage = "Failed to start question stream";
                      try {
                        const errorJson = JSON.parse(errorBody);
                        errorMessage = errorJson.error || errorMessage;
                      } catch {}
                      throw new Error(errorMessage);
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                      throw new Error("No response body");
                    }

                    const decoder = new TextDecoder();
                    let buffer = "";

                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;

                      buffer += decoder.decode(value, { stream: true });
                      const lines = buffer.split("\n");
                      buffer = lines.pop() || "";

                      for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr) continue;

                        try {
                          const data = JSON.parse(jsonStr);

                          if (
                            data.type === "questionGroup" &&
                            data.questionGroup
                          ) {
                            // Add each question group as it arrives
                            await executeCapability(
                              "createQuestions" as PageCapability,
                              {
                                questionGroups: [data.questionGroup],
                              },
                            );
                            questionsGenerated++;
                            // Update AI task progress
                            if (aiTask && aiTaskId) {
                              aiTask.updateProgress(
                                aiTaskId,
                                questionsGenerated,
                                count,
                              );
                            }
                          } else if (data.type === "error") {
                            console.error(
                              "[question-stream] Error from server:",
                              data.error,
                            );
                            streamError =
                              data.error || "Question generation failed";
                            // Stop processing on error
                            throw new Error(streamError);
                          }
                        } catch (parseError) {
                          // If it's our thrown error, re-throw it
                          if (
                            parseError instanceof Error &&
                            parseError.message === streamError
                          ) {
                            throw parseError;
                          }
                          // Otherwise skip malformed JSON
                        }
                      }
                    }
                  } finally {
                    clearTimeout(timeoutId);
                  }
                };

                try {
                  await streamWithTimeout();

                  // If we got an error during streaming, treat it as a failure
                  if (streamError) {
                    throw new Error(streamError);
                  }

                  // Complete AI task
                  if (aiTask && aiTaskId) {
                    aiTask.completeTask(aiTaskId);
                  }

                  // Mark tool as completed after all questions generated
                  if (toolCallId) {
                    setMessagesForCurrentThread((prev) =>
                      prev.map((m) =>
                        m.toolCallId === toolCallId
                          ? {
                              ...m,
                              toolCallStatus: "completed" as const,
                            }
                          : m,
                      ),
                    );
                  }
                } catch (error) {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "Unknown error during question generation";
                  console.error(
                    "[question-stream] Stream error:",
                    errorMessage,
                  );

                  // Fail AI task
                  if (aiTask && aiTaskId) {
                    aiTask.failTask(aiTaskId, errorMessage);
                  }

                  // Update tool status to show error (just the X icon, no details)
                  if (toolCallId) {
                    setMessagesForCurrentThread((prev) =>
                      prev.map((m) =>
                        m.toolCallId === toolCallId
                          ? {
                              ...m,
                              toolCallStatus: "error" as const,
                            }
                          : m,
                      ),
                    );
                  }
                }
              } else if (output?._action) {
                const result = await executeCapability(
                  output._action as PageCapability,
                  output.params,
                );
                if (!result.success && result.error) {
                  capabilityError = result.error;
                }

                if (toolCallId) {
                  setMessagesForCurrentThread((prev) =>
                    prev.map((m) =>
                      m.toolCallId === toolCallId
                        ? {
                            ...m,
                            toolCallStatus: capabilityError
                              ? ("error" as const)
                              : ("completed" as const),
                          }
                        : m,
                    ),
                  );
                }
              } else if (toolCallId) {
                // Tools without _action (like readDocument, navigateToDocument, sendStatusMessage)
                // Mark them as completed when their output arrives
                console.log(
                  "[processAgentStream] Marking tool as completed (no _action):",
                  { toolCallId: toolCallId?.slice(-10), toolName },
                );
                setMessagesForCurrentThread((prev) =>
                  prev.map((m) =>
                    m.toolCallId === toolCallId
                      ? { ...m, toolCallStatus: "completed" as const }
                      : m,
                  ),
                );
              }

              if (capabilityError) {
                setMessagesForCurrentThread((prev) => [
                  ...prev,
                  {
                    id: `msg-${Date.now()}-error`,
                    role: "assistant",
                    content: `⚠️ Edit failed: ${capabilityError}`,
                    timestamp: Date.now(),
                    isStatusMessage: true,
                    invocationId,
                  } as ChatMessage,
                ]);
              }

              if (output?._statusMessage) {
                const statusContent = output._statusMessage;
                setMessagesForCurrentThread((prev) => {
                  if (
                    prev.some(
                      (m) => m.isStatusMessage && m.content === statusContent,
                    )
                  ) {
                    return prev;
                  }
                  return [
                    ...prev,
                    {
                      id: `msg-${Date.now()}-status`,
                      role: "assistant",
                      content: statusContent,
                      timestamp: Date.now(),
                      isStatusMessage: true,
                      invocationId,
                    } as ChatMessage,
                  ];
                });
              }
            } else if (
              chunk.type === "object" ||
              chunk.type === "finish-object"
            ) {
              // Handle structured final output from Output.object()
              // The message can be in chunk.object, chunk.data, or directly on chunk
              const obj =
                chunk.object || chunk.data || (chunk.message ? chunk : null);
              if (obj) {
                // Display message as assistant response
                if (obj.message) {
                  const msgContent = obj.message;
                  setMessagesForCurrentThread((prev) => {
                    if (
                      prev.some(
                        (m) =>
                          m.role === "assistant" &&
                          !m.isStatusMessage &&
                          !m.isToolCall &&
                          m.content === msgContent,
                      )
                    ) {
                      return prev;
                    }
                    return [
                      ...prev,
                      {
                        id: `msg-${Date.now()}-assistant`,
                        role: "assistant",
                        content: msgContent,
                        timestamp: Date.now(),
                        invocationId,
                      } as ChatMessage,
                    ];
                  });
                }

                // Set structured response (quick replies and/or upload request)
                if (obj.quickReplies?.length || obj.uploadRequest) {
                  setStructuredResponseForCurrentThread({
                    quickReplies: obj.quickReplies,
                    uploadRequest: obj.uploadRequest,
                  });
                }

                // Save thread title if generated
                if (obj.threadTitle && currentThreadId) {
                  setThreadTitle(currentThreadId, obj.threadTitle);
                }

                // Reset rate limit for next upload
                if (obj.unlockNextUpload && resetRateLimitRef.current) {
                  resetRateLimitRef.current();
                }

                // Add awaiting message if specified
                if (obj.awaitUserResponse?.message) {
                  setMessagesForCurrentThread((prev) => [
                    ...prev,
                    {
                      id: `awaiting-${Date.now()}`,
                      role: "assistant",
                      content: "",
                      timestamp: Date.now(),
                      isAwaitingResponse: true,
                      awaitingText: obj.awaitUserResponse.message,
                      invocationId,
                    } as ChatMessage,
                  ]);
                }
              }
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      // Finalize any remaining streaming message
      if (streamingMessageIdRef.current && accumulatedText.trim()) {
        const finalText = accumulatedText;
        const finalMsgId = streamingMessageIdRef.current;

        // Check if the remaining text is a structured response
        const structured = tryParseStructuredResponse(finalText);
        if (structured) {
          console.log(
            "[processAgentStream] Final structured response:",
            structured,
          );

          // Handle case where message doesn't exist yet due to React batching
          setMessagesForCurrentThread((prev) => {
            const existingMsg = prev.find((m) => m.id === finalMsgId);
            if (!existingMsg) {
              return [
                ...prev,
                {
                  id: finalMsgId,
                  role: "assistant" as const,
                  content: structured.message,
                  timestamp: Date.now(),
                  isStreaming: false,
                  invocationId,
                },
              ];
            }
            return prev.map((m) =>
              m.id === finalMsgId
                ? { ...m, content: structured.message, isStreaming: false }
                : m,
            );
          });

          // Set structured response (quick replies and/or upload request)
          if (structured.quickReplies?.length || structured.uploadRequest) {
            setStructuredResponseForCurrentThread({
              quickReplies: structured.quickReplies,
              uploadRequest: structured.uploadRequest,
            });
          }

          // Save thread title if generated
          if (structured.threadTitle && currentThreadId) {
            setThreadTitle(currentThreadId, structured.threadTitle);
          }

          if (structured.unlockNextUpload && resetRateLimitRef.current) {
            resetRateLimitRef.current();
          }

          // Add awaiting message if specified
          const awaitMsg = structured.awaitUserResponse?.message;
          if (awaitMsg) {
            setMessagesForCurrentThread((prev) => [
              ...prev,
              {
                id: `awaiting-${Date.now()}`,
                role: "assistant",
                content: "",
                timestamp: Date.now(),
                isAwaitingResponse: true,
                awaitingText: awaitMsg,
              } as ChatMessage,
            ]);
          }
        } else {
          // Regular text - just mark as not streaming
          // Handle case where message doesn't exist yet due to React batching
          setMessagesForCurrentThread((prev) => {
            const existingMsg = prev.find((m) => m.id === finalMsgId);
            if (!existingMsg) {
              return [
                ...prev,
                {
                  id: finalMsgId,
                  role: "assistant" as const,
                  content: finalText,
                  timestamp: Date.now(),
                  isStreaming: false,
                  invocationId,
                },
              ];
            }
            return prev.map((m) =>
              m.id === finalMsgId ? { ...m, isStreaming: false } : m,
            );
          });
        }
        streamingMessageIdRef.current = null;
      } else if (streamingMessageIdRef.current) {
        // Empty message - remove it
        setMessagesForCurrentThread((prev) =>
          prev.filter((m) => m.id !== streamingMessageIdRef.current),
        );
        streamingMessageIdRef.current = null;
      }
    },
    [
      executeCapability,
      allDocuments,
      tryParseStructuredResponse,
      setMessagesForCurrentThread,
      setStructuredResponseForCurrentThread,
      currentThreadId,
      setThreadTitle,
    ],
  );

  // ----------------------------------------
  // Unified invoke function (internal - bypasses rate limiting)
  // ----------------------------------------
  const invokeInternal = useCallback(
    async (intent: ChatIntent) => {
      setError(null);
      setIsLoading(true);

      // Clear any awaiting messages when a new intent arrives
      setMessagesForCurrentThread((prev) =>
        prev.filter((m) => !m.isAwaitingResponse),
      );

      // Generate invocationId for this API call - all messages from this stream share the same ID
      const invocationId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log("[chat] Generated invocationId:", invocationId);

      try {
        const context = await collectPageContext();

        // Build collection context
        let collectionContext: CollectionContext | undefined;
        if (selectedCollection) {
          const collection = collections.find(
            (c) => c.id === selectedCollection,
          );
          const { folders } = getCollectionContent(selectedCollection);
          const currentDocumentId = context.documentId as string | undefined;
          collectionContext = {
            collection: collection || null,
            folders,
            documents: allDocuments.filter(
              (d) => d.collectionId === selectedCollection,
            ),
            currentDocumentId: currentDocumentId || null,
          };
        }

        // Store in ref for streaming handlers to access
        collectionContextRef.current = collectionContext;

        // Build messages array - for userMessage intent, append the current message
        // (state update from setMessages hasn't processed yet due to React batching)
        const historyMessages = messages
          .filter((m) => m && m.content)
          .map((m) => ({ role: m.role, content: m.content }));
        const allMessages =
          intent.type === "userMessage"
            ? [
                ...historyMessages,
                { role: "user" as const, content: intent.content },
              ]
            : historyMessages;

        // Ensure we have a thread ID before sending (required by API)
        if (!currentThreadId) {
          console.error(
            "[chat] No thread ID for collection:",
            selectedCollection,
          );
          setError("Chat thread not initialized");
          return;
        }

        // Build request body based on intent type
        const requestBody: Record<string, unknown> = {
          intent,
          messages: allMessages,
          context,
          collectionContext,
          threadId: currentThreadId,
          selectedText: null,
          selectedScreenshot: null,
        };

        // Add attachments for userMessage
        if (intent.type === "userMessage" && intent.attachments) {
          requestBody.selectedText = intent.attachments.selectedText || null;
          requestBody.selectedScreenshot =
            intent.attachments.screenshot || null;
          const attachedDocumentIds =
            intent.attachments.draggedContexts?.flatMap(
              (item) => item.documentIds,
            ) || [];
          requestBody.attachedDocumentIds = attachedDocumentIds;
        }

        console.log("[chat] Sending intent:", intent.type);

        const response = await fetch("/api/open/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        await processAgentStream(response, invocationId);
        track("chat_message_received");
      } catch (err) {
        console.error("[MOChatLayoutClient] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [
      collectPageContext,
      messages,
      processAgentStream,
      selectedCollection,
      collections,
      getCollectionContent,
      allDocuments,
      track,
      currentThreadId,
      setMessagesForCurrentThread,
    ],
  );

  // ----------------------------------------
  // Public API: sendMessage (user-initiated chat)
  // ----------------------------------------
  const sendMessage = useCallback(
    async (content: string, attachments?: ChatAttachments) => {
      if (!content.trim() || isLoading) return;

      // Add user message to thread
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content,
        timestamp: Date.now(),
        attachments: attachments
          ? {
              selectedText: attachments.selectedText,
              screenshot: attachments.screenshot,
              draggedContexts: attachments.draggedContexts,
            }
          : undefined,
      };
      // Clear awaiting messages and add user message
      setMessagesForCurrentThread((prev) => [
        ...prev.filter((m) => !m.isAwaitingResponse),
        userMessage,
      ]);

      // Set temporary title from first message if thread has no title yet
      // This ensures the thread is never in a "has messages but no title" state
      // The AI will overwrite with a better summary when it responds
      if (!threadTitle && currentThreadId) {
        const tempTitle =
          content.slice(0, 50).trim() + (content.length > 50 ? "..." : "");
        setThreadTitle(currentThreadId, tempTitle);
      }

      // Clear attachments and structured response after capturing
      setSelectedText(null);
      setSelectedScreenshot(null);
      setDraggedContexts([]);
      setStructuredResponseForCurrentThread(null);

      // Track first screenshot for snackbar dismissal
      if (attachments?.screenshot || attachments?.draggedContexts?.length) {
        try {
          const LOCALSTORAGE_KEY_FIRST_SCREENSHOT =
            "open_first_screenshot_sent";
          if (
            localStorage.getItem(LOCALSTORAGE_KEY_FIRST_SCREENSHOT) !== "true"
          ) {
            localStorage.setItem(LOCALSTORAGE_KEY_FIRST_SCREENSHOT, "true");
            // Dispatch event so snackbar can dismiss
            window.dispatchEvent(new Event("first-screenshot-sent"));
          }
        } catch {
          // localStorage not available
        }
      }

      track("chat_message_sent", {
        has_attachment:
          !!attachments?.selectedText ||
          !!attachments?.screenshot ||
          !!attachments?.draggedContexts?.length,
      });

      await invokeInternal({ type: "userMessage", content, attachments });
    },
    [
      isLoading,
      invokeInternal,
      track,
      setMessagesForCurrentThread,
      setStructuredResponseForCurrentThread,
      threadTitle,
      currentThreadId,
      setThreadTitle,
    ],
  );

  // ----------------------------------------
  // Public API: sendSystemEvent (system-initiated events)
  // Goes through rate limiting gate for fileUploaded
  // ----------------------------------------
  const sendSystemEvent = useCallback(
    async <T extends Exclude<ChatIntent["type"], "userMessage">>(
      type: T,
      context: Extract<ChatIntent, { type: T }> extends { context: infer C }
        ? C
        : never,
    ) => {
      if (isLoading) return;

      // Auto-open chat for system events
      openChat();

      // fileUploaded goes through rate limiting gate
      if (type === "fileUploaded") {
        // This is handled via sendTriggerEvent → processTrigger
        // Don't call directly here, use sendTriggerEvent instead
        return;
      }

      await invokeInternal({ type, context } as ChatIntent);
    },
    [isLoading, openChat, invokeInternal],
  );

  // ----------------------------------------
  // Trigger processor (rate limit + debounce for fileUploaded)
  // Uses TriggerEvent internally, converts to ChatIntent in callback
  // ----------------------------------------
  const { processTrigger, resetRateLimit } = useTriggerProcessor({
    rateLimitMs: 30000,
    debounceMs: 2000,
    enabled: true,
    onTriggerReady: async (triggers) => {
      // Build setup context
      const currentCollection = collections.find(
        (c) => c.id === selectedCollection,
      );
      const setupContext = {
        isFirstEverUpload: allDocuments.length === 0,
        isSetupModeActive: !currentCollection?.setupComplete,
        flowType: currentCollection?.initialFlowType,
        collectionId: selectedCollection || "",
      };

      // Convert TriggerEvents to batched ChatIntent
      const batchedContext: FileUploadedContext = {
        uploadedDocuments: triggers.map((t) => ({
          documentId: t.payload.documentId,
          documentName: t.payload.documentName,
          extractedTextPreview: (t.payload.extractedText || "").slice(0, 500),
        })),
        setupContext,
      };

      // Open chat before invoking
      openChat();
      await invokeInternal({ type: "fileUploaded", context: batchedContext });
    },
  });

  // Keep ref in sync for use in processAgentStream
  resetRateLimitRef.current = resetRateLimit;

  // Delegate to hook's startNewChat implementation
  const startNewChat = hookStartNewChat;

  // ----------------------------------------
  // Expose sendTriggerEvent for MOSidebar to call (rate limited via processTrigger)
  // ----------------------------------------
  const sendTriggerEvent = useCallback(
    (payload: UploadTriggerPayload) => {
      processTrigger({
        type: "fileUploaded",
        payload,
        timestamp: Date.now(),
      });
    },
    [processTrigger],
  );

  // ----------------------------------------
  // Context value
  // ----------------------------------------
  const contextValue = useMemo<ChatContextValue>(
    () => ({
      // Chat state
      messages,
      isLoading,
      error,
      userInput,
      setUserInput,

      // Thread list and current thread
      threads,
      currentThreadId,

      // Thread creation state
      isCreatingThread,
      createThreadError,
      retryCreateThread,

      // Thread titles
      threadTitles,
      setThreadTitle,

      // PDF URL for citation preview
      pdfUrl,
      setPdfUrl,

      // PDF navigation for citation clicks
      targetPdfDocumentId,
      setTargetPdfDocumentId,
      targetPdfPage,
      setTargetPdfPage,
      targetHighlightText,
      setTargetHighlightText,

      // Selected text
      selectedText,
      updateSelectedText,

      // Selected screenshot
      selectedScreenshot,
      updateSelectedScreenshot,

      // Skills
      currentSkill,
      updateCurrentSkill,
      currentSkillPrompt,
      updateCurrentSkillPrompt,

      // Dragged context
      draggedContexts,
      addDraggedContext,
      removeDraggedContext,

      // Chat actions
      sendMessage,
      sendSystemEvent,
      startNewChat,
      switchToThread,

      // Chat visibility
      isChatOpen,
      openChat,
      closeChat,
      toggleChat,

      // Page context
      currentPageType,
      setCurrentPageType,
      collectPageContext,

      // Capability registry
      registerCapability,
      executeCapability,
      hasCapability,
      getAvailableCapabilities,

      // Context collectors
      registerContextCollector,

      // Trigger events
      sendTriggerEvent,

      // Structured response
      structuredResponse,
      clearStructuredResponse,

      // Socket
      socket,
      socketError,

      // Header state
      headerData,
      setHeaderData,
      updateHeaderData,
    }),
    [
      messages,
      isLoading,
      error,
      userInput,
      threads,
      currentThreadId,
      isCreatingThread,
      createThreadError,
      retryCreateThread,
      threadTitles,
      setThreadTitle,
      pdfUrl,
      targetPdfDocumentId,
      targetPdfPage,
      targetHighlightText,
      selectedText,
      updateSelectedText,
      selectedScreenshot,
      updateSelectedScreenshot,
      currentSkill,
      updateCurrentSkill,
      currentSkillPrompt,
      updateCurrentSkillPrompt,
      draggedContexts,
      addDraggedContext,
      removeDraggedContext,
      sendMessage,
      sendSystemEvent,
      startNewChat,
      switchToThread,
      isChatOpen,
      openChat,
      closeChat,
      toggleChat,
      currentPageType,
      collectPageContext,
      registerCapability,
      executeCapability,
      hasCapability,
      getAvailableCapabilities,
      registerContextCollector,
      sendTriggerEvent,
      structuredResponse,
      clearStructuredResponse,
      socket,
      socketError,
      headerData,
      setHeaderData,
      updateHeaderData,
    ],
  );

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <ChatContext.Provider value={contextValue}>
      <OpenLayoutSwitch>{children}</OpenLayoutSwitch>
    </ChatContext.Provider>
  );
}
