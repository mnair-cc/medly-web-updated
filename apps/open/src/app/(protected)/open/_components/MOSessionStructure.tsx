"use client";

import { getMockDateInUTC } from "@/app/(protected)/mocks/_utils/utils";
import {
  PageType,
  useAiChat,
  useHeaderData,
  useRegisterCapability,
  useRegisterContextCollector,
} from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import PageRenderer from "@/app/(protected)/open/_components/session_structure/PageRenderer";
import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { useOpenMarking } from "@/app/(protected)/open/_hooks/useOpenMarking";
import { useSessionOpen } from "@/app/(protected)/open/_hooks/useSessionOpen";
import { useToolbarPadding } from "@/app/(protected)/open/_hooks/useToolbarPadding";
import { TranscriptionChunk } from "@/app/(protected)/open/_hooks/useTranscription";
import type { DocumentCreatedContext } from "@/app/(protected)/open/_types/chat";
import type { OpenSessionData } from "@/app/(protected)/open/_types/sessionTypes";
import { useSession } from "@/app/(protected)/sessions/hooks/useSession";
import {
  InputMode,
  QuestionSessionPageType,
  SessionData,
  SessionType,
} from "@/app/(protected)/sessions/types";
import Spinner from "@/app/_components/Spinner";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useSocket } from "@/app/_hooks/useSocket";
import { useTutorialTooltip } from "@/app/_hooks/useTutorialTooltip";
import {
  CanvasMessage,
  Decoration,
  FloatingMessage,
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import moment from "moment";
import { useSession as useNextAuthSession } from "next-auth/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Footer from "./session_structure/Footer";

const MOSessionStructure = ({
  returnUrl,
  subjectId,
  paperId,
  lessonId,
  practiceSessionId,
  initialSessionData,
}: {
  returnUrl: string;
  subjectId?: string | undefined;
  paperId?: string | undefined;
  lessonId?: string | undefined;
  practiceSessionId?: string | undefined;
  initialSessionData: SessionData | OpenSessionData | undefined;
}) => {
  const sessionType = SessionType.OpenSession;
  // Helper function to determine if session should be readonly
  const getIsReadOnly = (
    sessionType: SessionType,
    sessionData: SessionData | null,
    additionalConditions?: boolean,
  ): boolean => {
    if (
      sessionType === SessionType.PaperSession ||
      sessionType === SessionType.MockSession
    ) {
      return (
        !!sessionData?.timeFinished ||
        (sessionType === SessionType.MockSession &&
          moment().utc().isAfter(getMockDateInUTC("results_day")))
      );
    }
    return sessionData?.isMarked || additionalConditions || false;
  };

  // Helper function to determine if a specific question should be readonly
  const getIsQuestionReadOnly = (): boolean => {
    if (!sessionData) return true;

    const baseReadOnly = getIsReadOnly(sessionType, sessionData);

    return baseReadOnly;
  };

  // Get user ID from next-auth session for Firestore paths
  const { data: nextAuthSession } = useNextAuthSession();
  const userId = nextAuthSession?.user?.id;

  // Fetch lesson data for learn AI sidebar (only when lessonId is available)
  const { isSidebarOpen, renameDocument, documents, selectedCollection, collections } = useSidebar();

  // Chat context for AI messaging (used by Footer callbacks)
  const {
    sendMessage: chatSendMessage,
    sendSystemEvent,
    isAwaitingResponse,
    setCurrentPageType,
    setPdfUrl,
    targetPdfDocumentId: chatTargetPdfDocumentId,
    setTargetPdfDocumentId: chatSetTargetPdfDocumentId,
    targetPdfPage: chatTargetPdfPage,
    setTargetPdfPage: chatSetTargetPdfPage,
    targetHighlightText: chatTargetHighlightText,
    setTargetHighlightText: chatSetTargetHighlightText,
    isLoading: isChatLoading,
  } = useAiChat();

  // Header context for persistent header
  const { setHeaderData } = useHeaderData();

  // Transform OpenSessionData into SessionData if needed
  const transformedInitialSessionData = React.useMemo(() => {
    if (!initialSessionData) return undefined;

    // Check if this is OpenSessionData (has documentUrl but no pages)
    const openData = initialSessionData as OpenSessionData;
    if ("documentUrl" in openData && !("pages" in initialSessionData)) {
      // Transform OpenSessionData into SessionData with document page
      const sessionData: SessionData = {
        id: openData.id,
        sessionTitle: openData.sessionTitle,
        sessionSubtitle: "Try Medly",
        gcseHigher: true,
        hasInsert: false,
        insertType: null,
        insertText: null,
        inputMode: "text",
        isTimed: false,
        durationInMinutes: null,
        currentGrade: null,
        targetGrade: null,
        totalMarksAwarded: 0,
        totalMarksPossible: 0,
        questionCount: 0,
        timeStarted: new Date().toISOString(),
        timeFinished: null,
        isMarked: false,
        questionHistory: [],
        pages: [
          {
            type: QuestionSessionPageType.Document,
            progress: 0,
            content: openData.documentUrl,
          },
        ],
      };
      return sessionData;
    }

    // Already SessionData, return as is
    return initialSessionData as SessionData;
  }, [initialSessionData]);

  // Use SessionOpen for OpenSession type
  const {
    sessionData: openSessionData,
    documentNotes: openDocumentNotes,
    updateDocumentNotes: openUpdateDocumentNotes,
    documentCanvases: openDocumentCanvases,
    updateDocumentCanvas: openUpdateDocumentCanvas,
    documentHighlights: openDocumentHighlights,
    updateDocumentHighlights: openUpdateDocumentHighlights,
    allPagesText: openAllPagesText,
    updateAllPagesText: openUpdateAllPagesText,
    currentPageText: openCurrentPageText,
    updateCurrentPageText: openUpdateCurrentPageText,
    selectedText: openSelectedText,
    updateSelectedText: openUpdateSelectedText,
    documentTranscription: openDocumentTranscription,
    updateDocumentTranscription: openUpdateDocumentTranscription,
    highlightArea: openHighlightArea,
    updateHighlightArea: openUpdateHighlightArea,
    pageNotes: openPageNotes,
    updatePageNotes: openUpdatePageNotes,
    updateNotesStorageKey: openUpdateNotesStorageKey,
    updateDocumentName: openUpdateDocumentName,
    isLoading: isLoadingOpenSession,
    isTranscribing: openIsTranscribing,
    updateIsTranscribing: openUpdateIsTranscribing,
    documentQuestionGroups,
    addDocumentQuestionGroups,
    updateQuestionUserAnswer: updateDocumentQuestionUserAnswer,
    updateQuestionCanvas: updateDocumentQuestionCanvas,
    updateQuestionMarkingResult: updateDocumentQuestionMarkingResult,
    updateQuestionDecorations: updateDocumentQuestionDecorations,
    updateQuestionMarkedForReview: updateDocumentQuestionMarkedForReview,
    retryQuestion: retryDocumentQuestion,
    // Flashcard state and functions
    flashcardDeck,
    initializeFlashcardDeck,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    reorderFlashcards,
    updateFlashcardDeckMeta,
    recordFlashcardStudyEvent,
    startFlashcardSession,
    endFlashcardSession,
    advanceFlashcardSession,
  } = useSessionOpen({
    initialSessionData:
      sessionType === SessionType.OpenSession
        ? (initialSessionData as OpenSessionData)
        : undefined,
    renameDocument: renameDocument,
  });

  const {
    sessionData,
    isLoading: isLoadingSession,
    updateQuestionUserAnswer,
    updateQuestionCanvas,
    updateQuestionDecorations,
    updateQuestionDesmosExpressions,
    saveState,
    forceSave,
    updateQuestionMarkedForReview,
  } = useSession({
    initialSessionData: transformedInitialSessionData,
    sessionType,
    subjectId,
    paperId,
    lessonId,
    practiceSessionId,
  });

  const { socket, error, setError } = useSocket();

  const pageRendererRef = useRef<HTMLDivElement>(null);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPdfPage, setCurrentPdfPage] = useState(1); // Track actual PDF page number (1-indexed)
  const [pageType, setPageType] = useState<QuestionSessionPageType>(
    QuestionSessionPageType.Document,
  );
  const [targetPdfPage, setTargetPdfPage] = useState<number | null>(null);
  const [targetHighlightText, setTargetHighlightText] = useState<string | null>(
    null,
  );
  const [isDocumentLandscape, setIsDocumentLandscape] = useState(true); // Track PDF orientation
  const [autoStartNotesGeneration, setAutoStartNotesGeneration] =
    useState(false);

  // Extract documentId, thumbnailUrl, and documentType from initialSessionData if available
  const openSessionDocumentId =
    sessionType === SessionType.OpenSession && initialSessionData
      ? (initialSessionData as OpenSessionData).documentId
      : undefined;
  const openSessionThumbnailUrl =
    sessionType === SessionType.OpenSession && initialSessionData
      ? (initialSessionData as OpenSessionData).thumbnailUrl
      : undefined;
  const openSessionDocumentType =
    sessionType === SessionType.OpenSession && initialSessionData
      ? (initialSessionData as OpenSessionData).documentType
      : undefined;
  // Set pageType to Practice for practice documents (to show OpenQuestionPage)
  const isPracticeDocument =
    sessionType === SessionType.OpenSession &&
    (initialSessionData as OpenSessionData)?.documentType === "practice";

  // Set pageType to Flashcards for flashcard documents (to show FlashcardsPage)
  const isFlashcardDocument =
    sessionType === SessionType.OpenSession &&
    (initialSessionData as OpenSessionData)?.documentType === "flashcards";

  // Set pageType to Notes for notes documents (to show NotesPage)
  const isNotesDocument =
    sessionType === SessionType.OpenSession &&
    (initialSessionData as OpenSessionData)?.documentType === "notes";

  useEffect(() => {
    if (isPracticeDocument) {
      setPageType(QuestionSessionPageType.Practice);
    } else if (isFlashcardDocument) {
      setPageType(QuestionSessionPageType.Flashcards);
    } else if (isNotesDocument) {
      setPageType(QuestionSessionPageType.Notes);
    }
  }, [isPracticeDocument, isFlashcardDocument, isNotesDocument]);

  // Sync pageType to chat context so AI knows which page is active
  useEffect(() => {
    const pageTypeMap: Record<QuestionSessionPageType, PageType | null> = {
      [QuestionSessionPageType.Document]: "document",
      [QuestionSessionPageType.Notes]: "notes",
      [QuestionSessionPageType.Flashcards]: "flashcards",
      [QuestionSessionPageType.Practice]: "questions",
      [QuestionSessionPageType.Question]: "questions",
      [QuestionSessionPageType.Cover]: null,
      [QuestionSessionPageType.Insert]: null,
      [QuestionSessionPageType.Textbook]: null,
      [QuestionSessionPageType.Review]: null,
      [QuestionSessionPageType.Notepad]: null,
    };
    const mappedPageType = pageTypeMap[pageType];
    if (mappedPageType) {
      setCurrentPageType(mappedPageType);
    }
  }, [pageType, setCurrentPageType]);

  // For OpenSession, prefer live name from sidebar documents array
  // When no document is open, show the selected collection name
  const currentOpenSessionTitle = useMemo(() => {
    if (sessionType !== SessionType.OpenSession)
      return sessionData?.sessionTitle || "";
    
    // If a document is open, use its name
    if (openSessionDocumentId) {
      const docName = documents?.find((d) => d.id === openSessionDocumentId)?.name;
      if (docName) return docName;
    }
    
    // No document open - use selected collection name
    if (selectedCollection) {
      const collection = collections.find((c) => c.id === selectedCollection);
      if (collection?.name) return collection.name;
    }
    
    // Fallback to session data or default
    return openSessionData?.sessionTitle || "Medly";
  }, [
    sessionType,
    documents,
    openSessionDocumentId,
    openSessionData?.sessionTitle,
    sessionData?.sessionTitle,
    selectedCollection,
    collections,
  ]);

  // Update header data when session data changes
  useEffect(() => {
    if (sessionData) {
      setHeaderData({
        sessionTitle:
          sessionType === SessionType.OpenSession
            ? currentOpenSessionTitle
            : sessionData.sessionTitle,
        sessionSubtitle: sessionData.sessionSubtitle,
        sessionType,
        documentId: openSessionDocumentId,
        documentType: openSessionDocumentType,
        pageType,
        returnUrl,
        hasNotes: !!openPageNotes && openPageNotes.trim().length > 0,
        pages: sessionData.pages,
        currentPageIndex,
        onPageTypeChange: setPageType,
        onSummaryButtonClick: () => setAutoStartNotesGeneration(true),
      });
    }
  }, [
    sessionData,
    sessionType,
    currentOpenSessionTitle,
    openSessionDocumentId,
    openSessionDocumentType,
    pageType,
    returnUrl,
    openPageNotes,
    currentPageIndex,
    setHeaderData,
  ]);

  // Track if init message has been sent for current document
  const initMessageSentRef = useRef<string | null>(null);

  // Reset init tracking when document changes
  useEffect(() => {
    initMessageSentRef.current = null;
  }, [openSessionDocumentId]);

  // Send init message for empty documents (practice/flashcards/notes)
  useEffect(() => {
    // Debug logging
    console.log("[InitMessage] Effect running:", {
      isPracticeDocument,
      isFlashcardDocument,
      isNotesDocument,
      isLoadingOpenSession,
      isChatLoading,
      isAwaitingResponse,
      initMessageSentRef: initMessageSentRef.current,
      openSessionDocumentId,
      flashcardDeck: flashcardDeck
        ? { cardsLength: flashcardDeck.cards?.length }
        : null,
      documentQuestionGroups: documentQuestionGroups?.length,
      openPageNotes: openPageNotes?.length,
    });

    // Skip if not a document type that needs init
    if (!isPracticeDocument && !isFlashcardDocument && !isNotesDocument) {
      console.log("[InitMessage] Skipping - not a target document type");
      return;
    }

    // Skip if still loading
    if (isLoadingOpenSession || isChatLoading) {
      console.log("[InitMessage] Skipping - still loading");
      return;
    }

    // Skip if agent is currently active (likely just created this doc or is responding)
    if (isAwaitingResponse) {
      console.log("[InitMessage] Skipping - agent is responding");
      return;
    }

    // Skip if already sent init for this document
    if (initMessageSentRef.current === openSessionDocumentId) {
      console.log("[InitMessage] Skipping - already sent for this doc");
      return;
    }

    // Check if document is empty
    // For flashcards: empty if no cards OR all cards have empty term+definition
    const isFlashcardsEmpty =
      !flashcardDeck ||
      !flashcardDeck.cards ||
      flashcardDeck.cards.length === 0 ||
      flashcardDeck.cards.every(
        (card) => !card.term?.trim() && !card.definition?.trim(),
      );

    const isEmpty = isPracticeDocument
      ? !documentQuestionGroups || documentQuestionGroups.length === 0
      : isFlashcardDocument
        ? isFlashcardsEmpty
        : isNotesDocument
          ? !openPageNotes || openPageNotes.trim() === ""
          : false;

    console.log("[InitMessage] isEmpty check:", { isEmpty, isFlashcardsEmpty });

    if (!isEmpty) {
      console.log("[InitMessage] Skipping - document not empty");
      return;
    }

    console.log("[InitMessage] Scheduling init message in 300ms");

    // Small delay to allow state to settle after navigation
    const timeoutId = setTimeout(() => {
      // Mark as sent immediately to prevent duplicate triggers
      initMessageSentRef.current = openSessionDocumentId || null;

      // Build context
      const context: DocumentCreatedContext = {
        documentType: isPracticeDocument
          ? "practice"
          : isFlashcardDocument
            ? "flashcards"
            : "notes",
        documentName: currentOpenSessionTitle,
        sourceDocumentIds: openSessionData?.sourceReferences?.map(
          (ref) => ref.id,
        ),
        sourceDocumentNames: openSessionData?.sourceReferences?.map(
          (ref) => ref.name,
        ),
      };

      console.log("[InitMessage] Sending documentCreated event:", context);
      sendSystemEvent("documentCreated", context);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    isPracticeDocument,
    isFlashcardDocument,
    isNotesDocument,
    isLoadingOpenSession,
    isChatLoading,
    isAwaitingResponse,
    openSessionDocumentId,
    documentQuestionGroups,
    flashcardDeck,
    openPageNotes,
    currentOpenSessionTitle,
    openSessionData?.sourceReferences,
    sendSystemEvent,
  ]);

  // Derive PDF URL for citations
  const pdfUrlForCitation = useMemo(() => {
    if (sessionType !== SessionType.OpenSession) return undefined;
    const docPage = sessionData?.pages?.find(
      (p) => p.type === QuestionSessionPageType.Document,
    );
    const url = docPage?.content as string;
    return typeof url === "string" && url ? url : undefined;
  }, [sessionType, sessionData]);

  // Source document storage path for notes generation - passed from page component
  const sourceDocumentStoragePath = useMemo(() => {
    if (sessionType !== SessionType.OpenSession) {
      return undefined;
    }
    return (initialSessionData as OpenSessionData)?.sourceDocumentStoragePath;
  }, [sessionType, initialSessionData]);

  // Firestore document path for notes metadata updates
  const noteDocumentPath = useMemo(() => {
    if (!userId || !openSessionDocumentId) {
      return undefined;
    }
    return `users/${userId}/content/documents/items/${openSessionDocumentId}`;
  }, [userId, openSessionDocumentId]);

  // Update chat context with PDF URL for citation preview
  useEffect(() => {
    setPdfUrl(pdfUrlForCitation ?? null);
  }, [pdfUrlForCitation, setPdfUrl]);

  // Sync PDF page navigation from chat context to local state
  useEffect(() => {
    if (chatTargetPdfPage !== null || chatTargetPdfDocumentId) {
      console.log("[CITE-SYNC] target page received", {
        chatTargetPdfPage,
        chatTargetPdfDocumentId,
        openSessionDocumentId,
      });
    }
    if (chatTargetPdfPage !== null) {
      // If this jump targets a different document, keep it in chat context until we navigate there.
      if (
        chatTargetPdfDocumentId &&
        openSessionDocumentId &&
        chatTargetPdfDocumentId !== openSessionDocumentId
      ) {
        console.log("[CITE-SYNC] target page waiting for document switch");
        return;
      }
      setTargetPdfPage(chatTargetPdfPage);
      // Ensure the Document view is visible so DocumentPage can consume targetPdfPage.
      // Without this, citation clicks from chat won't navigate if the user is on Notes/Flashcards/Practice.
      setPageType(QuestionSessionPageType.Document);
      // Clear the context value after consuming it
      chatSetTargetPdfPage(null);
      chatSetTargetPdfDocumentId(null);
      console.log("[CITE-SYNC] target page applied", { chatTargetPdfPage });
    }
  }, [
    chatTargetPdfPage,
    chatTargetPdfDocumentId,
    chatSetTargetPdfPage,
    chatSetTargetPdfDocumentId,
    openSessionDocumentId,
  ]);

  // Sync highlight text from chat context to local state
  useEffect(() => {
    if (chatTargetHighlightText !== null || chatTargetPdfDocumentId) {
      console.log("[CITE-SYNC] highlight received", {
        chatTargetHighlightText: chatTargetHighlightText?.slice(0, 80),
        chatTargetPdfDocumentId,
        openSessionDocumentId,
      });
    }
    if (chatTargetHighlightText !== null) {
      // If this jump targets a different document, keep it in chat context until we navigate there.
      if (
        chatTargetPdfDocumentId &&
        openSessionDocumentId &&
        chatTargetPdfDocumentId !== openSessionDocumentId
      ) {
        console.log("[CITE-SYNC] highlight waiting for document switch");
        return;
      }
      setTargetHighlightText(chatTargetHighlightText);
      // Same rationale as above: switch to Document so flashHighlightText can run.
      setPageType(QuestionSessionPageType.Document);
      // Clear the context value after consuming it
      chatSetTargetHighlightText(null);
      chatSetTargetPdfDocumentId(null);
      console.log("[CITE-SYNC] highlight applied");
    }
  }, [
    chatTargetHighlightText,
    chatSetTargetHighlightText,
    chatTargetPdfDocumentId,
    chatSetTargetPdfDocumentId,
    openSessionDocumentId,
  ]);

  // Reset global action history when page changes
  const prevPageIndexRef = useRef(currentPageIndex);
  useEffect(() => {
    if (prevPageIndexRef.current !== currentPageIndex) {
      actionHistory.current = [];
      redoHistory.current = [];
      strokeRepository.current.clear();
      console.log(
        "🔄 Reset action history, redo history, and stroke repository for new page",
      );
      prevPageIndexRef.current = currentPageIndex;
    }
  }, [currentPageIndex]);
  const [inputMode, setInputMode] = useState<InputMode>("select");
  const [canvasMessage, setCanvasMessage] = useState<
    CanvasMessage[] | undefined
  >(undefined);
  const [floatingMessage, setFloatingMessage] = useState<
    FloatingMessage | undefined
  >(undefined);
  const [shimmerTextboxIndices, setShimmerTextboxIndices] = useState<number[]>(
    [],
  );
  const [fadeInTextboxIndices, setFadeInTextboxIndices] = useState<number[]>(
    [],
  );
  const handleSendMessageRef = useRef<((message: string) => void) | null>(null);

  // Wire handleSendMessageRef to chat context's sendMessage
  useEffect(() => {
    handleSendMessageRef.current = chatSendMessage;
  }, [chatSendMessage]);

  const clearMessagesRef = useRef<(() => void) | null>(null);
  const scrollToNextQuestionRef = useRef<(() => void) | null>(null);
  const editNotesRef = useRef<
    | ((
        edits: Array<{ textToReplace: string; newText: string }>,
        skipAnimation?: boolean,
      ) => Promise<Array<{ success: boolean; error?: string }>>)
    | null
  >(null);
  const pendingEditNotesActionRef = useRef<Array<{
    textToReplace: string;
    newText: string;
  }> | null>(null);
  const rewriteNotesRef = useRef<
    | ((
        newContent: string,
        skipAnimation?: boolean,
      ) => Promise<{ success: boolean; error?: string }>)
    | null
  >(null);
  const pendingRewriteNotesActionRef = useRef<string | null>(null);
  const rewriteStreamRef = useRef<{
    addChunk: (chunk: string) => void;
    end: () => void;
  } | null>(null);
  const generateQuestionsRef = useRef<(() => Promise<void>) | null>(null);
  const addCommentRef = useRef<
    ((text: string, comment: string) => void) | null
  >(null);
  const handleAnimationStateChangeRef = useRef<
    ((isAnimating: boolean) => void) | null
  >(null);
  const handleCancelAnimationRef = useRef<(() => void) | null>(null);
  const [highlightedText, setHighlightedText] = useState<string[]>([]);
  const isAiChatOpen = true;
  const [aiDecorations, setAiDecorations] = useState<Decoration[]>([]);

  const [isQuestionStemHighlighted, setIsQuestionStemHighlighted] =
    useState(false);
  const [isQuestionPartHighlighted, setIsQuestionPartHighlighted] =
    useState(false);
  const [highlightedQuestionPartIndex, setHighlightedQuestionPartIndex] =
    useState(0);

  // Wrapper for Footer component (now includes isRecording parameter)
  const handleTranscriptionChangeForFooter = useCallback(
    (
      currentText: string,
      transcriptHistory: string[],
      isRecording?: boolean,
    ) => {
      // Convert string array to TranscriptionChunk array
      const transcriptChunks: TranscriptionChunk[] = transcriptHistory.map(
        (text) => ({
          timestamp: Date.now(),
          text,
        }),
      );
      // Update with the chunks array
      openUpdateDocumentTranscription(transcriptChunks);
      // Update isTranscribing state if isRecording is provided
      if (isRecording !== undefined) {
        openUpdateIsTranscribing(isRecording);
      }
    },
    [openUpdateDocumentTranscription, openUpdateIsTranscribing],
  );

  // Handler for AI to create questions
  const handleAiCreateQuestions = useCallback(
    async (params: { questionGroups: QuestionGroup[] }) => {
      addDocumentQuestionGroups(params.questionGroups);
    },
    [addDocumentQuestionGroups],
  );

  // Register createQuestions capability for questions page type
  useRegisterCapability(
    "createQuestions",
    handleAiCreateQuestions,
    "questions",
  );

  // Register session-level context (sourceReferences) for all page types
  const collectSessionContext = useCallback(
    async () => ({
      sourceReferences: openSessionData?.sourceReferences,
      documentId: openSessionData?.documentId,
    }),
    [openSessionData?.sourceReferences, openSessionData?.documentId],
  );

  useRegisterContextCollector("document", collectSessionContext);

  // Track which questions are being retried (for post-results day mock sessions)
  const [retriedQuestions] = useState<Set<string>>(new Set());

  const { handleDismiss } = useTutorialTooltip("solve_with_medly");
  const { handleDismiss: handleDismissWhy } = useTutorialTooltip("why_tooltip");
  const { isWideScreen } = useResponsive();
  const { toolbarHeight } = useToolbarPadding({ pageType, isWideScreen });
  const desmosScientificRefs = useRef<
    Map<
      string,
      {
        ref: any;
        isReadOnly: boolean;
        questionIndex: number;
      }
    >
  >(new Map());

  // Math canvas mode preference (drawing or textbox)
  const [mathCanvasMode, setMathCanvasMode] = useState<"drawing" | "textbox">(
    () => {
      // if (typeof window === "undefined") return "drawing";
      // const saved = localStorage.getItem("mathCanvasMode");
      // if (saved === "textbox" || saved === "drawing") return saved;
      // return "drawing"; // Default fallback
      return "textbox";
    },
  );

  // Stroke data interface for central repository
  interface StrokeData {
    id: string;
    points: { x: number; y: number }[];
    color: string;
    width: number;
    canvasRef: any;
    questionId: string;
    isEraser: boolean;
    isApplePencil?: boolean;
    zIndex: number;
  }

  // Simplified action interface for clean undo/redo
  interface Action {
    type: "add" | "remove";
    strokeIds: string[];
    canvasRef: any;
    questionId: string;
    timestamp: number;
  }

  // Central stroke repository and action tracking
  const strokeRepository = useRef<Map<string, StrokeData>>(new Map());
  const actionHistory = useRef<Action[]>([]);
  const redoHistory = useRef<Action[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Registration function for DesmosScientific components
  const registerDesmosRef = useCallback(
    (id: string, ref: any, isReadOnly: boolean, index: number) => {
      if (ref) {
        desmosScientificRefs.current.set(id, {
          ref,
          isReadOnly,
          questionIndex: index,
        });
      } else {
        desmosScientificRefs.current.delete(id);
      }
    },
    [],
  );

  // Clean function to record actions and manage stroke repository
  const recordAction = useCallback(
    (
      type: "add" | "remove",
      strokeIds: string[],
      questionId: string,
      canvasRef: any,
      strokeDataArray?: StrokeData[],
    ) => {
      const timestamp = Date.now();

      console.log(`📝 Recording ${type} action:`, {
        type,
        strokeIds,
        questionId,
        strokeCount: strokeIds.length,
      });

      // If adding strokes, store their data in the repository
      if (type === "add" && strokeDataArray) {
        strokeDataArray.forEach((strokeData) => {
          strokeRepository.current.set(strokeData.id, strokeData);
          console.log(`💾 Stored stroke ${strokeData.id} in repository`);
        });
      }

      // Record the action
      actionHistory.current.push({
        type,
        strokeIds,
        canvasRef,
        questionId,
        timestamp,
      });

      // Clear redo history on new action (can't redo after new changes)
      const redoHistoryLength = redoHistory.current.length;
      redoHistory.current = [];

      console.log("🗑️ Cleared redo history (was", redoHistoryLength, "items)");
      console.log(
        "📝 Action history:",
        actionHistory.current.map(
          (a) => `${a.type}:[${a.strokeIds.join(",")}]`,
        ),
      );

      // Update undo/redo availability
      setCanUndo(actionHistory.current.length > 0);
      setCanRedo(false); // Redo history was just cleared
    },
    [],
  );

  // Callback for when a stroke is added
  const onStrokeAdded = useCallback(
    (
      questionId: string,
      canvasRef: any,
      strokeId: string,
      strokeData?: any,
    ) => {
      console.log("✏️ onStrokeAdded called with:", { questionId, strokeId });

      // We need to create StrokeData from the information we have
      // For now, we'll store what we can and rely on the canvas to provide full data
      if (strokeData) {
        const fullStrokeData: StrokeData = {
          id: strokeId,
          points: strokeData.points || [],
          color: strokeData.color || "#06B0FF",
          width: strokeData.width || 4,
          canvasRef,
          questionId,
          isEraser: strokeData.isEraser || false,
          isApplePencil: strokeData.isApplePencil || false,
          zIndex: strokeData.zIndex || 0,
        };

        recordAction("add", [strokeId], questionId, canvasRef, [
          fullStrokeData,
        ]);
      } else {
        // Fallback: record action without full stroke data (will need to be enhanced)
        recordAction("add", [strokeId], questionId, canvasRef);
      }
    },
    [recordAction],
  );

  // Callback for when strokes are erased
  const onEraseAction = useCallback(
    (questionId: string, canvasRef: any, erasedData: any) => {
      // Extract stroke IDs from erasedData and deduplicate them
      const rawStrokeIds =
        erasedData?.paths
          ?.map((pathData: any) => pathData.id)
          .filter(Boolean) || [];
      const erasedStrokeIds = [...new Set(rawStrokeIds)]; // Deduplicate using Set
      console.log("🖍️ Extracting erased stroke IDs:", {
        raw: rawStrokeIds,
        deduplicated: erasedStrokeIds,
      });

      // Store the erased stroke data in repository (since we need it for undo)
      if (erasedData?.paths) {
        erasedData.paths.forEach((pathData: any) => {
          if (pathData.id) {
            const strokeData: StrokeData = {
              id: pathData.id,
              points: pathData.paths || [],
              color: pathData.color || "#06B0FF",
              width: pathData.width || 4,
              canvasRef,
              questionId,
              isEraser: false,
              isApplePencil: pathData.isApplePencil || false,
              zIndex: pathData.zIndex || 0,
            };
            strokeRepository.current.set(pathData.id, strokeData);
            console.log(
              `💾 Stored erased stroke ${pathData.id} in repository for potential undo`,
            );
          }
        });
      }

      // Record the remove action only if there are stroke IDs to remove
      if (erasedStrokeIds.length > 0) {
        recordAction("remove", erasedStrokeIds, questionId, canvasRef);
      } else {
        console.log("🖍️ No strokes to erase, skipping action recording");
      }
    },
    [recordAction],
  );

  // Legacy callback (no longer used but kept for compatibility with PageRenderer)

  const onStrokeRemoved = useCallback(
    (_questionId: string, _strokeId: string) => {
      // No longer used - erases are now tracked as actions
    },
    [],
  );

  const [isOnLastSegment, setIsOnLastSegment] = useState(false);
  const [isLoading] = useState(false);

  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isSolveTogether, setIsSolveTogether] = useState(false);
  const [isInsertOpen, setIsInsertOpen] = useState(false);

  // Start-session tutorial modal state (for mock sessions)
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [, setIsExitConfirmationModalOpen] = useState(false);
  const [, setIsPostPracticeModalOpen] = useState(false);
  const [, setIsCanvasTutorialOpen] = useState(false);
  const isFetchingNextQuestion = false; // OpenSession doesn't fetch next questions

  const { handleMarkQuestion, isMarking } = useOpenMarking({
    updateQuestionMarkingResult: updateDocumentQuestionMarkingResult,
  });

  // Wrapper for retry question to match expected signature
  const handleRetryQuestion = useCallback(
    (_questionGroupId: number, questionLegacyId: string) => {
      retryDocumentQuestion(questionLegacyId);
    },
    [retryDocumentQuestion],
  );

  // Breakdown footer state
  const [isStepsActive, setIsStepsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [breakdownButtonText, setBreakdownButtonText] = useState<
    string | undefined
  >(undefined);
  const [breakdownButtonState, setBreakdownButtonState] = useState<
    "filled" | "greyed" | undefined
  >(undefined);
  const [breakdownIsDisabled, setBreakdownIsDisabled] = useState<
    boolean | undefined
  >(undefined);
  const [breakdownOnClick, setBreakdownOnClick] = useState<
    (() => void) | undefined
  >(undefined);
  const [breakdownIsMarked, setBreakdownIsMarked] = useState<
    boolean | undefined
  >(undefined);
  const [breakdownUserMark, setBreakdownUserMark] = useState<
    number | undefined
  >(undefined);
  const [breakdownMaxMark, setBreakdownMaxMark] = useState<number | undefined>(
    undefined,
  );
  const [breakdownIsMarking, setBreakdownIsMarking] = useState<
    boolean | undefined
  >(undefined);

  const snapPoints = ["0px", 0.7, 1];
  const [, setSnap] = useState<number | string | null>(snapPoints[0]);

  // useEffect(() => {
  //   if (isTouchScreen && lessonId?.includes("Math")) {
  //     setInputMode(mathCanvasMode === 'textbox' ? "math" : "pen");
  //   } else {
  //     setInputMode(sessionData?.inputMode || "text");
  //   }
  // }, [sessionData?.inputMode, isTouchScreen, mathCanvasMode, lessonId]);

  const handleUndo = () => {
    if (actionHistory.current.length === 0) {
      console.log("↩️ No actions to undo");
      return;
    }

    // Get the most recent action
    const lastAction = actionHistory.current.pop();
    if (!lastAction) return;

    console.log(
      "↩️ Undoing action:",
      `${lastAction.type}:[${lastAction.strokeIds.join(",")}]`,
    );
    console.log(
      "↩️ Remaining actions:",
      actionHistory.current.map((a) => `${a.type}:[${a.strokeIds.join(",")}]`),
    );

    // Reverse the action
    if (lastAction.type === "add") {
      // Remove the strokes that were added - use batch method for atomic operation
      console.log("🗑️ Removing strokes:", lastAction.strokeIds);
      if (lastAction.canvasRef?.removeStrokesByIds) {
        lastAction.canvasRef.removeStrokesByIds(lastAction.strokeIds);
      } else {
        // Fallback to individual removal if batch method not available
        lastAction.strokeIds.forEach((strokeId) => {
          if (lastAction.canvasRef?.removeStrokeById) {
            lastAction.canvasRef.removeStrokeById(strokeId);
          }
        });
      }
    } else if (lastAction.type === "remove") {
      // Add back the strokes that were removed - use batch method for atomic operation
      console.log("➕ Restoring strokes:", lastAction.strokeIds);
      const strokesToRestore = lastAction.strokeIds
        .map((strokeId) => strokeRepository.current.get(strokeId))
        .filter((strokeData) => strokeData !== undefined);

      if (
        strokesToRestore.length > 0 &&
        lastAction.canvasRef?.addStrokesBatch
      ) {
        // Use batch method for atomic restoration
        lastAction.canvasRef.addStrokesBatch(strokesToRestore);
      } else {
        // Fallback to individual restoration if batch method not available
        lastAction.strokeIds.forEach((strokeId) => {
          const strokeData = strokeRepository.current.get(strokeId);
          if (strokeData && lastAction.canvasRef?.addStroke) {
            lastAction.canvasRef.addStroke(strokeData);
          } else {
            console.warn(
              `⚠️ Could not restore stroke ${strokeId}: data not found in repository or canvas method missing`,
            );
          }
        });
      }
    }

    // Add to redo history
    redoHistory.current.push(lastAction);
    console.log(
      "📝 Action moved to redo history. Redo history now has:",
      redoHistory.current.length,
      "actions",
    );

    // Update undo/redo availability
    setCanUndo(actionHistory.current.length > 0);
    setCanRedo(redoHistory.current.length > 0);
  };

  const handleRedo = () => {
    console.log("🔄 SessionStructure handleRedo called");
    console.log("📊 Redo history length:", redoHistory.current.length);
    console.log(
      "📊 Redo history contents:",
      redoHistory.current.map((a) => `${a.type}:[${a.strokeIds.join(",")}]`),
    );

    if (redoHistory.current.length === 0) {
      console.log("↪️ No actions to redo");
      return;
    }

    // Get the most recent undone action
    const actionToRedo = redoHistory.current.pop();
    if (!actionToRedo) return;

    console.log(
      "↪️ Redoing action:",
      `${actionToRedo.type}:[${actionToRedo.strokeIds.join(",")}]`,
    );

    // Re-apply the action
    if (actionToRedo.type === "add") {
      // Add the strokes back - use batch method for atomic operation
      console.log("➕ Re-adding strokes:", actionToRedo.strokeIds);
      const strokesToRestore = actionToRedo.strokeIds
        .map((strokeId) => strokeRepository.current.get(strokeId))
        .filter((strokeData) => strokeData !== undefined);

      if (
        strokesToRestore.length > 0 &&
        actionToRedo.canvasRef?.addStrokesBatch
      ) {
        // Use batch method for atomic restoration
        actionToRedo.canvasRef.addStrokesBatch(strokesToRestore);
      } else {
        // Fallback to individual restoration if batch method not available
        actionToRedo.strokeIds.forEach((strokeId) => {
          const strokeData = strokeRepository.current.get(strokeId);
          if (strokeData && actionToRedo.canvasRef?.addStroke) {
            actionToRedo.canvasRef.addStroke(strokeData);
          } else {
            console.warn(
              `⚠️ Could not redo stroke ${strokeId}: data not found in repository or canvas method missing`,
            );
          }
        });
      }
    } else if (actionToRedo.type === "remove") {
      // Remove the strokes again - use batch method for atomic operation
      console.log("🗑️ Re-removing strokes:", actionToRedo.strokeIds);
      if (actionToRedo.canvasRef?.removeStrokesByIds) {
        actionToRedo.canvasRef.removeStrokesByIds(actionToRedo.strokeIds);
      } else {
        // Fallback to individual removal if batch method not available
        actionToRedo.strokeIds.forEach((strokeId) => {
          if (actionToRedo.canvasRef?.removeStrokeById) {
            actionToRedo.canvasRef.removeStrokeById(strokeId);
          }
        });
      }
    }

    // Add back to action history
    actionHistory.current.push(actionToRedo);
    console.log(
      "📝 Action moved back to action history. Action history now has:",
      actionHistory.current.length,
      "actions",
    );

    // Update undo/redo availability
    setCanUndo(actionHistory.current.length > 0);
    setCanRedo(redoHistory.current.length > 0);
  };

  const handleClearAll = () => {
    // Clear all non-readonly questions
    desmosScientificRefs.current.forEach(({ ref, isReadOnly }) => {
      if (!isReadOnly && ref?.triggerClearAll) {
        ref.triggerClearAll();
      }
    });

    // Clear the action history, redo history, and stroke repository
    actionHistory.current = [];
    redoHistory.current = [];
    strokeRepository.current.clear();
    console.log("🗑️ Cleared all actions, redo history, and stroke repository");

    // Update undo/redo availability
    setCanUndo(false);
    setCanRedo(false);
  };

  // Auto-send a placeholder "hello" message for first-time users
  // useEffect(() => {
  //   if (autoHelloSentRef.current) return;
  //   if (!isTutorial) return;
  //   if (!hasActivePlan && featureUsage.isFreeUseFinished) return;

  //   const isPracticeOrLesson =
  //     sessionData.sessionType === SessionType.PracticeSession ||
  //     sessionData.sessionType === SessionType.LessonSession;
  //   if (!isPracticeOrLesson) return;

  //   const page = sessionData.pages[currentPageIndex];
  //   if (!page || page.type !== QuestionSessionPageType.Question) return;
  //   const group = page.content as QuestionGroup;
  //   if (!group?.questions || group.questions.length === 0) return;
  //   if (!isHandleSendReady) return;
  //   if (isAwaitingResponse) return;

  //   autoHelloSentRef.current = true;
  //   try {
  //     handleSendMessageRef.current?.("medly_tutorial");
  //     setIsSolveTogether(true);
  //     track("medly_tutorial_message_sent");
  //   } catch {
  //     // no retries required
  //   }
  // }, [
  //   isTutorial,
  //   sessionData.sessionType,
  //   sessionData.pages,
  //   currentPageIndex,
  //   isHandleSendReady,
  //   isAwaitingResponse,
  // ]);

  if (isLoadingSession || isLoading || isLoadingOpenSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (!sessionData || !sessionData.pages || sessionData.pages.length === 0) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        {/* Could not load session */}
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-full overflow-x-hidden">
        <div className="relative flex flex-col flex-1 w-full h-full">
          {/* Header is now rendered at layout level in MOChatLayoutClient */}

          <div
            className={`flex-1 flex flex-row relative z-0 ${
              isResultsModalOpen ||
              sessionData.pages[currentPageIndex].type ===
                QuestionSessionPageType.Cover
                ? "overflow-y-auto"
                : "overflow-hidden"
            }`}
          >
            <div
              className={`flex-1 flex flex-col relative ${
                isResultsModalOpen ||
                sessionData.pages[currentPageIndex].type ===
                  QuestionSessionPageType.Cover
                  ? "overflow-y-auto"
                  : "overflow-hidden"
              }`}
            >
              <div
                className={`flex-1 w-full ${
                  isResultsModalOpen ||
                  sessionData.pages[currentPageIndex].type ===
                    QuestionSessionPageType.Cover
                    ? "overflow-y-auto"
                    : "overflow-hidden"
                }`}
              >
                <PageRenderer
                  ref={pageRendererRef}
                  aiDecorations={aiDecorations}
                  toolbarHeight={toolbarHeight}
                  canvasMessage={canvasMessage}
                  currentPageIndex={currentPageIndex}
                  currentStepIndex={currentStepIndex}
                  documentCanvases={openDocumentCanvases}
                  documentHighlights={openDocumentHighlights}
                  documentId={openSessionDocumentId}
                  documentName={
                    sessionType === SessionType.OpenSession
                      ? currentOpenSessionTitle
                      : sessionData?.sessionTitle
                  }
                  documentNotes={openDocumentNotes}
                  documentQuestionGroups={documentQuestionGroups}
                  fadeInTextboxIndices={fadeInTextboxIndices}
                  floatingMessage={floatingMessage}
                  getIsQuestionReadOnly={getIsQuestionReadOnly}
                  sourceDocumentStoragePath={sourceDocumentStoragePath}
                  noteDocumentPath={noteDocumentPath}
                  documentId={openSessionDocumentId}
                  handleGenerateQuestions={
                    generateQuestionsRef.current ?? undefined
                  }
                  handleMarkAnswer={handleMarkQuestion}
                  handleSetCurrentPageIndex={setCurrentPageIndex}
                  highlightArea={openHighlightArea}
                  highlightedText={highlightedText}
                  inputMode={inputMode}
                  isAiChatOpen={isAiChatOpen}
                  isCalculatorOpen={isCalculatorOpen}
                  isMarking={isMarking}
                  isOnLastSegment={isOnLastSegment}
                  isQuestionPartHighlighted={isQuestionPartHighlighted}
                  isQuestionStemHighlighted={isQuestionStemHighlighted}
                  isReadOnly={getIsReadOnly(
                    sessionType,
                    sessionData,
                    (
                      (
                        sessionData.pages[currentPageIndex]
                          .content as QuestionGroup
                      ).questions as QuestionWithMarkingResult[]
                    )?.every((q) => q.isMarked) || isMarking,
                  )}
                  isSolveTogether={isSolveTogether}
                  isStepsActive={isStepsActive}
                  lessonId={lessonId}
                  mathCanvasMode={mathCanvasMode}
                  onAnimationStateChange={(isAnimating: boolean) => {
                    handleAnimationStateChangeRef.current?.(isAnimating);
                  }}
                  onEditNotes={(textToReplace: string, newText: string) => {
                    if (editNotesRef.current) {
                      editNotesRef.current([{ textToReplace, newText }]);
                    } else {
                      pendingEditNotesActionRef.current = [
                        { textToReplace, newText },
                      ];
                      console.log(
                        "Queued edit-notes action (NotesPage not mounted yet) ->",
                        { textToReplace, newText },
                      );
                    }
                  }}
                  onEraseAction={onEraseAction}
                  onPdfPageChange={(pageNumber: number) => {
                    setCurrentPdfPage(pageNumber);
                    openUpdateHighlightArea(null);
                    // If we just navigated due to a citation jump, clear the target shortly after
                    if (targetPdfPage && pageNumber === targetPdfPage) {
                      window.setTimeout(() => {
                        setTargetPdfPage(null);
                        setTargetHighlightText(null);
                      }, 2000); // Give time for highlighting to complete
                    }
                  }}
                  onRewriteNotes={(newContent: string) => {
                    if (rewriteNotesRef.current) {
                      rewriteNotesRef.current(newContent);
                    } else {
                      pendingRewriteNotesActionRef.current = newContent;
                      console.log(
                        "Queued rewrite-notes action (NotesPage not mounted yet) ->",
                        { contentLength: newContent.length },
                      );
                    }
                  }}
                  onStrokeAdded={onStrokeAdded}
                  onStrokeRemoved={onStrokeRemoved}
                  page={sessionData.pages[currentPageIndex]}
                  pageNotes={openPageNotes}
                  isLoadingPage={isLoadingOpenSession}
                  pages={sessionData.pages}
                  pageType={pageType}
                  paperId={paperId}
                  registerDesmosRef={registerDesmosRef}
                  sessionSubtitle={sessionData.sessionSubtitle}
                  sessionTitle={sessionData.sessionTitle}
                  sessionType={sessionType}
                  setAddCommentRef={(fn) => {
                    addCommentRef.current = fn;
                  }}
                  setAiDecorations={setAiDecorations}
                  setBreakdownButtonState={setBreakdownButtonState}
                  setBreakdownIsDisabled={setBreakdownIsDisabled}
                  setBreakdownIsMarked={setBreakdownIsMarked}
                  setBreakdownIsMarking={setBreakdownIsMarking}
                  setBreakdownMaxMark={setBreakdownMaxMark}
                  setBreakdownOnClick={setBreakdownOnClick}
                  setBreakdownUserMark={setBreakdownUserMark}
                  setCancelAnimationRef={(fn) => {
                    handleCancelAnimationRef.current = fn;
                  }}
                  setCurrentStepIndex={(step: number | undefined) => {
                    if (step !== undefined) {
                      setCurrentStepIndex(step);
                    }
                  }}
                  setEditNotesRef={(fn) => {
                    editNotesRef.current = fn;
                    if (fn && pendingEditNotesActionRef.current) {
                      const edits = pendingEditNotesActionRef.current;
                      pendingEditNotesActionRef.current = null;
                      fn(edits);
                      console.log("Applied queued edit-notes actions");
                    }
                  }}
                  setFloatingMessage={setFloatingMessage}
                  setInputMode={setInputMode}
                  setIsStepsActive={setIsStepsActive}
                  setPageType={setPageType}
                  setRewriteNotesRef={(fn) => {
                    rewriteNotesRef.current = fn;
                    if (fn && pendingRewriteNotesActionRef.current) {
                      const content = pendingRewriteNotesActionRef.current;
                      pendingRewriteNotesActionRef.current = null;
                      fn(content);
                      console.log("Applied queued rewrite-notes action");
                    }
                  }}
                  setRewriteStreamRef={(fn) => {
                    rewriteStreamRef.current = fn;
                  }}
                  setSocketError={setError}
                  setTargetHighlightText={setTargetHighlightText}
                  setTargetPdfPage={setTargetPdfPage}
                  shimmerTextboxIndices={shimmerTextboxIndices}
                  socket={socket}
                  socketError={error}
                  subjectId={subjectId}
                  targetHighlightText={targetHighlightText}
                  targetPdfPage={targetPdfPage}
                  thumbnailUrl={openSessionThumbnailUrl}
                  updateDocumentCanvas={openUpdateDocumentCanvas}
                  updateDocumentHighlights={openUpdateDocumentHighlights}
                  updateDocumentName={openUpdateDocumentName}
                  updateDocumentNotes={openUpdateDocumentNotes}
                  updateDocumentQuestionCanvas={updateDocumentQuestionCanvas}
                  updateDocumentQuestionDecorations={
                    updateDocumentQuestionDecorations
                  }
                  updateDocumentQuestionMarkedForReview={
                    updateDocumentQuestionMarkedForReview
                  }
                  updateDocumentQuestionMarkingResult={
                    updateDocumentQuestionMarkingResult
                  }
                  updateDocumentQuestionUserAnswer={
                    updateDocumentQuestionUserAnswer
                  }
                  updatePageNotes={openUpdatePageNotes}
                  updateNotesStorageKey={openUpdateNotesStorageKey}
                  updateQuestionCanvas={updateQuestionCanvas}
                  updateQuestionDecorations={updateQuestionDecorations}
                  updateQuestionDesmosExpressions={
                    updateQuestionDesmosExpressions
                  }
                  updateQuestionMarkedForReview={updateQuestionMarkedForReview}
                  updateQuestionUserAnswer={updateQuestionUserAnswer}
                  highlightedQuestionPartIndex={highlightedQuestionPartIndex}
                  handleRetryQuestion={handleRetryQuestion}
                  scrollToNextQuestionRef={scrollToNextQuestionRef}
                  isAnnotating={isAnnotating}
                  // Breakdown footer prop setters
                  setBreakdownButtonText={setBreakdownButtonText}
                  // Flashcard props
                  flashcardDeck={flashcardDeck}
                  initializeFlashcardDeck={initializeFlashcardDeck}
                  addFlashcard={addFlashcard}
                  updateFlashcard={updateFlashcard}
                  deleteFlashcard={deleteFlashcard}
                  reorderFlashcards={reorderFlashcards}
                  updateFlashcardDeckMeta={updateFlashcardDeckMeta}
                  recordFlashcardStudyEvent={recordFlashcardStudyEvent}
                  startFlashcardSession={startFlashcardSession}
                  endFlashcardSession={endFlashcardSession}
                  advanceFlashcardSession={advanceFlashcardSession}
                  sourceReferences={openSessionData?.sourceReferences}
                  onLandscapeChange={setIsDocumentLandscape}
                  autoStartNotesGeneration={autoStartNotesGeneration}
                  onNotesGenerationStarted={() =>
                    setAutoStartNotesGeneration(false)
                  }
                />
              </div>

              <Footer
                breakdownButtonState={breakdownButtonState}
                breakdownIsDisabled={breakdownIsDisabled}
                breakdownIsMarked={breakdownIsMarked}
                breakdownIsMarking={breakdownIsMarking}
                currentPageIndex={currentPageIndex}
                // handlePreviousPage={handlePreviousPage}
                // handleNextPage={handleNextPage}
                // handleStartSession={handleStartSessionWithModal}
                breakdownMaxMark={breakdownMaxMark}
                breakdownOnClick={breakdownOnClick}
                handleGetFeedback={() => {
                  if (!isSolveTogether) {
                    handleSendMessageRef.current?.(
                      "Explain why I got this question wrong",
                    );
                  }
                  setSnap(snapPoints[2]); // Open bottomsheet to top
                }}
                // handleRetry={handleRetry}
                breakdownUserMark={breakdownUserMark}
                canRedo={canRedo}
                canUndo={canUndo}
                currentQuestionWithMarkingResult={
                  (sessionData.pages[currentPageIndex].type ===
                    QuestionSessionPageType.Question &&
                    ((
                      sessionData.pages[currentPageIndex]
                        .content as QuestionGroup
                    ).questions[0] as QuestionWithMarkingResult)) ||
                  null
                }
                handleCheckWork={() => {
                  handleSendMessageRef.current?.("Check my work");
                }}
                handleDismiss={handleDismiss}
                handleDismissWhy={handleDismissWhy}
                handleMarkAnswer={() => {
                  const questionGroup = sessionData.pages[currentPageIndex]
                    .content as QuestionGroup;
                  const markingContexts = (
                    (questionGroup.questions as QuestionWithMarkingResult[]) ||
                    []
                  )
                    .filter((question) => {
                      return (
                        question.userMark === undefined &&
                        ((question.canvas?.textboxes &&
                          question.canvas?.textboxes?.length > 0 &&
                          question.canvas.textboxes.some(
                            (textbox) => textbox.text.trim().length > 0,
                          )) ||
                          (question.userAnswer && question.userAnswer !== "") ||
                          (question.desmosExpressions &&
                            question.desmosExpressions.length > 0) ||
                          (question.canvas &&
                            question.canvas.paths &&
                            question.canvas.paths.length > 0))
                      );
                    })
                    .map((question) => ({
                      questionLegacyId: question.legacyId,
                      question: question.questionText,
                      correctAnswer: question.correctAnswer,
                      markMax: question.maxMark,
                      userAnswer: question.userAnswer || " ",
                      canvas: question.canvas,
                      desmosExpressions: question.desmosExpressions,
                      questionType: question.questionType,
                      lessonLegacyIds: question.lessonLegacyIds,
                    }));

                  // Clear undo/redo history when marking
                  actionHistory.current = [];
                  redoHistory.current = [];
                  strokeRepository.current.clear();
                  setCanUndo(false);
                  setCanRedo(false);

                  // Mark each question individually
                  markingContexts.forEach((markingContext) => {
                    handleMarkQuestion(markingContext);
                  });
                }}
                handleSolveTogether={() => {
                  if (!isSolveTogether) {
                    handleSendMessageRef.current?.(
                      "Help me solve this question",
                    );
                  }
                  setSnap(snapPoints[2]); // Open bottomsheet to top
                }}
                hasFinished={!!sessionData.timeFinished}
                hasInsert={sessionData.hasInsert}
                hasRetriedQuestions={false}
                hasStarted={!!sessionData.timeStarted}
                initialTranscription={
                  sessionType === SessionType.OpenSession
                    ? openDocumentTranscription
                        .map((chunk) => chunk.text)
                        .join(" ")
                    : undefined
                }
                inputMode={inputMode}
                insertType={sessionData.insertType}
                isAwaitingResponse={isAwaitingResponse}
                isFetchingNextQuestion={isFetchingNextQuestion}
                isInsertVisible={isInsertOpen}
                isMarking={isMarking}
                isReadOnly={getIsReadOnly(sessionType, sessionData)}
                isSidebarOpen={isSidebarOpen}
                isSolveTogether={isSolveTogether}
                isStartingSession={isLoadingSession}
                isStepsActive={isStepsActive}
                isToolbarVisible={false}
                mathCanvasMode={mathCanvasMode}
                onClearAll={handleClearAll}
                onRedo={handleRedo}
                onTranscriptionChange={handleTranscriptionChangeForFooter}
                onUndo={handleUndo}
                pages={sessionData.pages}
                pageType={pageType}
                isDocumentLandscape={isDocumentLandscape}
                paperId={paperId}
                questionGroup={
                  sessionData.pages[currentPageIndex].content as QuestionGroup
                }
                retriedQuestions={retriedQuestions}
                scrollToNextQuestionRef={scrollToNextQuestionRef}
                sessionType={sessionType}
                setInputMode={setInputMode}
                setIsCanvasTutorialOpen={setIsCanvasTutorialOpen}
                setIsInsertVisible={setIsInsertOpen}
                setIsPostPracticeModalOpen={() => {
                  setIsPostPracticeModalOpen(true);
                  setFloatingMessage(undefined);
                  setIsOnLastSegment(false);
                  setCurrentPageIndex(0);
                }}
                setIsStepsActive={setIsStepsActive}
                setMathCanvasMode={setMathCanvasMode}
                showTooltip={false}
                showWhyTooltip={false}
                isCalculatorOpen={isCalculatorOpen}
                // Breakdown props from state
                breakdownButtonText={breakdownButtonText}
                sessionSubtitle={sessionData.sessionSubtitle}
                // handleFinishSession={handleFinishSession}
                setIsExitConfirmationModalOpen={setIsExitConfirmationModalOpen}
                setIsSolveTogether={setIsSolveTogether}
                // handleSetCurrentPageIndex={handleSetCurrentPageIndex}
                sessionTitle={sessionData.sessionTitle}
              />
            </div>
          </div>
        </div>
        {/* Chat sidebar moved to layout level via MOChatLayoutClient */}
      </div>
    </>
  );
};

export default MOSessionStructure;
