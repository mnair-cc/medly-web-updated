import { TranscriptionChunk } from "@/app/(protected)/open/_hooks/useTranscription";
import { Document } from "@/app/(protected)/open/_types/content";
import {
  Flashcard,
  FlashcardDeck,
  FlashcardStudyEvent,
  StudySessionRecord,
} from "@/app/(protected)/open/_types/flashcardTypes";
import { OpenSessionData } from "@/app/(protected)/open/_types/sessionTypes";
import {
  DocumentSessionData,
  OpenSessionPersister,
} from "@/app/(protected)/open/persisters/OpenSessionPersister";
import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import {
  Canvas,
  Decoration,
  MarkingResult,
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";

interface UseSessionOpenParams {
  initialSessionData: OpenSessionData | undefined;
  renameDocument?: (documentId: string, newName: string) => Promise<void>;
}

// Highlight data structure matching DocumentPage
interface HighlightArea {
  height: number;
  left: number;
  pageIndex: number;
  top: number;
  width: number;
}

export interface DocumentNote {
  id: number;
  content: string;
  highlightAreas: HighlightArea[];
  quote: string;
}

export interface PageTextData {
  page: number;
  text: string;
}

export interface HighlightAreaData {
  label: string;
  box_2d: [number, number, number, number];
  show: boolean;
}

interface PendingDocumentSave {
  data: DocumentSessionData;
  timestamp: number;
}

export const useSessionOpen = ({
  initialSessionData,
  renameDocument: renameDocumentInSidebar,
}: UseSessionOpenParams) => {
  // Derive practice/flashcard document info from initialSessionData
  const isPracticeDocument = initialSessionData?.documentType === "practice";
  const isFlashcardDocument = initialSessionData?.documentType === "flashcards";
  const sourceReferences = initialSessionData?.sourceReferences;
  const [sessionData, setSessionData] = useState<OpenSessionData | undefined>(
    initialSessionData,
  );
  const [documentNotes, setDocumentNotes] = useState<{
    [page: number]: string;
  }>({});
  const [documentCanvases, setDocumentCanvases] = useState<{
    [page: number]: Canvas;
  }>({});
  const [documentHighlights, setDocumentHighlights] = useState<{
    [page: number]: DocumentNote[];
  }>({});
  const [documentQuestionGroups, setDocumentQuestionGroups] = useState<
    QuestionGroup[]
  >([]);
  const [allPagesText, setAllPagesText] = useState<PageTextData[]>([]);
  const [currentPageText, setCurrentPageText] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  const [currentSkillPrompt, setCurrentSkillPrompt] = useState<string | null>(
    null,
  );
  const [documentTranscription, setDocumentTranscription] = useState<
    TranscriptionChunk[]
  >([]);
  const [highlightArea, setHighlightArea] = useState<HighlightAreaData | null>(
    null,
  );
  const [pageNotes, setPageNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [flashcardDeck, setFlashcardDeck] = useState<FlashcardDeck | null>(
    null,
  );
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  // Firebase persistence
  const [pendingSaves, setPendingSaves] = useState<PendingDocumentSave[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingNotesRef = useRef<{ content: string; newVersion: boolean } | null>(null);
  const persisterRef = useRef(new OpenSessionPersister());
  const documentIdRef = useRef<string | null>(null);

  // Update documentId ref when sessionData changes
  useEffect(() => {
    if (sessionData?.documentId) {
      documentIdRef.current = sessionData.documentId;
    }
  }, [sessionData?.documentId]);

  // Fetch initial session data from Firebase
  useEffect(() => {
    const fetchDocumentSessionData = async () => {
      if (!sessionData?.documentId) return;

      try {
        setIsLoading(true);
        const response = await nextApiClient.get<Document>(
          `/open/documents/${sessionData.documentId}`,
        );
        const doc = response.data;

        // Load persisted session data
        if (doc.notes) setDocumentNotes(doc.notes);
        if (doc.canvases) setDocumentCanvases(doc.canvases);
        if (doc.highlights) {
          console.log(
            "📦 [load] highlights keys:",
            Object.keys(doc.highlights || {}).length,
          );
          setDocumentHighlights(doc.highlights);
        }
        if (doc.questionGroups && doc.questionGroups.length > 0) {
          console.log("📦 [load] questionGroups:", doc.questionGroups.length);
          setDocumentQuestionGroups(doc.questionGroups);
        } else {
          // No question groups loaded - keep empty array
          setDocumentQuestionGroups([]);
        }
        // Load pageNotes: prefer Storage if notesStorageKey exists, otherwise fallback to legacy pageNotes
        if (doc.notesStorageKey) {
          try {
            // Fetch notes content from Firebase Storage
            const storageResponse = await nextApiClient.get(
              `/open/storage/download?key=${encodeURIComponent(doc.notesStorageKey)}`,
              {
                responseType: "text",
              },
            );
            // axios with responseType: "text" returns data as string directly
            setPageNotes(storageResponse.data as string);
          } catch (error) {
            console.error("Error loading notes from Storage:", error);
            // Fallback to empty string if Storage fetch fails
            setPageNotes("");
          }
        } else if (doc.pageNotes) {
          // Legacy: use pageNotes from Firestore
          setPageNotes(doc.pageNotes);
        }
        if (doc.documentTranscription) {
          // Handle both new format (chunks array) and legacy format (string)
          if (Array.isArray(doc.documentTranscription)) {
            setDocumentTranscription(doc.documentTranscription);
          } else if (typeof doc.documentTranscription === "string") {
            // Convert legacy string format to chunks array
            const legacyChunk: TranscriptionChunk = {
              timestamp: Date.now(),
              text: doc.documentTranscription,
            };
            setDocumentTranscription([legacyChunk]);
          }
        }
        if (doc.allPagesText) setAllPagesText(doc.allPagesText);
        if (doc.flashcardDeck && doc.flashcardDeck.cards.length > 0) {
          setFlashcardDeck(doc.flashcardDeck);
        } else if (
          isFlashcardDocument &&
          sourceReferences &&
          sourceReferences.length > 0
        ) {
          // Flashcard document with no cards - trigger generation
          console.log(
            "📦 [flashcards] No cards, generating from sources:",
            sourceReferences,
          );
          setIsGeneratingFlashcards(true);

          try {
            // Call the generate-flashcards API
            const response = await nextApiClient.post(
              "/open/documents/generate-flashcards",
              {
                sourceReferences,
                sourceContent: "", // TODO: Fetch actual content from sources
                options: { count: 10 },
              },
            );

            const { flashcards } = response.data;
            const now = new Date().toISOString();

            // Create deck with generated cards
            const generatedDeck: FlashcardDeck = {
              id: uuidv7(),
              title: sessionData.sessionTitle || "Generated Flashcards",
              sourceDocumentIds: sourceReferences.map((ref) => ref.id),
              cards: flashcards.map(
                (fc: { term: string; definition: string }, idx: number) => ({
                  id: uuidv7(),
                  term: fc.term,
                  definition: fc.definition,
                  order: idx,
                  author: "ai" as const,
                  studyHistory: [],
                  createdAt: now,
                  updatedAt: now,
                }),
              ),
              sessionHistory: [],
              createdAt: now,
              updatedAt: now,
            };

            setFlashcardDeck(generatedDeck);

            // Save the generated deck
            setPendingSaves((saves) => [
              ...saves,
              {
                data: { flashcardDeck: generatedDeck },
                timestamp: Date.now(),
              },
            ]);
          } catch (error) {
            console.error("Error generating flashcards:", error);
            // Fall back to empty deck
            const now = new Date().toISOString();
            setFlashcardDeck({
              id: uuidv7(),
              title: sessionData.sessionTitle || "New flashcard set",
              sourceDocumentIds: sessionData.documentId
                ? [sessionData.documentId]
                : [],
              cards: [],
              sessionHistory: [],
              createdAt: now,
              updatedAt: now,
            });
          } finally {
            setIsGeneratingFlashcards(false);
          }
        } else {
          // Regular document - initialize empty deck
          const now = new Date().toISOString();
          setFlashcardDeck({
            id: uuidv7(),
            title: "New flashcard set",
            sourceDocumentIds: sessionData.documentId
              ? [sessionData.documentId]
              : [],
            cards: [],
            sessionHistory: [],
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        console.error("Error fetching document session data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentSessionData();
    // Note: isPracticeDocument and sourceReferences are derived from initialSessionData
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.documentId]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    const documentId = documentIdRef.current;
    if (!documentId || pendingSaves.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Get the latest save (highest timestamp)
        const latestSave = pendingSaves.reduce((latest, save) =>
          save.timestamp > latest.timestamp ? save : latest,
        );

        console.log(
          "💽 [persist] saving fields:",
          Object.keys(latestSave.data),
        );
        await persisterRef.current.saveDocumentData(
          documentId,
          latestSave.data,
        );
        setPendingSaves([]);
      } catch (error) {
        console.error("Error saving document session data:", error);
      }
    }, 200);
  }, [pendingSaves]);

  // Trigger debounced save when pendingSaves changes
  useEffect(() => {
    debouncedSave();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Force save pending notes on unmount
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);

        // If there are pending notes, save them immediately
        const documentId = documentIdRef.current;
        const pendingNotes = pendingNotesRef.current;
        if (documentId && pendingNotes) {
          // Use sendBeacon for reliable unmount saves
          const payload = JSON.stringify({
            content: pendingNotes.content,
            newVersion: pendingNotes.newVersion,
          });
          navigator.sendBeacon(
            `/api/open/documents/${documentId}/notes`,
            new Blob([payload], { type: 'application/json' })
          );
          pendingNotesRef.current = null;
        }
      }
    };
  }, [debouncedSave]);

  // Update document notes for a specific page
  const updateDocumentNotes = useCallback(
    (pageNumber: number, notes: string) => {
      setDocumentNotes((prev) => {
        const updated = {
          ...prev,
          [pageNumber]: notes,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { notes: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Update document canvas for a specific page (similar to updateQuestionCanvas in useSession)
  const updateDocumentCanvas = useCallback(
    (pageNumber: number, canvas: Canvas) => {
      setDocumentCanvases((prev) => {
        const updated = {
          ...prev,
          [pageNumber]: canvas,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { canvases: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Update document highlights for a specific page
  const updateDocumentHighlights = useCallback(
    (pageNumber: number, highlights: DocumentNote[]) => {
      setDocumentHighlights((prev) => {
        const updated = {
          ...prev,
          [pageNumber]: highlights,
        };

        console.log("🧭 [updateDocumentHighlights]", {
          pageNumber,
          count: highlights?.length ?? 0,
          pagesTracked: Object.keys(updated).length,
        });

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { highlights: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Update all pages text
  const updateAllPagesText = useCallback((textData: PageTextData[]) => {
    setAllPagesText(textData);

    // Queue save
    setPendingSaves((saves) => [
      ...saves,
      {
        data: { allPagesText: textData },
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Update current page text
  const updateCurrentPageText = useCallback((text: string) => {
    setCurrentPageText(text);
  }, []);

  // Update selected text
  const updateSelectedText = useCallback((text: string | null) => {
    setSelectedText(text);
  }, []);

  // Update current skill
  const updateCurrentSkill = useCallback((skill: string | null) => {
    setCurrentSkill(skill);
  }, []);

  // Update current skill prompt
  const updateCurrentSkillPrompt = useCallback((prompt: string | null) => {
    setCurrentSkillPrompt(prompt);
  }, []);

  // Update document transcription
  const updateDocumentTranscription = useCallback(
    (chunks: TranscriptionChunk[]) => {
      setDocumentTranscription(chunks);

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { documentTranscription: chunks },
          timestamp: Date.now(),
        },
      ]);
    },
    [],
  );

  // Update highlight area
  const updateHighlightArea = useCallback((data: HighlightAreaData | null) => {
    setHighlightArea(data);
  }, []);

  // Update page notes (rich text from NotesPage editor)
  // Uses Firebase Storage instead of Firestore for notes content
  const updatePageNotes = useCallback(
    (notes: string, newVersion: boolean = false) => {
      setPageNotes(notes);

      const documentId = documentIdRef.current;
      if (!documentId) {
        console.warn("Cannot save notes: documentId not available");
        return;
      }

      // Track pending notes for force save on unmount
      pendingNotesRef.current = { content: notes, newVersion };

      // Clear existing timeout
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
      }

      // Debounce save to Storage (3 seconds)
      notesSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await nextApiClient.put(`/open/documents/${documentId}/notes`, {
            content: notes,
            newVersion,
          });
          // Clear pending notes after successful save
          pendingNotesRef.current = null;
        } catch (error) {
          console.error("Error saving notes to Storage:", error);
        }
        notesSaveTimeoutRef.current = null;
      }, 3000);
    },
    [],
  );

  // Update notes storage key reference in Firestore (skips content upload)
  // Used when AI generates notes and already created the file in Storage
  const updateNotesStorageKey = useCallback(
    async (storageKey: string, notesContent: string) => {
      // Update local state with the content
      setPageNotes(notesContent);

      const documentId = documentIdRef.current;
      if (!documentId) {
        console.warn("Cannot update storage key: documentId not available");
        return;
      }

      // Clear any pending save timeout since we're updating to AI-generated content
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
        notesSaveTimeoutRef.current = null;
      }

      try {
        // Send both storageKey and content to ensure content is saved
        await nextApiClient.put(`/open/documents/${documentId}/notes`, {
          storageKey,
          content: notesContent,
        });
      } catch (error) {
        console.error("Error updating storage key reference:", error);
      }
    },
    [],
  );

  // Update isTranscribing state
  const updateIsTranscribing = useCallback((isTranscribing: boolean) => {
    setIsTranscribing(isTranscribing);
  }, []);

  // Helper to update a question within groups
  const updateQuestionInGroups = useCallback(
    (
      groups: QuestionGroup[],
      questionLegacyId: string,
      updater: (q: QuestionWithMarkingResult) => QuestionWithMarkingResult,
    ): QuestionGroup[] => {
      return groups.map((group) => ({
        ...group,
        questions: group.questions.map((q) =>
          q.legacyId === questionLegacyId
            ? updater(q as QuestionWithMarkingResult)
            : q,
        ),
      }));
    },
    [],
  );

  // Update question user answer
  const updateQuestionUserAnswer = useCallback(
    (
      questionLegacyId: string,
      answer: string | string[] | { left?: string; right?: string },
    ) => {
      setDocumentQuestionGroups((prev) => {
        const updated = updateQuestionInGroups(prev, questionLegacyId, (q) => ({
          ...q,
          userAnswer: answer,
        }));

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { questionGroups: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [updateQuestionInGroups],
  );

  // Update question canvas
  const updateQuestionCanvas = useCallback(
    (questionLegacyId: string, canvas: Canvas) => {
      setDocumentQuestionGroups((prev) => {
        const updated = updateQuestionInGroups(prev, questionLegacyId, (q) => ({
          ...q,
          canvas,
        }));

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { questionGroups: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [updateQuestionInGroups],
  );

  // Update question marking result
  const updateQuestionMarkingResult = useCallback(
    (questionLegacyId: string, markingResult: MarkingResult) => {
      setDocumentQuestionGroups((prev) => {
        const updated = updateQuestionInGroups(prev, questionLegacyId, (q) => ({
          ...q,
          ...markingResult,
        }));

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { questionGroups: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [updateQuestionInGroups],
  );

  // Update question decorations
  const updateQuestionDecorations = useCallback(
    (questionLegacyId: string, decorations: Decoration[]) => {
      setDocumentQuestionGroups((prev) => {
        const updated = updateQuestionInGroups(prev, questionLegacyId, (q) => ({
          ...q,
          decorations,
        }));

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { questionGroups: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [updateQuestionInGroups],
  );

  // Update question marked for review
  const updateQuestionMarkedForReview = useCallback(
    (questionLegacyId: string) => {
      setDocumentQuestionGroups((prev) => {
        const updated = updateQuestionInGroups(prev, questionLegacyId, (q) => ({
          ...q,
          isMarkedForReview: !q.isMarkedForReview,
        }));

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { questionGroups: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [updateQuestionInGroups],
  );

  // Retry question - clears marking data, and clears answer for closed types
  const retryQuestion = useCallback((questionLegacyId: string) => {
    // Question types where we should clear the user's answer (closed/MCQ types)
    const CLOSED_QUESTION_TYPES = [
      "mcq",
      "true_false",
      "mcq_multiple",
      "match_pair",
      "fill_in_the_gaps_text",
      "spot",
      "reorder",
      "group",
      "number",
    ];

    setDocumentQuestionGroups((prev) => {
      const updated = prev.map((group) => ({
        ...group,
        questions: group.questions.map((q) => {
          if (q.legacyId !== questionLegacyId) return q;

          const isClosedType = CLOSED_QUESTION_TYPES.includes(q.questionType);

          // Clear marking-related fields
          const clearedQuestion = {
            ...q,
            userMark: undefined,
            annotatedAnswer: undefined,
            markingTable: undefined,
            annotations: undefined,
            highlights: undefined,
            isMarked: false,
          };

          // For closed types, also clear the user's answer
          if (isClosedType) {
            return {
              ...clearedQuestion,
              userAnswer: undefined,
            };
          }

          // For open types, keep the user's answer so they can improve it
          return clearedQuestion;
        }),
      }));

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { questionGroups: updated },
          timestamp: Date.now(),
        },
      ]);

      return updated;
    });
  }, []);

  // Add new question groups to the document
  const addDocumentQuestionGroups = useCallback(
    (newGroups: QuestionGroup[]) => {
      setDocumentQuestionGroups((prev) => {
        // Generate new IDs for the groups
        const maxGroupId = prev.reduce((max, g) => Math.max(max, g.id || 0), 0);
        const groupsWithIds = newGroups.map((g, i) => ({
          ...g,
          id: maxGroupId + i + 1,
          order: maxGroupId + i + 1,
          legacyId: g.legacyId || `generated-group-${Date.now()}-${i + 1}`,
        }));

        const updated = [...prev, ...groupsWithIds];

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { questionGroups: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Update document name (for sidebar display and header)
  const updateDocumentName = useCallback(
    async (newName: string) => {
      const documentId = documentIdRef.current;

      // Use "New Document" if name is empty
      const displayName = newName.trim() || "New Document";

      console.log("📝 updateDocumentName called:", {
        documentId,
        newName,
        displayName,
        hasRenameFunction: !!renameDocumentInSidebar,
      });

      if (!documentId) {
        console.warn("❌ No documentId available");
        return;
      }

      // Update session title for header display
      setSessionData((prev) =>
        prev ? { ...prev, sessionTitle: displayName } : prev,
      );

      try {
        // Update sidebar state optimistically using the context function
        if (renameDocumentInSidebar) {
          console.log("✅ Calling renameDocumentInSidebar");
          await renameDocumentInSidebar(documentId, displayName);
          console.log("✅ renameDocumentInSidebar completed");
        } else {
          // Fallback: direct API call if sidebar context not available
          console.log("⚠️ Using fallback API call");
          await nextApiClient.put(`/open/documents/${documentId}`, {
            name: displayName,
          });
          console.log("✅ Fallback API call completed");
        }
      } catch (error) {
        console.error("❌ Error updating document name:", error);
      }
    },
    [renameDocumentInSidebar],
  );

  // Initialize flashcard deck
  const initializeFlashcardDeck = useCallback(
    (title: string, sourceDocumentIds: string[] = []) => {
      const now = new Date().toISOString();
      const newDeck: FlashcardDeck = {
        id: uuidv7(),
        title,
        sourceDocumentIds,
        cards: [],
        sessionHistory: [],
        createdAt: now,
        updatedAt: now,
      };

      setFlashcardDeck(newDeck);

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { flashcardDeck: newDeck },
          timestamp: Date.now(),
        },
      ]);

      return newDeck;
    },
    [],
  );

  // Add a flashcard
  const addFlashcard = useCallback(
    (card: Omit<Flashcard, "id" | "order" | "createdAt" | "updatedAt">) => {
      setFlashcardDeck((prev) => {
        if (!prev) return prev;

        const now = new Date().toISOString();
        const newCard: Flashcard = {
          ...card,
          id: uuidv7(),
          order: prev.cards.length,
          createdAt: now,
          updatedAt: now,
        };

        const updated: FlashcardDeck = {
          ...prev,
          cards: [...prev.cards, newCard],
          updatedAt: now,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { flashcardDeck: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Update a flashcard
  const updateFlashcard = useCallback(
    (cardId: string, updates: Partial<Omit<Flashcard, "id" | "createdAt">>) => {
      setFlashcardDeck((prev) => {
        if (!prev) return prev;

        const now = new Date().toISOString();
        const updated: FlashcardDeck = {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === cardId ? { ...c, ...updates, updatedAt: now } : c,
          ),
          updatedAt: now,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { flashcardDeck: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Delete a flashcard
  const deleteFlashcard = useCallback((cardId: string) => {
    setFlashcardDeck((prev) => {
      if (!prev) return prev;

      const now = new Date().toISOString();
      const filteredCards = prev.cards.filter((c) => c.id !== cardId);
      // Re-order remaining cards
      const reorderedCards = filteredCards.map((c, idx) => ({
        ...c,
        order: idx,
      }));

      const updated: FlashcardDeck = {
        ...prev,
        cards: reorderedCards,
        updatedAt: now,
      };

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { flashcardDeck: updated },
          timestamp: Date.now(),
        },
      ]);

      return updated;
    });
  }, []);

  // Reorder flashcards
  const reorderFlashcards = useCallback((cardIds: string[]) => {
    setFlashcardDeck((prev) => {
      if (!prev) return prev;

      const now = new Date().toISOString();
      const cardMap = new Map(prev.cards.map((c) => [c.id, c]));
      const reorderedCards = cardIds
        .map((id, idx) => {
          const card = cardMap.get(id);
          return card ? { ...card, order: idx } : null;
        })
        .filter((c): c is Flashcard => c !== null);

      const updated: FlashcardDeck = {
        ...prev,
        cards: reorderedCards,
        updatedAt: now,
      };

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { flashcardDeck: updated },
          timestamp: Date.now(),
        },
      ]);

      return updated;
    });
  }, []);

  // Update deck metadata
  const updateFlashcardDeckMeta = useCallback(
    (updates: Partial<Pick<FlashcardDeck, "title" | "description">>) => {
      setFlashcardDeck((prev) => {
        if (!prev) return prev;

        const now = new Date().toISOString();
        const updated: FlashcardDeck = {
          ...prev,
          ...updates,
          updatedAt: now,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { flashcardDeck: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Record study event on a card
  const recordFlashcardStudyEvent = useCallback(
    (cardId: string, event: Omit<FlashcardStudyEvent, "timestamp">) => {
      setFlashcardDeck((prev) => {
        if (!prev) return prev;

        const now = new Date().toISOString();
        const studyEvent: FlashcardStudyEvent = {
          ...event,
          timestamp: now,
        };

        const updated: FlashcardDeck = {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === cardId
              ? { ...c, studyHistory: [...c.studyHistory, studyEvent] }
              : c,
          ),
          updatedAt: now,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { flashcardDeck: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Start a study session
  const startFlashcardSession = useCallback((shuffle: boolean) => {
    setFlashcardDeck((prev) => {
      if (!prev || prev.cards.length === 0) return prev;

      const now = new Date().toISOString();
      const cardOrder = prev.cards.map((c) => c.id);
      if (shuffle) {
        // Fisher-Yates shuffle
        for (let i = cardOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]];
        }
      }

      const updated: FlashcardDeck = {
        ...prev,
        currentSession: {
          sessionId: uuidv7(),
          startedAt: now,
          isShuffled: shuffle,
          cardOrder,
          currentIndex: 0,
        },
        updatedAt: now,
      };

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { flashcardDeck: updated },
          timestamp: Date.now(),
        },
      ]);

      return updated;
    });
  }, []);

  // End study session
  const endFlashcardSession = useCallback(
    (goodCount: number, againCount: number) => {
      setFlashcardDeck((prev) => {
        if (!prev || !prev.currentSession) return prev;

        const now = new Date().toISOString();
        const sessionRecord: StudySessionRecord = {
          sessionId: prev.currentSession.sessionId,
          startedAt: prev.currentSession.startedAt,
          completedAt: now,
          isShuffled: prev.currentSession.isShuffled,
          totalCards: prev.currentSession.cardOrder.length,
          goodCount,
          againCount,
        };

        const updated: FlashcardDeck = {
          ...prev,
          currentSession: undefined,
          sessionHistory: [...prev.sessionHistory, sessionRecord],
          updatedAt: now,
        };

        // Queue save
        setPendingSaves((saves) => [
          ...saves,
          {
            data: { flashcardDeck: updated },
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    [],
  );

  // Advance to next card in session
  const advanceFlashcardSession = useCallback(() => {
    setFlashcardDeck((prev) => {
      if (!prev || !prev.currentSession) return prev;

      const updated: FlashcardDeck = {
        ...prev,
        currentSession: {
          ...prev.currentSession,
          currentIndex: prev.currentSession.currentIndex + 1,
        },
      };

      // Queue save
      setPendingSaves((saves) => [
        ...saves,
        {
          data: { flashcardDeck: updated },
          timestamp: Date.now(),
        },
      ]);

      return updated;
    });
  }, []);

  return {
    sessionData,
    documentNotes,
    updateDocumentNotes,
    documentCanvases,
    updateDocumentCanvas,
    documentHighlights,
    updateDocumentHighlights,
    documentQuestionGroups,
    addDocumentQuestionGroups,
    updateQuestionUserAnswer,
    updateQuestionCanvas,
    updateQuestionMarkingResult,
    updateQuestionDecorations,
    updateQuestionMarkedForReview,
    retryQuestion,
    allPagesText,
    updateAllPagesText,
    currentPageText,
    updateCurrentPageText,
    selectedText,
    updateSelectedText,
    currentSkill,
    updateCurrentSkill,
    currentSkillPrompt,
    updateCurrentSkillPrompt,
    documentTranscription,
    updateDocumentTranscription,
    highlightArea,
    updateHighlightArea,
    pageNotes,
    updatePageNotes,
    updateNotesStorageKey,
    updateDocumentName,
    isLoading,
    isTranscribing,
    updateIsTranscribing,
    isGeneratingQuestions,
    isGeneratingFlashcards,
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
  };
};
