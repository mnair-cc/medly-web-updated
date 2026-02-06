"use client";

import {
  useRegisterCapability,
  useRegisterContextCollector,
} from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import {
  Flashcard,
  FlashcardDeck,
  FlashcardSourceReference,
  FlashcardViewMode,
} from "@/app/(protected)/open/_types/flashcardTypes";
import { QuestionSessionPageType } from "@/app/(protected)/sessions/types";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { Plus } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlashcardPreviewPanel from "./flashcards/FlashcardPreviewPanel";
import FlashcardRow from "./flashcards/FlashcardRow";
import FlashcardStudyView from "./flashcards/FlashcardStudyView";
import { useFlashcardDrag } from "./flashcards/useFlashcardDrag";
import Spinner from "@/app/_components/Spinner";
import { useResponsive } from "@/app/_hooks/useResponsive";

interface FlashcardsPageProps {
  flashcardDeck: FlashcardDeck | null;
  initializeFlashcardDeck: (
    title: string,
    sourceDocumentIds?: string[],
  ) => FlashcardDeck;
  addFlashcard: (
    card: Omit<Flashcard, "id" | "order" | "createdAt" | "updatedAt">,
  ) => void;
  updateFlashcard: (
    cardId: string,
    updates: Partial<Omit<Flashcard, "id" | "createdAt">>,
  ) => void;
  deleteFlashcard: (cardId: string) => void;
  reorderFlashcards: (cardIds: string[]) => void;
  updateFlashcardDeckMeta: (
    updates: Partial<Pick<FlashcardDeck, "title" | "description">>,
  ) => void;
  recordFlashcardStudyEvent: (
    cardId: string,
    event: { quality: "good" | "again"; responseTimeMs?: number },
  ) => void;
  startFlashcardSession: (shuffle: boolean) => void;
  endFlashcardSession: (goodCount: number, againCount: number) => void;
  advanceFlashcardSession: () => void;
  openDocumentAtPage?: (pageIndex: number, sourceText: string) => void;
  setPageType?: (type: QuestionSessionPageType) => void;
  documentId?: string;
  toolbarHeight?: number;
}

