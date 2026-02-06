import { DocumentNote } from "@/app/(protected)/open/_hooks/useSessionOpen";
import { SourceReference } from "@/app/(protected)/open/_types/content";
import {
  Flashcard,
  FlashcardDeck,
} from "@/app/(protected)/open/_types/flashcardTypes";
import {
  InputMode,
  MockPage,
  QuestionSessionPageType,
  SessionType,
  TextbookContent,
} from "@/app/(protected)/sessions/types";
import {
  Canvas,
  CanvasMessage,
  Decoration,
  FloatingMessage,
  MarkingContext,
  MarkingResult,
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import React from "react";
import { Socket } from "socket.io-client";
import DocumentPage from "./DocumentPage";
import FlashcardsPage from "./FlashcardsPage";
import NotesPage from "./NotesPage";
import OpenQuestionPage from "./OpenQuestionPage";

type PageRendererProps = {
  page: MockPage;
  currentPageIndex: number;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  updateQuestionUserAnswer: (
    questionGroupId: number,
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string },
  ) => void;
  updateQuestionCanvas: (
    questionGroupId: number,
    questionLegacyId: string,
    canvas: Canvas,
  ) => void;
  updateQuestionDecorations: (
    questionGroupId: number,
    questionLegacyId: string,
    decorations: Decoration[],
  ) => void;
  isReadOnly: boolean;
  handleSendMessageRef: React.MutableRefObject<
    ((message: string) => void) | null
  >;
  canvasMessage?: CanvasMessage[] | undefined;
  isAwaitingResponse: boolean;
  isMarking: boolean;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  highlightedText: string[];
  handleMarkAnswer: (markingContext: MarkingContext) => void;
  isAiChatOpen: boolean;
  floatingMessage?: FloatingMessage;
  isSolveTogether: boolean;
  isOnLastSegment: boolean;
  updateQuestionMarkedForReview: (
    questionGroupId: number,
    questionLegacyId: string,
  ) => void;
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  sessionType: SessionType;
  subjectId?: string;
  lessonId?: string;
  paperId?: string;
  aiDecorations: Decoration[];
  setAiDecorations: (decorations: Decoration[]) => void;
  setFloatingMessage: (
    message:
      | {
          text: string;
          targetText: string;
          targetAction: string;
          targetIndex?: number;
        }
      | undefined,
  ) => void;
  isStepsActive: boolean;
  setIsStepsActive: (active: boolean) => void;
  pages: MockPage[];
  handleSetCurrentPageIndex?: (index: number) => void;
  sessionTitle: string;
  sessionSubtitle: string;
  isCalculatorOpen: boolean;
  isAnnotating: boolean;
  updateQuestionDesmosExpressions: (
    questionGroupId: number,
    questionLegacyId: string,
    expressions: unknown[],
  ) => void;
  setCurrentStepIndex: (step: number | undefined) => void;
  currentStepIndex: number;
  // Breakdown footer prop setters
  setBreakdownButtonText: (text: string | undefined) => void;
  setBreakdownButtonState: (state: "filled" | "greyed" | undefined) => void;
  setBreakdownIsDisabled: (disabled: boolean | undefined) => void;
  setBreakdownOnClick: (onClick: (() => void) | undefined) => void;
  setBreakdownIsMarked: (marked: boolean | undefined) => void;
  setBreakdownUserMark: (mark: number | undefined) => void;
  setBreakdownMaxMark: (mark: number | undefined) => void;
  setBreakdownIsMarking: (marking: boolean | undefined) => void;
  // Question highlight page props
  isQuestionStemHighlighted: boolean;
  isQuestionPartHighlighted: boolean;
  highlightedQuestionPartIndex: number;
  handleRetryQuestion: (
    questionGroupId: number,
    questionLegacyId: string,
  ) => void;
  scrollToNextQuestionRef: React.MutableRefObject<(() => void) | null>;
  registerDesmosRef?: (
    id: string,
    ref: any,
    isReadOnly: boolean,
    index: number,
  ) => void;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeIndex: number,
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeIndex: number) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
  getIsQuestionReadOnly?: (questionLegacyId: string) => boolean;
  mathCanvasMode: "drawing" | "textbox";
  pageType?: QuestionSessionPageType;
  setPageType?: (type: QuestionSessionPageType) => void;
  targetPdfPage?: number | null;
  setTargetPdfPage?: (page: number | null) => void;
  targetHighlightText?: string | null;
  setTargetHighlightText?: (text: string | null) => void;
  documentNotes?: { [page: number]: string };
  updateDocumentNotes?: (pageNumber: number, notes: string) => void;
  documentCanvases?: { [page: number]: Canvas };
  updateDocumentCanvas?: (pageNumber: number, canvas: Canvas) => void;
  documentHighlights?: { [page: number]: DocumentNote[] };
  updateDocumentHighlights?: (
    pageNumber: number,
    highlights: DocumentNote[],
  ) => void;
  updateSelectedText?: (text: string | null) => void;
  highlightArea?: {
    label: string;
    box_2d: [number, number, number, number];
    show: boolean;
  } | null;
  onPdfPageChange?: (pageNumber: number) => void;
  documentId?: string;
  thumbnailUrl?: string;
  onEditNotes?: (textToReplace: string, newText: string) => void;
  setEditNotesRef?: (
    fn: ((textToReplace: string, newText: string) => void) | null,
  ) => void;
  onRewriteNotes?: (newContent: string) => void;
  setRewriteNotesRef?: (
    fn:
      | ((newContent: string) => Promise<{ success: boolean; error?: string }>)
      | null,
  ) => void;
  setRewriteStreamRef?: (
    fn: {
      addChunk: (chunk: string) => void;
      end: () => void;
    } | null,
  ) => void;
  setAddCommentRef?: (
    fn: ((text: string, comment: string) => void) | null,
  ) => void;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  setCancelAnimationRef?: (fn: (() => void) | null) => void;
  pageNotes?: string;
  updatePageNotes?: (notes: string) => void;
  updateNotesStorageKey?: (
    storageKey: string,
    notesContent: string,
  ) => Promise<void>;
  isLoadingPage?: boolean;
  pageTitle?: string;
  updatePageTitle?: (title: string) => void;
  documentName?: string;
  updateDocumentName?: (name: string) => void;
  /** Storage path (gs://) of the source PDF document for notes generation */
  sourceDocumentStoragePath?: string;
  /** Full Firestore path to the Note document for automatic metadata update */
  noteDocumentPath?: string;
  handleGenerateQuestions?: () => Promise<void>;
  onSendMessage?: (message: string) => void;
  documentQuestionGroups?: QuestionGroup[];
  updateDocumentQuestionUserAnswer?: (
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string },
  ) => void;
  updateDocumentQuestionCanvas?: (
    questionLegacyId: string,
    canvas: Canvas,
  ) => void;
  updateDocumentQuestionMarkingResult?: (
    questionLegacyId: string,
    markingResult: MarkingResult,
  ) => void;
  updateDocumentQuestionDecorations?: (
    questionLegacyId: string,
    decorations: Decoration[],
  ) => void;
  updateDocumentQuestionMarkedForReview?: (questionLegacyId: string) => void;
  // Flashcard props
  flashcardDeck?: FlashcardDeck | null;
  initializeFlashcardDeck?: (
    title: string,
    sourceDocumentIds?: string[],
  ) => FlashcardDeck;
  addFlashcard?: (
    card: Omit<Flashcard, "id" | "order" | "createdAt" | "updatedAt">,
  ) => void;
  updateFlashcard?: (
    cardId: string,
    updates: Partial<Omit<Flashcard, "id" | "createdAt">>,
  ) => void;
  deleteFlashcard?: (cardId: string) => void;
  reorderFlashcards?: (cardIds: string[]) => void;
  updateFlashcardDeckMeta?: (
    updates: Partial<Pick<FlashcardDeck, "title" | "description">>,
  ) => void;
  recordFlashcardStudyEvent?: (
    cardId: string,
    event: { quality: "good" | "again"; responseTimeMs?: number },
  ) => void;
  startFlashcardSession?: (shuffle: boolean) => void;
  endFlashcardSession?: (goodCount: number, againCount: number) => void;
  advanceFlashcardSession?: () => void;
  // Source references for notes/practice/flashcards documents
  sourceReferences?: SourceReference[];
  // Callback when document orientation changes (landscape vs portrait)
  onLandscapeChange?: (isLandscape: boolean) => void;
  // Auto-start notes generation (triggered from Header Summary button)
  autoStartNotesGeneration?: boolean;
  onNotesGenerationStarted?: () => void;
  // Bottom padding to avoid toolbar overlap
  toolbarHeight?: number;
};
const PageRenderer = React.forwardRef<HTMLDivElement, PageRendererProps>(
  (
    {
      page,
      currentPageIndex,
      inputMode,
      setInputMode,
      updateQuestionUserAnswer,
      updateQuestionCanvas,
      updateQuestionDecorations,
      isReadOnly,
      handleSendMessageRef,
      canvasMessage,
      isAwaitingResponse,
      isMarking,
      shimmerTextboxIndices = [],
      fadeInTextboxIndices = [],
      highlightedText,
      handleMarkAnswer,
      isAiChatOpen,
      floatingMessage,
      isSolveTogether,
      isOnLastSegment,
      updateQuestionMarkedForReview,
      socket,
      socketError,
      setSocketError,
      sessionType,
      subjectId,
      lessonId,
      paperId,
      aiDecorations,
      setAiDecorations,
      setFloatingMessage,
      isStepsActive,
      setIsStepsActive,
      setCurrentStepIndex,
      currentStepIndex,
      pages,
      handleSetCurrentPageIndex,
      sessionTitle,
      sessionSubtitle,
      isCalculatorOpen,
      isAnnotating,
      updateQuestionDesmosExpressions,
      // Breakdown footer prop setters
      setBreakdownButtonText,
      setBreakdownButtonState,
      setBreakdownIsDisabled,
      setBreakdownOnClick,
      setBreakdownIsMarked,
      setBreakdownUserMark,
      setBreakdownMaxMark,
      setBreakdownIsMarking,
      isQuestionStemHighlighted,
      isQuestionPartHighlighted,
      highlightedQuestionPartIndex,
      handleRetryQuestion,
      scrollToNextQuestionRef,
      registerDesmosRef,
      onStrokeAdded,
      onStrokeRemoved,
      onEraseAction,
      getIsQuestionReadOnly,
      mathCanvasMode,
      pageType,
      setPageType,
      targetPdfPage,
      setTargetPdfPage,
      targetHighlightText,
      setTargetHighlightText,
      documentNotes,
      updateDocumentNotes,
      documentCanvases,
      updateDocumentCanvas,
      documentHighlights,
      updateDocumentHighlights,
      updateSelectedText,
      highlightArea,
      onPdfPageChange,
      documentId,
      thumbnailUrl,
      onEditNotes,
      setEditNotesRef,
      onRewriteNotes,
      setRewriteNotesRef,
      setRewriteStreamRef,
      setAddCommentRef,
      onAnimationStateChange,
      setCancelAnimationRef,
      pageNotes,
      updatePageNotes,
      updateNotesStorageKey,
      isLoadingPage,
      pageTitle,
      updatePageTitle,
      documentName,
      updateDocumentName,
      sourceDocumentStoragePath,
      noteDocumentPath,
      handleGenerateQuestions,
      onSendMessage,
      documentQuestionGroups,
      updateDocumentQuestionUserAnswer,
      updateDocumentQuestionCanvas,
      updateDocumentQuestionMarkingResult,
      updateDocumentQuestionDecorations,
      updateDocumentQuestionMarkedForReview,
      // Flashcard props
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
      sourceReferences,
      onLandscapeChange,
      autoStartNotesGeneration,
      onNotesGenerationStarted,
      toolbarHeight = 0,
    },
    ref,
  ) => {
    // Ensure scroll-to-top on page index change without forcing remounts
    React.useEffect(() => {
      const getContainer = (): HTMLDivElement | null => {
        if (!ref) return null;
        if (typeof ref === "function") return null;
        return (ref as React.RefObject<HTMLDivElement | null>).current;
      };

      const container = getContainer();
      if (!container) return;

      // Scroll primary container
      container.scrollTop = 0;

      // Also attempt to reset any inner scrollable regions
      const innerScrollers = container.querySelectorAll(
        ".overflow-y-auto, .overflow-y-scroll",
      );
      innerScrollers.forEach((el) => {
        (el as HTMLElement).scrollTop = 0;
      });
    }, [currentPageIndex, ref]);
    console.log("pageType", pageType);
    console.log("page.type", page.type);
    return (
      <div
        ref={ref}
        className="flex flex-col justify-start items-center flex-1 overflow-y-auto h-full relative"
        data-session-scroll-container
        // style={{
        //   ...(typeof window !== "undefined" && window.innerWidth >= 768
        //     ? {
        //       backgroundImage: "radial-gradient(#F0F0F0 2px, transparent 0)",
        //       backgroundSize: "32px 32px",
        //       backgroundPosition: "0 0",
        //       position: "relative",
        //       overflow: "hidden",
        //     }
        //     : {}),
        // }}
      >
        <>
          {pageType === QuestionSessionPageType.Document && (
            <div className={`absolute inset-0 w-full h-full flex flex-col`}>
              <DocumentPage
                content={page.content as TextbookContent}
                inputMode={inputMode}
                setInputMode={setInputMode}
                targetPdfPage={targetPdfPage ?? undefined}
                flashHighlightText={targetHighlightText ?? undefined}
                flashHighlightPage={targetPdfPage ?? undefined}
                documentNotes={documentNotes}
                updateDocumentNotes={updateDocumentNotes}
                documentCanvases={documentCanvases}
                updateDocumentCanvas={updateDocumentCanvas}
                documentHighlights={documentHighlights}
                updateDocumentHighlights={updateDocumentHighlights}
                highlightArea={highlightArea}
                onPdfPageChange={(pageNumber: number) => {
                  console.log("[CITE-PAGE] DocumentPage page change", {
                    pageNumber,
                    targetPdfPage,
                    targetHighlightText: targetHighlightText?.slice(0, 80),
                  });
                  onPdfPageChange?.(pageNumber);
                }}
                documentId={documentId}
                thumbnailUrl={thumbnailUrl}
                documentName={documentName}
                updateDocumentName={updateDocumentName}
                setAddCommentRef={setAddCommentRef}
                isVisible={
                  pageType === QuestionSessionPageType.Document ||
                  (!pageType && page.type === QuestionSessionPageType.Document)
                }
                onLandscapeChange={onLandscapeChange}
                toolbarHeight={toolbarHeight}
              />
            </div>
          )}
          {pageType === QuestionSessionPageType.Notes && (
            <div className={`absolute inset-0 w-full h-full flex flex-col`}>
              <NotesPage
                content={page.content as TextbookContent}
                inputMode={inputMode}
                setInputMode={setInputMode}
                openDocumentAtPage={(pageNum: number, sourceText: string) => {
                  setTargetHighlightText?.(sourceText || null);
                  setTargetPdfPage?.(pageNum);
                  setPageType?.(QuestionSessionPageType.Document);
                }}
                onEditNotes={onEditNotes}
                setEditNotesRef={setEditNotesRef}
                onRewriteNotes={onRewriteNotes}
                setRewriteNotesRef={setRewriteNotesRef}
                setRewriteStreamRef={setRewriteStreamRef}
                onAnimationStateChange={onAnimationStateChange}
                setCancelAnimationRef={setCancelAnimationRef}
                pageNotes={pageNotes}
                updatePageNotes={updatePageNotes}
                updateNotesStorageKey={updateNotesStorageKey}
                isLoadingPage={isLoadingPage}
                pageTitle={pageTitle}
                updatePageTitle={updatePageTitle}
                documentName={documentName}
                updateDocumentName={updateDocumentName}
                updateSelectedText={updateSelectedText}
                sourceDocumentStoragePath={sourceDocumentStoragePath}
                noteDocumentPath={noteDocumentPath}
                sourceReferences={sourceReferences}
                documentId={documentId}
                autoStartGeneration={autoStartNotesGeneration}
                onGenerationStarted={onNotesGenerationStarted}
                toolbarHeight={toolbarHeight}
              />
            </div>
          )}
          {pageType === QuestionSessionPageType.Practice && (
            <div className={`absolute inset-0 w-full h-full flex flex-col `}>
              {/* <PracticePage
              content={page.content as TextbookContent}
              inputMode={inputMode}
              setInputMode={setInputMode}
              handleGenerateQuestions={handleGenerateQuestions}
            /> */}
              <OpenQuestionPage
                currentPageIndex={currentPageIndex}
                questionGroup={
                  page.content as QuestionGroup & {
                    questions: QuestionWithMarkingResult[];
                  }
                }
                inputMode={inputMode}
                setInputMode={setInputMode}
                updateQuestionUserAnswer={updateQuestionUserAnswer}
                updateQuestionCanvas={updateQuestionCanvas}
                updateQuestionDecorations={updateQuestionDecorations}
                isReadOnly={isReadOnly}
                highlightedText={highlightedText}
                handleSendMessage={(message) => {
                  if (handleSendMessageRef.current) {
                    handleSendMessageRef.current(message);
                  }
                }}
                canvasMessage={canvasMessage}
                shimmerTextboxIndices={shimmerTextboxIndices}
                fadeInTextboxIndices={fadeInTextboxIndices}
                handleMarkAnswer={handleMarkAnswer}
                isAiChatOpen={isAiChatOpen}
                floatingMessage={floatingMessage}
                isAwaitingResponse={isAwaitingResponse}
                isSolveTogether={isSolveTogether}
                isOnLastSegment={isOnLastSegment}
                updateQuestionMarkedForReview={updateQuestionMarkedForReview}
                socket={socket}
                socketError={socketError}
                setSocketError={setSocketError}
                sessionType={sessionType}
                subjectId={subjectId}
                lessonId={lessonId}
                paperId={paperId}
                aiDecorations={aiDecorations}
                setAiDecorations={setAiDecorations}
                setFloatingMessage={setFloatingMessage}
                isStepsActive={isStepsActive}
                setIsStepsActive={setIsStepsActive}
                isCalculatorOpen={isCalculatorOpen}
                isAnnotating={isAnnotating}
                // Breakdown footer prop setters
                setBreakdownButtonText={setBreakdownButtonText}
                setBreakdownButtonState={setBreakdownButtonState}
                setBreakdownIsDisabled={setBreakdownIsDisabled}
                setBreakdownOnClick={setBreakdownOnClick}
                setBreakdownIsMarked={setBreakdownIsMarked}
                setBreakdownUserMark={setBreakdownUserMark}
                setBreakdownMaxMark={setBreakdownMaxMark}
                setBreakdownIsMarking={setBreakdownIsMarking}
                setCurrentStepIndex={setCurrentStepIndex}
                currentStepIndex={currentStepIndex}
                updateQuestionDesmosExpressions={
                  updateQuestionDesmosExpressions
                }
                isQuestionStemHighlighted={isQuestionStemHighlighted}
                isQuestionPartHighlighted={isQuestionPartHighlighted}
                highlightedQuestionPartIndex={highlightedQuestionPartIndex}
                handleRetryQuestion={handleRetryQuestion}
                scrollToNextUnansweredQuestion={scrollToNextQuestionRef}
                registerDesmosRef={registerDesmosRef}
                onStrokeAdded={onStrokeAdded}
                onStrokeRemoved={onStrokeRemoved}
                onEraseAction={onEraseAction}
                getIsQuestionReadOnly={getIsQuestionReadOnly}
                mathCanvasMode={mathCanvasMode}
                documentQuestionGroups={documentQuestionGroups}
                updateDocumentQuestionUserAnswer={
                  updateDocumentQuestionUserAnswer
                }
                updateDocumentQuestionCanvas={updateDocumentQuestionCanvas}
                updateDocumentQuestionMarkingResult={
                  updateDocumentQuestionMarkingResult
                }
                updateDocumentQuestionDecorations={
                  updateDocumentQuestionDecorations
                }
                updateDocumentQuestionMarkedForReview={
                  updateDocumentQuestionMarkedForReview
                }
                isMarking={isMarking}
                toolbarHeight={toolbarHeight}
              />
            </div>
          )}
          {pageType === QuestionSessionPageType.Flashcards && (
            <div className="absolute inset-0 w-full h-full flex flex-col">
              <FlashcardsPage
                flashcardDeck={flashcardDeck ?? null}
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
                openDocumentAtPage={(pageIndex, sourceText) => {
                  setTargetHighlightText?.(sourceText || null);
                  setTargetPdfPage?.(pageIndex + 1); // Convert 0-indexed to 1-indexed
                  setPageType?.(QuestionSessionPageType.Document);
                }}
                setPageType={setPageType}
                documentId={documentId}
                toolbarHeight={toolbarHeight}
              />
            </div>
          )}
        </>

        {/* {page.type === QuestionSessionPageType.Cover && (
          <CoverPage content={page.content as CoverContent} paperId={paperId} />
        )}
        {page.type === QuestionSessionPageType.Textbook && (
          <TextbookPage content={page.content as TextbookContent} />
        )} */}
        {/* {page.type === QuestionSessionPageType.Question && (
          <>
            {(page.content as QuestionGroup).questions.length === 0 ? (
              <div className="flex justify-center items-center py-20">
                <Spinner />
              </div>
            ) : (
              <>
                <QuestionPage
                  currentPageIndex={currentPageIndex}
                  questionGroup={
                    page.content as QuestionGroup & {
                      questions: QuestionWithMarkingResult[];
                    }
                  }
                  inputMode={inputMode}
                  setInputMode={setInputMode}
                  updateQuestionUserAnswer={updateQuestionUserAnswer}
                  updateQuestionCanvas={updateQuestionCanvas}
                  updateQuestionDecorations={updateQuestionDecorations}
                  isReadOnly={isReadOnly}
                  highlightedText={highlightedText}
                  handleSendMessage={(message) => {
                    if (handleSendMessageRef.current) {
                      handleSendMessageRef.current(message);
                    }
                  }}
                  canvasMessage={canvasMessage}
                  shimmerTextboxIndices={shimmerTextboxIndices}
                  fadeInTextboxIndices={fadeInTextboxIndices}
                  handleMarkAnswer={handleMarkAnswer}
                  isAiChatOpen={isAiChatOpen}
                  floatingMessage={floatingMessage}
                  isAwaitingResponse={isAwaitingResponse}
                  isSolveTogether={isSolveTogether}
                  isOnLastSegment={isOnLastSegment}
                  updateQuestionMarkedForReview={updateQuestionMarkedForReview}
                  socket={socket}
                  socketError={socketError}
                  setSocketError={setSocketError}
                  sessionType={sessionType}
                  subjectId={subjectId}
                  lessonId={lessonId}
                  paperId={paperId}
                  aiDecorations={aiDecorations}
                  setAiDecorations={setAiDecorations}
                  setFloatingMessage={setFloatingMessage}
                  isStepsActive={isStepsActive}
                  setIsStepsActive={setIsStepsActive}
                  isCalculatorOpen={isCalculatorOpen}
                  isAnnotating={isAnnotating}
                  // Breakdown footer prop setters
                  setBreakdownButtonText={setBreakdownButtonText}
                  setBreakdownButtonState={setBreakdownButtonState}
                  setBreakdownIsDisabled={setBreakdownIsDisabled}
                  setBreakdownOnClick={setBreakdownOnClick}
                  setBreakdownIsMarked={setBreakdownIsMarked}
                  setBreakdownUserMark={setBreakdownUserMark}
                  setBreakdownMaxMark={setBreakdownMaxMark}
                  setBreakdownIsMarking={setBreakdownIsMarking}
                  setCurrentStepIndex={setCurrentStepIndex}
                  currentStepIndex={currentStepIndex}
                  updateQuestionDesmosExpressions={
                    updateQuestionDesmosExpressions
                  }
                  isQuestionStemHighlighted={isQuestionStemHighlighted}
                  isQuestionPartHighlighted={isQuestionPartHighlighted}
                  highlightedQuestionPartIndex={highlightedQuestionPartIndex}
                  handleRetryQuestion={handleRetryQuestion}
                  scrollToNextUnansweredQuestion={scrollToNextQuestionRef}
                  registerDesmosRef={registerDesmosRef}
                  onStrokeAdded={onStrokeAdded}
                  onStrokeRemoved={onStrokeRemoved}
                  onEraseAction={onEraseAction}
                  getIsQuestionReadOnly={getIsQuestionReadOnly}
                  mathCanvasMode={mathCanvasMode}
                />
                <div className="overflow-hidden top-0 left-0 right-0 bottom-0 z-[10000] w-full h-full absolute pointer-events-none">
                  <ShimmerEffect isVisible={isAwaitingResponse || isMarking} />
                </div>
              </>
            )}
          </>
        )} */}
        {/* {page.type === QuestionSessionPageType.Review && (
          <ReviewPage
            pages={pages}
            handleSetCurrentPageIndex={handleSetCurrentPageIndex}
            sessionTitle={sessionTitle}
            sessionSubtitle={sessionSubtitle}
            isReadOnly={isReadOnly}
          />
        )} */}
      </div>
    );
  },
);

PageRenderer.displayName = "PageRenderer";

export default PageRenderer;
