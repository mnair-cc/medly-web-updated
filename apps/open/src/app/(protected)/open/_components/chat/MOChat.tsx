"use client";

import { useTracking } from "@/app/_lib/posthog/useTracking";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import { Message } from "@/app/types/types";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getSupportedFormatsMessage,
  isSupportedFormat,
  MAX_FILE_SIZE,
} from "../../_utils/convertDocument";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import InputBar from "./MOChatInputBar";
import {
  useAiChat,
  type ChatMessage,
  type PageType,
} from "./MOChatLayoutClient";
import ChatThread from "./MOChatThread";

// ============================================
// SUGGESTIONS BY PAGE TYPE
// ============================================

const SUGGESTIONS_BY_PAGE: Record<PageType, string[]> = {
  document: [
    "Explain this slide",
    "Create flashcards",
    "What does this diagram show?",
  ],
  flashcards: ["Create flashcards", "Edit my flashcards"],
  notes: [
    "Help me plan my essay",
    "Help me brainstorm ideas",
    "Summarise my lectures",
  ],
  questions: [
    "Create questions",
    "Help me answer this question",
    "Explain this answer",
  ],
};

// ============================================
// MAIN COMPONENT
// ============================================

// Helper to convert context messages to chat UI format
function convertToDisplayMessages(chatMessages: ChatMessage[]): Message[] {
  return chatMessages
    .filter((m) => m != null)
    .map((m) => ({
      id: m.id,
      message: m.content ?? "",
      type: m.role === "user" ? "userMessage" : "apiMessage",
      attachments: m.attachments
        ? {
            selectedText: m.attachments.selectedText,
            screenshot: m.attachments.screenshot,
            draggedContexts: m.attachments.draggedContexts,
          }
        : undefined,
      isStatusMessage: m.isStatusMessage,
      isStreaming: m.isStreaming,
      invocationId: m.invocationId,
      // Tool call message fields
      isToolCall: m.isToolCall,
      toolCallId: m.toolCallId,
      toolName: m.toolName,
      toolCallStatus: m.toolCallStatus,
      toolDisplayDetail: m.toolDisplayDetail,
    }));
}