const FlashcardsPage: React.FC<FlashcardsPageProps> = ({
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
  openDocumentAtPage,
  setPageType,
  documentId,
  toolbarHeight = 0,
}) => {
  const [viewMode, setViewMode] = useState<FlashcardViewMode>("edit");
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const { track } = useTracking();
  const { isBelowSm } = useResponsive();

  // Session study state
  const [sessionGoodCount, setSessionGoodCount] = useState(0);
  const [sessionAgainCount, setSessionAgainCount] = useState(0);

  // Generation animation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    stage: "reading" | "generating";
    currentCard: number;
    totalCards: number;
    sourceDocName?: string;
  } | null>(null);
  // Track card count at generation start - cards with index >= this get animation
  const [generationStartCardCount, setGenerationStartCardCount] = useState<
    number | null
  >(null);
  const [generationIndicatorTop, setGenerationIndicatorTop] = useState(0);
  const [isIndicatorSticky, setIsIndicatorSticky] = useState(false);
  const [stickyIndicatorBounds, setStickyIndicatorBounds] = useState<{ left: number; width: number } | null>(null);
  const cardListContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugCreateJson, setDebugCreateJson] = useState('[{"term": "Test Term", "definition": "Test Definition"}]');
  const [debugCreateResult, setDebugCreateResult] = useState("");
  const [debugUpdateCardId, setDebugUpdateCardId] = useState("");
  const [debugUpdateTerm, setDebugUpdateTerm] = useState("");
  const [debugUpdateDefinition, setDebugUpdateDefinition] = useState("");
  const [debugUpdateResult, setDebugUpdateResult] = useState("");
  const [debugDeleteIds, setDebugDeleteIds] = useState<Set<string>>(new Set());
  const [debugDeleteResult, setDebugDeleteResult] = useState("");

  // Auto-add first card if deck is empty
  useEffect(() => {
    if (flashcardDeck && flashcardDeck.cards.length === 0) {
      addFlashcard({
        term: "",
        definition: "",
        sourceReferences: [],
        studyHistory: [],
        author: "user",
      });
    }
  }, [flashcardDeck, addFlashcard]);

  // Auto-switch to study mode when session starts externally (e.g. from Header)
  useEffect(() => {
    if (flashcardDeck?.currentSession && viewMode === "edit") {
      setSessionGoodCount(0);
      setSessionAgainCount(0);
      setViewMode("study");
    }
  }, [flashcardDeck?.currentSession, viewMode]);

  const sortedCards = useMemo(
    () => (flashcardDeck ? [...flashcardDeck.cards].sort((a, b) => a.order - b.order) : []),
    [flashcardDeck],
  );

  // Drag-to-reorder hook
  const {
    isDragging,
    draggedIndex,
    containerRef,
    setItemRef,
    getTranslateY,
    createDragStartHandler,
  } = useFlashcardDrag({
    onReorder: reorderFlashcards,
  });

  // Get card IDs for drag operations
  const cardIds = useMemo(() => sortedCards.map((c) => c.id), [sortedCards]);

  // Update generation indicator position (after last card)
  const updateGenerationIndicatorPosition = useCallback(() => {
    if (!cardListContainerRef.current) return;

    const cardRows =
      cardListContainerRef.current.querySelectorAll("[data-card-row]");
    const lastCard = cardRows[cardRows.length - 1];

    if (lastCard) {
      const containerRect =
        cardListContainerRef.current.getBoundingClientRect();
      const lastCardRect = lastCard.getBoundingClientRect();
      // Position 16px below the last card
      setGenerationIndicatorTop(
        lastCardRect.bottom - containerRect.top + 16
      );
    } else {
      setGenerationIndicatorTop(0);
    }
  }, []);

  // Check if indicator should be sticky (natural position below viewport)
  const checkIndicatorSticky = useCallback(() => {
    if (!scrollContainerRef.current || !cardListContainerRef.current || !isGenerating) {
      setIsIndicatorSticky(false);
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const cardListContainer = cardListContainerRef.current;

    // Get the scroll container's visible bounds
    const scrollRect = scrollContainer.getBoundingClientRect();
    const visibleBottom = scrollRect.bottom;

    // Get the indicator's natural position in viewport coordinates
    const containerRect = cardListContainer.getBoundingClientRect();
    const indicatorNaturalTop = containerRect.top + generationIndicatorTop;

    // Indicator height ~50px, add buffer
    const indicatorHeight = 60;

    // If indicator's natural position is below the visible area, make it sticky
    const shouldBeSticky = indicatorNaturalTop > visibleBottom - indicatorHeight;
    setIsIndicatorSticky(shouldBeSticky);

    // Store bounds for sticky positioning (use scroll container bounds)
    if (shouldBeSticky) {
      setStickyIndicatorBounds({
        left: scrollRect.left,
        width: scrollRect.width,
      });
    }
  }, [generationIndicatorTop, isGenerating]);

  // Scroll to indicator's natural position (where cards are being generated)
  const scrollToIndicator = useCallback(() => {
    if (!scrollContainerRef.current || !cardListContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;
    const cardListContainer = cardListContainerRef.current;
    const containerRect = cardListContainer.getBoundingClientRect();
    const scrollRect = scrollContainer.getBoundingClientRect();

    // Calculate target scroll position to show indicator at bottom of viewport
    const indicatorNaturalTop = containerRect.top - scrollRect.top + scrollContainer.scrollTop + generationIndicatorTop;
    const targetScroll = indicatorNaturalTop - scrollRect.height + 80; // 80px buffer for indicator height

    scrollContainer.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  }, [generationIndicatorTop]);

  // Listen to scroll events on the scroll container
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isGenerating) return;

    const handleScroll = () => {
      checkIndicatorSticky();

      // Track if user is at bottom (within 100px threshold)
      const threshold = 100;
      const isAtBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
      isAtBottomRef.current = isAtBottom;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    checkIndicatorSticky();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [isGenerating, checkIndicatorSticky]);

  // Re-check sticky state when indicator position updates (new card added)
  useEffect(() => {
    if (isGenerating) {
      checkIndicatorSticky();
    }
  }, [generationIndicatorTop, isGenerating, checkIndicatorSticky]);

  // ----------------------------------------
  // AI Chat capability registrations
  // ----------------------------------------

  // Helper to find card by ID (supports short ID prefix matching)
  const findCardById = useCallback(
    (cardId: string) => {
      return flashcardDeck?.cards.find(
        (c) => c.id === cardId || c.id.startsWith(cardId)
      );
    },
    [flashcardDeck?.cards],
  );

  // Handler for AI to update flashcards (array-based)
  const handleAiUpdateFlashcards = useCallback(
    async (params: { cards: Array<{ id: string; term?: string; definition?: string }> }) => {
      const results: Array<{ id: string; success: boolean; error?: string }> = [];
      for (const cardUpdate of params.cards) {
        const card = findCardById(cardUpdate.id);
        if (!card) {
          results.push({ id: cardUpdate.id, success: false, error: "Card not found" });
          continue;
        }
        try {
          const updates: Partial<Omit<Flashcard, "id" | "createdAt">> = {};
          if (cardUpdate.term !== undefined) updates.term = cardUpdate.term;
          if (cardUpdate.definition !== undefined) updates.definition = cardUpdate.definition;
          updateFlashcard(card.id, updates);
          results.push({ id: cardUpdate.id, success: true });
        } catch (e) {
          results.push({ id: cardUpdate.id, success: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }
      return results;
    },
    [findCardById, updateFlashcard],
  );

  // Handler for AI to delete flashcards (array-based)
  const handleAiDeleteFlashcards = useCallback(
    async (params: { cardIds: string[] }) => {
      console.log("[FlashcardsPage] deleteFlashcards called with:", params.cardIds);
      console.log("[FlashcardsPage] Current deck cards:", flashcardDeck?.cards.map(c => ({ id: c.id, term: c.term })));

      const results: Array<{ cardId: string; success: boolean; error?: string }> = [];

      // Resolve short IDs to full IDs first
      const resolvedCards = params.cardIds.map((cardId) => ({
        inputId: cardId,
        card: findCardById(cardId),
      }));
      console.log("[FlashcardsPage] Resolved cards:", resolvedCards.map(r => ({ inputId: r.inputId, found: !!r.card, fullId: r.card?.id })));

      const validCards = resolvedCards.filter((r) => r.card);
      console.log("[FlashcardsPage] validCards:", validCards.length);

      for (const { inputId, card } of resolvedCards) {
        if (!card) {
          console.log("[FlashcardsPage] Card not found:", inputId);
          results.push({ cardId: inputId, success: false, error: "Card not found" });
          continue;
        }
        try {
          console.log("[FlashcardsPage] Deleting card:", card.id);
          deleteFlashcard(card.id);
          results.push({ cardId: inputId, success: true });
        } catch (e) {
          console.error("[FlashcardsPage] Delete error:", e);
          results.push({ cardId: inputId, success: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }
      console.log("[FlashcardsPage] Delete results:", results);
      return results;
    },
    [findCardById, flashcardDeck?.cards, deleteFlashcard],
  );

  // ----------------------------------------
  // Generation streaming capabilities
  // ----------------------------------------

  // Start flashcard generation - shows indicator and tracks starting card count
  const handleStartFlashcardGeneration = useCallback(
    async (params: { totalCards: number; sourceDocName?: string; startCount?: number }) => {
      console.log("[FlashcardsPage] startFlashcardGeneration called:", params);

      // Calculate start count: count non-empty cards (empty ones will be replaced)
      const emptyCards = flashcardDeck?.cards.filter(
        c => (c.term ?? "").trim() === "" && (c.definition ?? "").trim() === ""
      ) ?? [];
      const nonEmptyCardCount = (flashcardDeck?.cards.length ?? 0) - emptyCards.length;
      const actualStartCount = params.startCount ?? nonEmptyCardCount;
      console.log("[FlashcardsPage] generationStartCardCount set to:", actualStartCount, "(empty cards:", emptyCards.length, ")");
      setGenerationStartCardCount(actualStartCount);

      setIsGenerating(true);
      setGenerationProgress({
        stage: "reading",
        currentCard: 0,
        totalCards: params.totalCards,
        sourceDocName: params.sourceDocName,
      });

      // Position indicator below existing cards
      requestAnimationFrame(() => {
        updateGenerationIndicatorPosition();
      });
    },
    [flashcardDeck?.cards, updateGenerationIndicatorPosition]
  );

  // Add a single streamed flashcard with animation
  const handleAddStreamedFlashcard = useCallback(
    async (params: {
      card: { term: string; definition: string };
      cardNumber: number;
      totalCards: number;
    }) => {
      console.log("[FlashcardsPage] addStreamedFlashcard called:", params.cardNumber, "of", params.totalCards);

      // Update progress to show current card being created
      setGenerationProgress((prev) =>
        prev
          ? {
              ...prev,
              stage: "generating",
              currentCard: params.cardNumber,
            }
          : null
      );

      // Find empty placeholder card to replace (for first card only)
      const emptyCard = params.cardNumber === 1
        ? flashcardDeck?.cards.find(c => (c.term ?? "").trim() === "" && (c.definition ?? "").trim() === "")
        : null;

      if (emptyCard) {
        // Update the empty card instead of adding
        console.log("[FlashcardsPage] Replacing empty card:", emptyCard.id.slice(0, 8));
        updateFlashcard(emptyCard.id, {
          term: params.card.term,
          definition: params.card.definition,
        });
      } else {
        // Add a new card
        addFlashcard({
          term: params.card.term,
          definition: params.card.definition,
          sourceReferences: [],
          studyHistory: [],
          author: "ai",
        });
      }

      // Update indicator position after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateGenerationIndicatorPosition();

          // Auto-scroll if user was at bottom
          if (isAtBottomRef.current && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        });
      });
    },
    [addFlashcard, updateFlashcard, flashcardDeck?.cards, updateGenerationIndicatorPosition]
  );

  // End flashcard generation - hides indicator
  const handleEndFlashcardGeneration = useCallback(async () => {
    setIsGenerating(false);
    setGenerationProgress(null);
    // Keep animation class briefly, then clear
    setTimeout(() => {
      setGenerationStartCardCount(null);
    }, 500);
  }, []);

  // Handler for AI to create flashcards (array-based)
  // This is called both by direct createFlashcards tool AND internally for animations
  const handleAiCreateFlashcards = useCallback(
    async (params: { cards: Array<{ term: string; definition: string }> }) => {
      console.log("[FlashcardsPage] handleAiCreateFlashcards called with", params.cards.length, "cards");

      // Find empty placeholder cards (cards with empty term AND definition)
      const emptyCards = flashcardDeck?.cards.filter(
        (c) => (c.term ?? "").trim() === "" && (c.definition ?? "").trim() === ""
      ) ?? [];
      const nonEmptyCardCount = (flashcardDeck?.cards.length ?? 0) - emptyCards.length;

      console.log("[FlashcardsPage] flashcardDeck?.cards:", flashcardDeck?.cards?.map(c => ({ id: c.id.slice(0, 8), term: c.term, def: c.definition })));
      console.log("[FlashcardsPage] emptyCards:", emptyCards.map(c => ({ id: c.id.slice(0, 8), term: c.term, def: c.definition })));
      console.log("[FlashcardsPage] emptyCards.length:", emptyCards.length);

      // Calculate animation start count: existing non-empty cards don't animate
      const startCount = nonEmptyCardCount;

      const results: Array<{ success: boolean; error?: string }> = [];

      // Use streaming animation for multiple cards
      if (params.cards.length > 1) {
        // Start generation animation with correct start count
        await handleStartFlashcardGeneration({
          totalCards: params.cards.length,
          sourceDocName: "AI Generated",
          startCount,
        });

        // Add cards one by one with animation
        for (let i = 0; i < params.cards.length; i++) {
          const card = params.cards[i];
          // Small delay between cards for visual effect
          if (i > 0) {
            await new Promise(r => setTimeout(r, 150));
          }
          try {
            // Update progress to show current card
            setGenerationProgress((prev) =>
              prev ? { ...prev, stage: "generating", currentCard: i + 1 } : null
            );

            // If there's an empty placeholder card, update it instead of adding
            if (i < emptyCards.length) {
              console.log("[FlashcardsPage] Updating empty card at index", i, "with id:", emptyCards[i].id.slice(0, 8), "-> term:", card.term.slice(0, 20));
              updateFlashcard(emptyCards[i].id, {
                term: card.term,
                definition: card.definition,
              });
              // Update indicator position after DOM updates
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  updateGenerationIndicatorPosition();
                });
              });
            } else {
              console.log("[FlashcardsPage] Adding new card at index", i, "-> term:", card.term.slice(0, 20));
              await handleAddStreamedFlashcard({
                card: { term: card.term, definition: card.definition },
                cardNumber: i + 1,
                totalCards: params.cards.length,
              });
            }
            results.push({ success: true });
          } catch (e) {
            results.push({ success: false, error: e instanceof Error ? e.message : "Unknown error" });
          }
        }

        // End generation animation
        await handleEndFlashcardGeneration();
      } else {
        // Single card - update empty placeholder or add new
        for (const card of params.cards) {
          try {
            if (emptyCards.length > 0) {
              console.log("[FlashcardsPage] Single card: Updating empty card with id:", emptyCards[0].id.slice(0, 8));
              updateFlashcard(emptyCards[0].id, {
                term: card.term,
                definition: card.definition,
              });
            } else {
              addFlashcard({
                term: card.term,
                definition: card.definition,
                sourceReferences: [],
                studyHistory: [],
                author: "ai",
              });
            }
            results.push({ success: true });
          } catch (e) {
            results.push({ success: false, error: e instanceof Error ? e.message : "Unknown error" });
          }
        }
      }

      return results;
    },
    [
      addFlashcard,
      updateFlashcard,
      flashcardDeck?.cards,
      handleStartFlashcardGeneration,
      handleAddStreamedFlashcard,
      handleEndFlashcardGeneration,
      updateGenerationIndicatorPosition,
    ],
  );

  // Register capabilities (array-based only)
  useRegisterCapability("createFlashcards", handleAiCreateFlashcards, "flashcards");
  useRegisterCapability("updateFlashcards", handleAiUpdateFlashcards, "flashcards");
  useRegisterCapability("deleteFlashcards", handleAiDeleteFlashcards, "flashcards");
  // Generation streaming capabilities
  useRegisterCapability("startFlashcardGeneration", handleStartFlashcardGeneration, "flashcards");
  useRegisterCapability("addStreamedFlashcard", handleAddStreamedFlashcard, "flashcards");
  useRegisterCapability("endFlashcardGeneration", handleEndFlashcardGeneration, "flashcards");

  // Register context collector
  const collectFlashcardsContext = useCallback(async () => {
    return {
      flashcardCount: flashcardDeck?.cards.length ?? 0,
      flashcardDeckTitle: flashcardDeck?.title ?? "",
      currentViewMode: viewMode,
      selectedCardIndex,
      cards: sortedCards.map((c) => ({
        id: c.id,
        term: c.term,
        definition: c.definition,
      })),
    };
  }, [flashcardDeck, viewMode, selectedCardIndex, sortedCards]);

  useRegisterContextCollector("flashcards", collectFlashcardsContext);

  // ----------------------------------------
  // UI handlers
  // ----------------------------------------

  const handleStartStudy = useCallback(
    (shuffle: boolean) => {
      if (!flashcardDeck || flashcardDeck.cards.length === 0) return;
      setSessionGoodCount(0);
      setSessionAgainCount(0);
      startFlashcardSession(shuffle);
      setViewMode("study");
      track("flashcard_session_started", {
        card_count: flashcardDeck.cards.length,
        document_id: documentId,
      });
    },
    [flashcardDeck, startFlashcardSession, track, documentId],
  );

  const handleEndStudy = useCallback(() => {
    track("flashcard_session_completed", {
      good_count: sessionGoodCount,
      again_count: sessionAgainCount,
      total_cards: sessionGoodCount + sessionAgainCount,
      document_id: documentId,
    });
    endFlashcardSession(sessionGoodCount, sessionAgainCount);
    setViewMode("edit");
  }, [endFlashcardSession, sessionGoodCount, sessionAgainCount, track, documentId]);

  const handleStudyResponse = useCallback(
    (quality: "good" | "again", responseTimeMs?: number) => {
      if (!flashcardDeck?.currentSession) return;

      const currentCardId =
        flashcardDeck.currentSession.cardOrder[flashcardDeck.currentSession.currentIndex];
      recordFlashcardStudyEvent(currentCardId, { quality, responseTimeMs });

      if (quality === "good") {
        setSessionGoodCount((c) => c + 1);
      } else {
        setSessionAgainCount((c) => c + 1);
      }

      if (
        flashcardDeck.currentSession.currentIndex >=
        flashcardDeck.currentSession.cardOrder.length - 1
      ) {
        setTimeout(() => handleEndStudy(), 300);
      } else {
        advanceFlashcardSession();
      }
    },
    [
      flashcardDeck?.currentSession,
      recordFlashcardStudyEvent,
      advanceFlashcardSession,
      handleEndStudy,
    ],
  );

  const handleAddCard = useCallback(() => {
    addFlashcard({
      term: "",
      definition: "",
      sourceReferences: [],
      studyHistory: [],
      author: "user",
    });
    // Select the newly added card
    setSelectedCardIndex(flashcardDeck?.cards.length ?? 0);
  }, [addFlashcard, flashcardDeck?.cards.length]);

  const handleTermChange = useCallback(
    (cardId: string, term: string) => {
      updateFlashcard(cardId, { term });
    },
    [updateFlashcard],
  );

  const handleDefinitionChange = useCallback(
    (cardId: string, definition: string) => {
      updateFlashcard(cardId, { definition });
    },
    [updateFlashcard],
  );

  const handleCitationClick = useCallback(
    (ref: FlashcardSourceReference) => {
      if (openDocumentAtPage && setPageType) {
        setPageType(QuestionSessionPageType.Document);
        openDocumentAtPage(ref.pageIndex, ref.sourceSegment);
      }
    },
    [openDocumentAtPage, setPageType],
  );

  // Debug handlers
  const handleDebugCreate = async () => {
    try {
      const cards = JSON.parse(debugCreateJson);
      const result = await handleAiCreateFlashcards({ cards });
      setDebugCreateResult(`Created ${result.length} cards: ${JSON.stringify(result)}`);
    } catch (e) {
      setDebugCreateResult(`Error: ${e instanceof Error ? e.message : "Invalid JSON"}`);
    }
  };

  const handleDebugUpdate = async () => {
    if (!debugUpdateCardId) {
      setDebugUpdateResult("Error: Select a card first");
      return;
    }
    const cards: Array<{ id: string; term?: string; definition?: string }> = [{
      id: debugUpdateCardId,
      ...(debugUpdateTerm && { term: debugUpdateTerm }),
      ...(debugUpdateDefinition && { definition: debugUpdateDefinition }),
    }];
    const result = await handleAiUpdateFlashcards({ cards });
    setDebugUpdateResult(JSON.stringify(result));
  };

  const handleDebugDelete = async () => {
    if (debugDeleteIds.size === 0) {
      setDebugDeleteResult("Error: Select cards to delete");
      return;
    }
    const result = await handleAiDeleteFlashcards({ cardIds: Array.from(debugDeleteIds) });
    setDebugDeleteResult(JSON.stringify(result));
    setDebugDeleteIds(new Set());
  };

  const toggleDebugDeleteId = (cardId: string) => {
    setDebugDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Current card for study mode
  const currentStudyCard = useMemo(() => {
    if (!flashcardDeck?.currentSession) return null;
    const cardId =
      flashcardDeck.currentSession.cardOrder[flashcardDeck.currentSession.currentIndex];
    return flashcardDeck.cards.find((c) => c.id === cardId) || null;
  }, [flashcardDeck]);

  // Handle loading state - deck is initialized in useSessionOpen after load
  if (!flashcardDeck) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  // Study mode
  if (viewMode === "study" && flashcardDeck.currentSession) {
    return (
      <div className="flex flex-col h-full">
        {currentStudyCard && (
          <FlashcardStudyView
            card={currentStudyCard}
            onResponse={handleStudyResponse}
            onCitationClick={handleCitationClick}
            remainingCards={
              flashcardDeck.currentSession.cardOrder.length -
              flashcardDeck.currentSession.currentIndex -
              1
            }
          />
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div ref={scrollContainerRef} className="flex flex-col overflow-y-auto h-full relative">
      {/* Debug Panel - Absolute positioned */}
      {showDebug && (
        <div className="absolute top-0 left-0 right-0 z-50 border-b border-gray-200 shadow-lg p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">Debug AI Functions</h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {/* Create Flashcards */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">createFlashcards</h4>
            <textarea
              value={debugCreateJson}
              onChange={(e) => setDebugCreateJson(e.target.value)}
              className="w-full h-16 p-2 text-xs font-mono border rounded bg-gray-50"
              placeholder='[{"term": "...", "definition": "..."}]'
            />
            <div className="flex gap-2 items-center">
              <button
                onClick={handleDebugCreate}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create
              </button>
              {debugCreateResult && (
                <span className="text-xs text-gray-600 truncate">{debugCreateResult}</span>
              )}
            </div>
          </div>

          {/* Update Flashcard */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">updateFlashcards</h4>
            <div className="flex gap-2">
              <select
                value={debugUpdateCardId}
                onChange={(e) => setDebugUpdateCardId(e.target.value)}
                className="flex-1 p-1.5 text-xs border rounded bg-gray-50"
              >
                <option value="">Select card...</option>
                {sortedCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.id.slice(0, 8)}... - {card.term.slice(0, 20) || "(empty)"}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={debugUpdateTerm}
                onChange={(e) => setDebugUpdateTerm(e.target.value)}
                className="flex-1 p-1.5 text-xs border rounded bg-gray-50"
                placeholder="New term"
              />
              <input
                type="text"
                value={debugUpdateDefinition}
                onChange={(e) => setDebugUpdateDefinition(e.target.value)}
                className="flex-1 p-1.5 text-xs border rounded bg-gray-50"
                placeholder="New definition"
              />
              <button
                onClick={handleDebugUpdate}
                className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Update
              </button>
            </div>
            {debugUpdateResult && (
              <span className="text-xs text-gray-600">{debugUpdateResult}</span>
            )}
          </div>

          {/* Delete Flashcards */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700">deleteFlashcards</h4>
            <div className="flex gap-2 items-start">
              <div className="flex-1 max-h-20 overflow-y-auto border rounded bg-gray-50 p-2 space-y-1">
                {sortedCards.map((card) => (
                  <label key={card.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugDeleteIds.has(card.id)}
                      onChange={() => toggleDebugDeleteId(card.id)}
                      className="rounded"
                    />
                    <span className="font-mono text-gray-500">{card.id.slice(0, 8)}</span>
                    <span className="truncate">{card.term || "(empty)"}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleDebugDelete}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
              >
                Delete ({debugDeleteIds.size})
              </button>
            </div>
            {debugDeleteResult && (
              <span className="text-xs text-gray-600">{debugDeleteResult}</span>
            )}
          </div>
        </div>
      )}
      {/* Preview Panel */}
      <FlashcardPreviewPanel
        cards={sortedCards}
        selectedIndex={selectedCardIndex}
        onSelectCard={setSelectedCardIndex}
      />

      {/* Card Editing Section */}
      <div className="flex-1 bg-white">
        {/* Cards section header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cards ({flashcardDeck.cards.length})
          </h2>
        </div>

        {/* Card list */}
        <div className="px-6" style={{ paddingBottom: 24 + toolbarHeight }}>
          <div
            ref={(el) => {
              // Combine refs for both drag and generation indicator
              (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              (cardListContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className={`space-y-4 relative ${isGenerating ? "pb-16" : ""}`}
          >
            {sortedCards.map((card, index) => (
              <FlashcardRow
                key={card.id}
                rowNumber={index + 1}
                card={card}
                onTermChange={(term) => handleTermChange(card.id, term)}
                onDefinitionChange={(def) => handleDefinitionChange(card.id, def)}
                onDelete={() => {
                  if (sortedCards.length === 1) {
                    // If it's the last card, clear its content instead of deleting
                    updateFlashcard(card.id, { term: "", definition: "" });
                  } else {
                    deleteFlashcard(card.id);
                  }
                }}
                onCitationClick={handleCitationClick}
                onFocus={() => setSelectedCardIndex(index)}
                canDelete={!isGenerating}
                isDragging={isDragging}
                isDraggedItem={draggedIndex === index}
                translateY={getTranslateY(index)}
                onDragStart={isGenerating ? undefined : createDragStartHandler(index, cardIds)}
                setRef={(el) => setItemRef(card.id, el)}
                isNewlyAdded={
                  generationStartCardCount !== null &&
                  index >= generationStartCardCount
                }
              />
            ))}

            {/* Generation Indicator - only during "generating" stage, sticky when off-screen */}
            {isGenerating && generationProgress && generationProgress.stage === "generating" && (
              <div
                className={
                  isIndicatorSticky
                    ? "fixed z-50 px-6 cursor-pointer"
                    : "absolute left-0 right-0"
                }
                style={
                  isIndicatorSticky && stickyIndicatorBounds
                    ? {
                        bottom: 20,
                        left: stickyIndicatorBounds.left,
                        width: stickyIndicatorBounds.width,
                      }
                    : { top: generationIndicatorTop, transition: "top 300ms ease-out" }
                }
                onClick={isIndicatorSticky ? scrollToIndicator : undefined}
              >
                <div className="bg-white rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] px-4 py-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Spinner size="small" />
                    <span className="text-[14px] font-medium text-[#595959]">
                      Creating card {generationProgress.currentCard} of {generationProgress.totalCards}...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Add card button - hidden during generation */}
            {!isGenerating && (
              <button
                onClick={handleAddCard}
                className="flex items-center justify-center gap-2 w-full py-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add a card</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default FlashcardsPage;
