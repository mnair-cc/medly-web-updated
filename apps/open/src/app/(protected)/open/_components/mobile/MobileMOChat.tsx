"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InputBar from "./MobileMOChatInputBar";
import ChatThread from "../chat/MOChatThread";
import { useAiChat, type ChatMessage, type PageType } from "../chat/MOChatLayoutClient";
import { Message } from "@/app/types/types";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { toast } from "sonner";
import { isSupportedFormat, getSupportedFormatsMessage, MAX_FILE_SIZE } from "../../_utils/convertDocument";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useOpenPathname } from "../../_hooks/useOpenPathname";

// ============================================
// SUGGESTIONS BY PAGE TYPE
// ============================================

const SUGGESTIONS_BY_PAGE: Record<PageType, string[]> = {
  document: [
    "Explain this slide",
    "Create flashcards",
    "What does this diagram show?",
  ],
  flashcards: [
    "Create flashcards",
    "Edit my flashcards",
  ],
  notes: [
    "Help me plan my essay",
    "Help me brainstorm ideas",
    "Summarise my lectures"
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
  return chatMessages.filter((m) => m != null).map((m) => ({
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

export default function MobileMOChat() {
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
  } = useAiChat();

  const { isWideScreen } = useResponsive();

  // Get suggestions based on current page type
  const suggestions = useMemo(
    () => SUGGESTIONS_BY_PAGE[currentPageType] ?? [],
    [currentPageType]
  );

  const { documents: sidebarDocuments, collections, selectedCollection, mobileChatSnapPoint, setMobileChatSnapPoint, uploadDocument, setDocumentLoading, folders, accentBgColor } = useSidebar();
  const { track } = useTracking();
  const [isUploading, setIsUploading] = useState(false);
  const pathname = useOpenPathname();

  // Get active document ID from URL
  const activeDocumentId = useMemo(() => {
    if (pathname.startsWith('/open/doc/')) {
      return pathname.split('/')[3] ?? null;
    }
    return null;
  }, [pathname]);

  // Determine background color: use module accent when no document is open, grey otherwise
  const isBaseOpenRoute = !activeDocumentId;
  const chatBgColor = isBaseOpenRoute ? accentBgColor : "#F9F9FB";

  // Compute total document count in selected collection
  const totalDocsInCollection = useMemo(() => {
    if (!selectedCollection) return 0;
    return sidebarDocuments.filter(d => d.collectionId === selectedCollection).length;
  }, [sidebarDocuments, selectedCollection]);

  // Get current document info if one is open
  const currentDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return sidebarDocuments.find(d => d.id === activeDocumentId) ?? null;
  }, [sidebarDocuments, activeDocumentId]);

  // Get current folder info if document is in a folder
  const currentFolder = useMemo(() => {
    if (!currentDocument?.folderId) return null;
    return folders.find(f => f.id === currentDocument.folderId) ?? null;
  }, [folders, currentDocument]);

  // Get the primary color from the selected collection
  const primaryColor = useMemo(() => {
    const collection = collections.find(c => c.id === selectedCollection);
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

  // Ref for upload request file input
  const uploadRequestInputRef = useRef<HTMLInputElement>(null);

  // Track if user is at bottom of scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const threshold = 50; // px from bottom to consider "at bottom"
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= threshold;
  }, []);

  // Convert context messages to display format
  const messages = useMemo(() => {
    return convertToDisplayMessages(chatMessages);
  }, [chatMessages]);

  // Auto-scroll to bottom when messages change (only if user is at bottom)
  useEffect(() => {
    if (!isAtBottomRef.current) return;

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
  }, [chatMessages, isLoading]);

  const handleSend = useCallback(
    (message: string) => {
      // Expand chat to 50% only if minimized (don't shrink if already at 50% or full screen)
      if (mobileChatSnapPoint < 0.5) {
        setMobileChatSnapPoint(0.5);
      }
      // Force scroll to bottom when user sends a message
      isAtBottomRef.current = true;
      sendMessage(message, {
        selectedText: selectedText || undefined,
        screenshot: selectedScreenshot || undefined,
        draggedContexts: draggedContexts.length > 0 ? draggedContexts : undefined,
      });
      // Delay scroll to ensure DOM has updated with new message
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    },
    [sendMessage, selectedText, selectedScreenshot, draggedContexts, mobileChatSnapPoint, setMobileChatSnapPoint],
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
  // Don't clear structured response here - only clear after successful upload or next message
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
            source: "mobile_chat",
          });
          // Clear structured response (upload request button) after successful upload
          clearStructuredResponse();
          // Determine file type from extension
          const ext = file.name.split('.').pop()?.toLowerCase();
          const fileType: "pdf" | "docx" | "txt" = ext === "docx" ? "docx" : ext === "txt" ? "txt" : "pdf";
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
    [uploadDocument, selectedCollection, setDocumentLoading, track, navigateToDocument, clearStructuredResponse, sendTriggerEvent],
  );

  return (
    <div
      className="text-sm relative flex flex-col h-full"
      style={{ backgroundColor: chatBgColor }}
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
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Chat thread - with padding at bottom for input bar */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto pb-24 pt-10 md:pt-0"
        style={!isWideScreen ? {paddingBottom: '120px'} : undefined}
      >
        <ChatThread
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

      {/* Input bar - absolutely positioned at bottom with gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-4 z-20"
        style={{ background: `linear-gradient(to top, ${chatBgColor} 70%, transparent)` }}
      >
        <InputBar
          style="flat"
          userInput={userInput}
          setUserInput={setUserInput}
          handleFilterUserMessageAndSend={handleSend}
          canReply={!isLoading}
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
          messageCount={messages.length}
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          totalDocsInCollection={totalDocsInCollection}
          currentDocumentName={currentDocument?.name}
          currentDocumentType={currentDocument?.type}
          currentDocumentLabel={currentDocument?.label}
          currentFolderName={currentFolder?.name}
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