export default function MOChat() {
  // Get everything from context
  const {
    messages: chatMessages,
    sendMessage,
    isLoading,
    error,
    userInput,
    setUserInput,
    pdfUrl,
    executeCapability,
    setTargetPdfDocumentId,
    setTargetPdfPage,
    setTargetHighlightText,
    selectedText,
    updateSelectedText,
    selectedScreenshot,
    updateSelectedScreenshot,
    currentSkill,
    updateCurrentSkill,
    updateCurrentSkillPrompt,
    draggedContexts,
    removeDraggedContext,
    currentPageType,
    structuredResponse,
    clearStructuredResponse,
    sendTriggerEvent,
    startNewChat,
    switchToThread,
    currentThreadId,
    threads,
    threadTitles,
    isCreatingThread,
    createThreadError,
    retryCreateThread,
  } = useAiChat();

  // Get suggestions based on current page type
  const suggestions = useMemo(
    () => SUGGESTIONS_BY_PAGE[currentPageType] ?? [],
    [currentPageType],
  );

  const {
    documents: sidebarDocuments,
    collections,
    selectedCollection,
    uploadDocument,
    setDocumentLoading,
  } = useSidebar();
  const { track } = useTracking();
  const [isUploading, setIsUploading] = useState(false);

  // Ref for upload request file input
  const uploadRequestInputRef = useRef<HTMLInputElement>(null);

  // Show all threads - only the newest thread can be empty (no title)
  // because we reuse empty threads instead of creating new ones
  const visibleThreads = threads;

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Get current thread title
  const currentThreadTitle = currentThreadId
    ? (threadTitles[currentThreadId] ?? null)
    : null;

  // Handle thread selection from dropdown
  const handleThreadSelect = useCallback(
    (threadId: string) => {
      switchToThread(threadId);
      setIsDropdownOpen(false);
    },
    [switchToThread],
  );

  // Format timestamp for display
  const formatThreadDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    if (isYesterday) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }, []);

  // Get the primary color from the selected collection
  const primaryColor = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollection);
    return collection?.primaryColor;
  }, [collections, selectedCollection]);

  // Derive user message color from selected collection's primaryColor
  const userMessageColor = useMemo(() => {
    if (!primaryColor) return "#F9F9FB";
    return applyWhiteOverlay(primaryColor, 0.9); // 90% white = 10% of primary
  }, [primaryColor]);

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Track if user is at bottom of scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const threshold = 50; // px from bottom to consider "at bottom"
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= threshold;
  }, []);

  // Convert context messages to display format
  const messages = useMemo(() => {
    console.log(
      "[MOChat] chatMessages from context:",
      chatMessages.length,
      chatMessages.map((m) => ({
        id: m.id,
        role: m.role,
        isStreaming: m.isStreaming,
        contentLen: m.content?.length,
      })),
    );
    // Debug: check for undefined messages
    const undefinedMsgs = chatMessages.filter(
      (m) => m == null || m.content == null,
    );
    if (undefinedMsgs.length > 0) {
      console.error("[MOChat] Found undefined/null messages:", undefinedMsgs);
    }
    const converted = convertToDisplayMessages(chatMessages);
    console.log(
      "[MOChat] converted messages:",
      converted.length,
      converted.map((m) => ({
        id: m.id,
        type: m.type,
        isStreaming: m.isStreaming,
        msgLen: m.message?.length,
      })),
    );
    const toolCallMsgs = converted.filter((m) => m.isToolCall);
    if (toolCallMsgs.length > 0) {
      console.log(
        "[MOChat] Converting messages, tool calls:",
        toolCallMsgs.map((m) => ({
          id: m.toolCallId,
          status: m.toolCallStatus,
        })),
      );
    }
    return converted;
  }, [chatMessages]);

  // Auto-scroll to bottom when messages change (only if user is at bottom)
  useEffect(() => {
    if (!isAtBottomRef.current) return;

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      }
    });
  }, [chatMessages, isLoading]);

  const handleSend = useCallback(
    (message: string) => {
      // Force scroll to bottom when user sends a message
      isAtBottomRef.current = true;
      sendMessage(message, {
        selectedText: selectedText || undefined,
        screenshot: selectedScreenshot || undefined,
        draggedContexts:
          draggedContexts.length > 0 ? draggedContexts : undefined,
      });
      // Delay scroll to ensure DOM has updated with new message
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    },
    [sendMessage, selectedText, selectedScreenshot, draggedContexts],
  );

  const navigateToDocument = useCallback(
    async (documentId: string) => {
      await executeCapability("navigateToDocument", { documentId });
    },
    [executeCapability],
  );

  const getPdfUrlForDocumentId = useCallback(
    (documentId: string): string | undefined => {
      const doc = sidebarDocuments?.find((d) => d.id === documentId);
      if (!doc?.storageUrl) return undefined;
      // Match OpenDocumentPage behavior: proxy PDFs to avoid CORS issues in the browser.
      return `/api/open/pdf-proxy?url=${encodeURIComponent(doc.storageUrl)}`;
    },
    [sidebarDocuments],
  );

  const handleQuickReplyClick = useCallback(
    (label: string) => {
      clearStructuredResponse();
      handleSend(label);
    },
    [clearStructuredResponse, handleSend],
  );

  // Handler for upload request button click - triggers file picker
  const handleUploadRequest = useCallback(() => {
    uploadRequestInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      if (!isSupportedFormat(file.name)) {
        toast.error(getSupportedFormatsMessage());
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 50MB.");
        return;
      }

      // Check if collection is selected
      if (!selectedCollection) {
        toast.error("Please select a module first");
        return;
      }

      setIsUploading(true);
      try {
        const doc = await uploadDocument(file, selectedCollection);
        if (doc?.id) {
          setDocumentLoading(doc.id, false);
          track("document_uploaded", {
            file_size_mb: Math.round((file.size / (1024 * 1024)) * 100) / 100,
            success: true,
            source: "desktop_chat",
          });
          // Clear structured response (upload request button) after successful upload
          clearStructuredResponse();
          // Determine file type from extension
          const ext = file.name.split(".").pop()?.toLowerCase();
          const fileType: "pdf" | "docx" | "txt" =
            ext === "docx" ? "docx" : ext === "txt" ? "txt" : "pdf";
          // Notify AI about the upload (triggers chat response)
          sendTriggerEvent({
            documentId: doc.id,
            documentName: doc.name || file.name,
            extractedText: doc.allPagesText || "",
            fileType,
            collectionId: doc.collectionId,
            folderId: doc.folderId ?? null,
          });
          // Navigate to the uploaded document
          await navigateToDocument(doc.id);
        }
      } catch (err) {
        console.error("Upload failed:", err);
        toast.error("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [
      uploadDocument,
      selectedCollection,
      setDocumentLoading,
      track,
      navigateToDocument,
      clearStructuredResponse,
      sendTriggerEvent,
    ],
  );

  return (
    <div
      className="text-sm relative flex flex-col h-full bg-white"
      data-chat-drop-zone
    >
      {/* Hidden file input for upload request */}
      <input
        ref={uploadRequestInputRef}
        type="file"
        accept="application/*,text/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Header with thread dropdown and new chat button */}
      <div className="flex items-center px-4 py-2 border-b border-[#F2F2F7]">
        {/* Thread dropdown */}
        <div className="relative flex-1 min-w-0 mr-2" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={visibleThreads.length <= 1}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:cursor-default max-w-full"
          >
            <span className="truncate">{currentThreadTitle || "New Chat"}</span>
            {visibleThreads.length > 1 && (
              <ChevronDown
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && visibleThreads.length > 1 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
              {visibleThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleThreadSelect(thread.id)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between gap-2 ${
                    thread.id === currentThreadId ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {thread.title || "New Chat"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatThreadDate(thread.createdAt)}
                    </div>
                  </div>
                  {thread.id === currentThreadId && (
                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New chat button */}
        <button
          onClick={startNewChat}
          disabled={chatMessages.length === 0 || isCreatingThread || isLoading}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="New chat"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Thread creation error display */}
      {createThreadError && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">
              Unable to start chat. Please check your connection.
            </p>
            <button
              onClick={retryCreateThread}
              className="text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !createThreadError && (
        <div className="px-4 py-2 bg-red-100 text-red-700 text-xs">{error}</div>
      )}

      {/* Chat thread */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        <ChatThread
          key={`${selectedCollection}-${currentThreadId}`}
          messages={messages}
          options={[]}
          isAwaitingResponse={isLoading}
          voiceEnabled={false}
          pdfUrl={pdfUrl ?? undefined}
          onNavigateToDocument={navigateToDocument}
          getPdfUrlForDocumentId={getPdfUrlForDocumentId}
          setTargetPdfDocumentId={setTargetPdfDocumentId}
          setTargetPdfPage={setTargetPdfPage}
          setTargetHighlightText={setTargetHighlightText}
          quickReplies={structuredResponse?.quickReplies}
          onQuickReplyClick={handleQuickReplyClick}
          uploadRequest={structuredResponse?.uploadRequest}
          onUploadRequest={handleUploadRequest}
          isUploadingFromRequest={isUploading}
          userMessageColor={userMessageColor}
        />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-6 pt-4">
        <InputBar
          userInput={userInput}
          setUserInput={setUserInput}
          handleFilterUserMessageAndSend={handleSend}
          canReply={!isLoading && !isCreatingThread && !!currentThreadId}
          options={[]}
          shortcuts={messages.length == 0 ? suggestions : undefined}
          suggestions={suggestions}
          autoFocus={false}
          placeholder="Ask anything"
          selectedText={selectedText}
          updateSelectedText={updateSelectedText}
          selectedScreenshot={selectedScreenshot}
          updateSelectedScreenshot={updateSelectedScreenshot}
          currentSkill={currentSkill}
          updateCurrentSkill={updateCurrentSkill}
          updateCurrentSkillPrompt={updateCurrentSkillPrompt}
          draggedContexts={draggedContexts}
          removeDraggedContext={removeDraggedContext}
          primaryColor={primaryColor}
        />
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes wave {
          0%,
          60%,
          100% {
            transform: initial;
          }
          30% {
            transform: translateY(-3px);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        :global(.wave-dot) {
          display: inline-block;
          animation: wave 1s infinite;
        }
        :global(.wave-dot:nth-child(1)) {
          animation-delay: 0s;
        }
        :global(.wave-dot:nth-child(2)) {
          animation-delay: 0.1s;
        }
        :global(.wave-dot:nth-child(3)) {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}
