"use client";

import PageRenderer from "@/app/(protected)/sessions/components/PageRenderer";
import Header from "@/app/(protected)/sessions/components/header/Header";
import Footer from "@/app/(protected)/sessions/components/footer/Footer";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSession, SaveState } from "../hooks/useSession";
import {
  InputMode,
  LearnContent,
  LearnFlowBlock,
  MasteryScore,
  QuestionSessionPageType,
  SessionData,
  SessionType,
} from "../types";
import { useRouter } from "next/navigation";
import {
  CanvasMessage,
  Decoration,
  FloatingMessage,
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import AiGroupCard, {
  AiGroupCardRef,
} from "@/app/(protected)/sessions/components/AiGroupCard";
import LearnAiSidebar from "@/app/(protected)/sessions/components/LearnAiSidebar";
import { toast } from "sonner";
import PostPracticeModal from "./PostPracticeModal";
import ExitConfirmationModal from "@/app/(protected)/sessions/components/modals/ExitConfirmationModal";
import Spinner from "@/app/_components/Spinner";
import { useMarkingGroup } from "../hooks/useMarkingGroup";
import { useSocket } from "@/app/_hooks/useSocket";
import SpeechBubble from "./question-components/canvas/AiMessageBubbleFloaty";
import { useUser } from "@/app/_context/UserProvider";
import LoadingScreen from "@/app/_components/LoadingScreen";
import { updateNumberOfStars } from "../utils";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import FrameContainer from "./question-components/FrameContainer";
import { useTutorialTooltip } from "@/app/_hooks/useTutorialTooltip";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useFeatureUsage } from "@/app/_hooks/useFeatureUsage";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import LockOverlay from "@/app/_components/LockOverlay";
import { useMedlyChatTutorial } from "@/app/_hooks/useMedlyChatTutorial";
import { useSubject } from "@/app/_hooks/useSubject";
import { useSubjectTheme } from "@/app/_hooks/useSubjectTheme";
import { lessonIdToSubjectId } from "@/app/_lib/utils/utils";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import BottomSheet from "./BottomSheet";
import moment from "moment";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import GettingStartedPopover from "@/app/_components/sidebar/components/GettingStartedPopover";
import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";
import { useQueryClient } from "@tanstack/react-query";
import { MOCKS_DATA_QUERY_KEY } from "@/app/_hooks/useMocksData";

// Helper function to apply fallback marking for mock sessions after results day
const applyFallbackMarking = (
  question: QuestionWithMarkingResult,
  sessionType: SessionType,
  isAfterResultsDay: boolean,
  retriedQuestions: Set<string>
): QuestionWithMarkingResult => {
  // Only apply to mock sessions after results day
  if (sessionType !== SessionType.MockSession || !isAfterResultsDay) {
    return question;
  }

  // If question is being retried, don't apply fallback marking
  if (retriedQuestions.has(question.legacyId)) {
    return question;
  }

  // If question is already marked, use actual marking data
  if (question.isMarked) {
    return question;
  }

  // Apply fallback marking: treat as marked with 0 marks
  return {
    ...question,
    isMarked: true,
    userMark: 0,
  };
};

// Helper to apply fallback marking to a page
const applyFallbackMarkingToPage = (
  page: any,
  sessionType: SessionType,
  isAfterResultsDay: boolean,
  retriedQuestions: Set<string>
): any => {
  if (
    page.content &&
    typeof page.content === "object" &&
    "questions" in page.content
  ) {
    return {
      ...page,
      content: {
        ...page.content,
        questions: (page.content.questions as QuestionWithMarkingResult[]).map(
          (q) =>
            applyFallbackMarking(
              q,
              sessionType,
              isAfterResultsDay,
              retriedQuestions
            )
        ),
      },
    };
  }
  return page;
};
import CloseIcon from "@/app/_components/icons/CloseIcon";
import PaperTutorialModal from "@/app/(protected)/sessions/components/modals/PaperTutorialModal";
import ResultsModal from "@/app/(protected)/sessions/components/modals/results-modal/ResultsModal";
import SwipeTutorial from "@/app/(protected)/sessions/components/SwipeTutorial";
// import { useUserSubjects } from "@/app/_hooks/useUserSubjects";
// import { useUpdateSubjects } from "@/app/_hooks/useUpdateSubjects";
// import { getGradeScale } from "@/app/(protected)/onboarding/_utils/gradeScales";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";
import { useLastLessonQuestion } from "../hooks/useLastLessonQuestion";
import { useLastLessonMode } from "../hooks/useLastLessonMode";
import { calculateInitialPageIndex } from "../utils/lessonNavigation";
import { useLearnFlowPersistence } from "@/app/_hooks/useLearnFlowPersistence";
import IntroTutorial from "@/app/_components/IntroTutorial";
import CanvasTutorialModal from "./modals/CanvasTutorialModal";

const SessionStructure = ({
  returnUrl,
  subjectId,
  paperId,
  lessonId,
  practiceSessionId,
  sessionType,
  initialSessionData,
  setShowSessionFinishedModal: _setShowSessionFinishedModal,
  setIsTransitioningBetweenModules: _setIsTransitioningBetweenModules,
  setShowBreakModal: _setShowBreakModal,
  setNextPaperId: _setNextPaperId,
  onReloadWithNewPaper: _onReloadWithNewPaper,
  targetQuestionId,
  initialPageIndex,
}: {
  returnUrl: string;
  subjectId?: string | undefined;
  paperId?: string | undefined;
  lessonId?: string | undefined;
  practiceSessionId?: string | undefined;
  sessionType: SessionType;
  initialSessionData: SessionData | undefined;
  setShowSessionFinishedModal?: (show: boolean) => void;
  setIsTransitioningBetweenModules?: (show: boolean) => void;
  setShowBreakModal?: (show: boolean) => void;
  setNextPaperId?: (paperId: string) => void;
  onReloadWithNewPaper?: (paperId: string) => void;
  targetQuestionId?: string;
  initialPageIndex?: number;
}) => {
  // Get mock dates state
  const { isAfterResultsDay } = useMockDates();

  // Helper function to determine if session should be readonly
  const getIsReadOnly = (
    sessionType: SessionType,
    sessionData: SessionData | null,
    additionalConditions?: boolean
  ): boolean => {
    if (
      sessionType === SessionType.PaperSession ||
      sessionType === SessionType.MockSession
    ) {
      return (
        !!sessionData?.timeFinished ||
        (sessionType === SessionType.MockSession && isAfterResultsDay)
      );
    }
    return sessionData?.isMarked || additionalConditions || false;
  };

  // Helper function to determine if a specific question should be readonly
  const getIsQuestionReadOnly = (questionLegacyId: string): boolean => {
    if (!sessionData) return true;

    const baseReadOnly = getIsReadOnly(sessionType, sessionData);

    // If this is a mock session after results day, check if this specific question is being retried
    if (
      baseReadOnly &&
      sessionType === SessionType.MockSession &&
      isAfterResultsDay
    ) {
      return !retriedQuestions.has(questionLegacyId);
    }

    return baseReadOnly;
  };

  const router = useRouter();
  const pageRendererRef = useRef<HTMLDivElement>(null);
  const { track } = useTracking();
  const { user, setUser, refetchUser } = useUser();
  const { isSidebarOpen } = useSidebar();
  const queryClient = useQueryClient();

  // Get subject theme for background color
  const derivedSubjectId = subjectId || (lessonId ? lessonIdToSubjectId(lessonId) : "");
  const { subjectTitle } = derivedSubjectId
    ? deconstructSubjectLegacyId(derivedSubjectId)
    : { subjectTitle: "" };
  const theme = useSubjectTheme(subjectTitle);
  const accentBgColor = theme.color ? applyWhiteOverlay(theme.color, 0.9) : "#F9F9FB";

  const {
    sessionData,
    isLoading: isLoadingSession,
    startSession,
    finishSession,
    updateQuestionUserAnswer,
    updateQuestionCanvas,
    updateQuestionDecorations,
    updateQuestionMarkingResult,
    updateQuestionDesmosExpressions,
    saveState,
    forceSave,
    updateQuestionMarkedForReview,
    resetQuestionGroup,
    resetIndividualQuestion,
    currentPageIndex,
    setCurrentPageIndex,
  } = useSession({
    initialSessionData,
    sessionType,
    subjectId,
    paperId,
    lessonId,
    practiceSessionId,
    initialPageIndex,
  });

  const { socket, error, setError } = useSocket();

  // Hook for tracking last question viewed in lesson sessions
  const { saveLastQuestionViewed, getLastQuestionViewed } =
    useLastLessonQuestion();

  // Hook for tracking last mode (textbook/learn/practice) - global across all lessons
  const { saveLastMode, getLastMode } = useLastLessonMode();

  // Helper function to determine mode from page index
  const getModeFromPageIndex = useCallback(
    (pageIndex: number): "learn" | "learn-page" | "practice" => {
      if (
        !sessionData?.pages ||
        pageIndex < 0 ||
        pageIndex >= sessionData.pages.length
      ) {
        return "learn";
      }

      const page = sessionData.pages[pageIndex];

      // Check if we're on the learn page
      if (page?.type === QuestionSessionPageType.Learn) {
        return "learn-page";
      }

      // Page index 0 is textbook/cover
      if (pageIndex === 0) {
        return "learn";
      }

      // Everything else is practice
      return "practice";
    },
    [sessionData?.pages]
  );

  // Get learn flow progress from sessionData (loaded server-side)
  const isLearnFlowPage =
    sessionData?.pages[currentPageIndex]?.type ===
    QuestionSessionPageType.Learn;
  const learnFlowProgress = sessionData?.learnFlowProgress;
  const {
    updateMessages,
    updateBlockIndex,
    updateMcqAnswer,
    updateCanvas: updateLearnFlowCanvas,
    markLearnFlowCompleted: markLearnFlowCompletedBase,
    getCurrentData,
  } = useLearnFlowPersistence(
    isLearnFlowPage ? lessonId : undefined,
    learnFlowProgress
  );

  // Wrap markLearnFlowCompleted to also optimistically update user's feature usage
  const markLearnFlowCompleted = useCallback(() => {
    markLearnFlowCompletedBase();
    // Optimistically increment user's feature usage
    if (user) {
      setUser({
        ...user,
        featuresUsedToday: (user.featuresUsedToday || 0) + 1,
      });
    }
  }, [markLearnFlowCompletedBase, user, setUser]);

  // Reset global action history when page changes
  const prevPageIndexRef = useRef(currentPageIndex);
  useEffect(() => {
    if (prevPageIndexRef.current !== currentPageIndex) {
      actionHistory.current = [];
      redoHistory.current = [];
      strokeRepository.current.clear();
      prevPageIndexRef.current = currentPageIndex;
    }
  }, [currentPageIndex]);
  const [isInsertVisible, setIsInsertVisible] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>(
    sessionData?.inputMode || "text"
  );
  const [currentGrade] = useState(sessionData?.currentGrade || 0);
  const [targetGrade] = useState(sessionData?.targetGrade || 0);
  const [isPostPracticeModalOpen, setIsPostPracticeModalOpen] = useState(false);
  const [isExitConfirmationModalOpen, setIsExitConfirmationModalOpen] =
    useState(false);
  const [canvasMessage, setCanvasMessage] = useState<
    CanvasMessage[] | undefined
  >(undefined);
  const [floatingMessage, setFloatingMessage] = useState<
    FloatingMessage | undefined
  >(undefined);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [shimmerTextboxIndices, setShimmerTextboxIndices] = useState<number[]>(
    []
  );
  const [fadeInTextboxIndices, setFadeInTextboxIndices] = useState<number[]>(
    []
  );
  const handleSendMessageRef = useRef<((message: string) => void) | null>(null);
  const clearMessagesRef = useRef<(() => void) | null>(null);
  const scrollToNextQuestionRef = useRef<(() => void) | null>(null);
  const [highlightedText, setHighlightedText] = useState<string[]>([]);

  const [isAiChatOpen, setIsAiChatOpen] = useState(
    sessionType !== SessionType.MockSession
  );

  // For mock sessions, update AI chat visibility based on results day
  useEffect(() => {
    if (sessionType === SessionType.MockSession) {
      setIsAiChatOpen(isAfterResultsDay);
    }
  }, [sessionType, isAfterResultsDay]);
  const [initialSubLessonMasteryScores, setInitialSubLessonMasteryScores] =
    useState<MasteryScore[] | undefined>();
  const [aiDecorations, setAiDecorations] = useState<Decoration[]>([]);

  const [isQuestionStemHighlighted, setIsQuestionStemHighlighted] =
    useState(false);
  const [isQuestionPartHighlighted, setIsQuestionPartHighlighted] =
    useState(false);
  const [highlightedQuestionPartIndex, setHighlightedQuestionPartIndex] =
    useState(0);

  // Track which questions are being retried (for post-results day mock sessions)
  const [retriedQuestions, setRetriedQuestions] = useState<Set<string>>(
    new Set()
  );

  // Apply fallback marking to pages for mock sessions after results day
  const isMockAfterResultsDay =
    sessionType === SessionType.MockSession && isAfterResultsDay;

  const processedPages = useMemo(
    () =>
      sessionData?.pages.map((page) =>
        applyFallbackMarkingToPage(
          page,
          sessionType,
          isMockAfterResultsDay,
          retriedQuestions
        )
      ),
    [sessionData?.pages, sessionType, isMockAfterResultsDay, retriedQuestions]
  );

  const { showTooltip, handleDismiss } = useTutorialTooltip("solve_with_medly");
  const { showTooltip: showWhyTooltip, handleDismiss: handleDismissWhy } =
    useTutorialTooltip("why_tooltip");
  const { isWideScreen, isTouchScreen } = useResponsive();
  const { featureUsage } = useFeatureUsage();
  const { hasActivePlan } = useHasActivePlan();
  const { isTutorial } = useMedlyChatTutorial();
  const autoHelloSentRef = useRef(false);
  const [isHandleSendReady, setIsHandleSendReady] = useState(false);
  const aiGroupCardRef = useRef<AiGroupCardRef>(null);
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
      if (typeof window === "undefined") return "drawing";
      const saved = localStorage.getItem("mathCanvasMode");
      if (saved === "textbox" || saved === "drawing") return saved;
      return "drawing"; // Default fallback
    }
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
    []
  );

  // Clean function to record actions and manage stroke repository
  const recordAction = useCallback(
    (
      type: "add" | "remove",
      strokeIds: string[],
      questionId: string,
      canvasRef: any,
      strokeDataArray?: StrokeData[]
    ) => {
      const timestamp = Date.now();

      // If adding strokes, store their data in the repository
      if (type === "add" && strokeDataArray) {
        strokeDataArray.forEach((strokeData) => {
          strokeRepository.current.set(strokeData.id, strokeData);
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
        actionHistory.current.map((a) => `${a.type}:[${a.strokeIds.join(",")}]`)
      );

      // Update undo/redo availability
      setCanUndo(actionHistory.current.length > 0);
      setCanRedo(false); // Redo history was just cleared
    },
    []
  );

  // Callback for when a stroke is added
  const onStrokeAdded = useCallback(
    (
      questionId: string,
      canvasRef: any,
      strokeId: string,
      strokeData?: any
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
    [recordAction]
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
              `💾 Stored erased stroke ${pathData.id} in repository for potential undo`
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
    [recordAction]
  );

  // Legacy callback (no longer used but kept for compatibility)
  const onStrokeRemoved = useCallback(
    (questionId: string, strokeId: string) => {
      // No longer used - erases are now tracked as actions
    },
    []
  );

  const [initialLessonMasteryScore, setInitialLessonMasteryScore] =
    useState<number>();
  const [isOnLastSegment, setIsOnLastSegment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isSolveTogether, setIsSolveTogether] = useState(false);
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const startSessionResolveRef = useRef<(() => void) | null>(null);

  // Start-session tutorial modal state (for mock sessions)
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const hasOpenedResultsModalRef = useRef(false);
  // TODO: Re-implement grade checking for mock sessions
  // const [startCurrentGrade, setStartCurrentGrade] = useState<string>("");
  // const [startTargetGrade, setStartTargetGrade] = useState<string>("");
  // const { data: userSubjects } = useUserSubjects();
  // const { updateSubjects } = useUpdateSubjects();
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const [isCanvasTutorialOpen, setIsCanvasTutorialOpen] = useState(false);

  const {
    handleMarkQuestionGroup,
    isMarking,
    markingResult,
    clearMarkingResult,
    error: markingAiError,
  } = useMarkingGroup({
    socket: socket,
    socketError: error ? new Error("Socket connection failed") : null,
    setSocketError: setError,
    sessionType: sessionType,
    subjectId: subjectId,
    lessonId: lessonId,
    paperId: paperId,
    isSolvedWithMedly: isSolveTogether,
    getMessages: () => aiGroupCardRef.current?.getMessages() || [],
  });

  // Breakdown footer state
  const [isStepsActive, setIsStepsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentLearnBlockIndex, setCurrentLearnBlockIndex] =
    useState<number>(0);

  // Callback to persist learn flow chat messages
  const handleLearnFlowMessagesChange = useCallback(
    (messages: any[]) => {
      // Update is debounced internally
      updateMessages(
        messages.map((m) => ({
          message: m.message,
          type: m.type as "apiMessage" | "userMessage",
          card_data: m.card_data,
          source_docs: m.source_docs,
        }))
      );
    },
    [updateMessages]
  );

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
    undefined
  );
  const [breakdownIsMarking, setBreakdownIsMarking] = useState<
    boolean | undefined
  >(undefined);

  // Calculate next lesson for practice sessions
  const subjectLegacyId =
    subjectId || (lessonId ? lessonIdToSubjectId(lessonId) : null);
  const { data: subjectData } = useSubject(subjectLegacyId || "", undefined);

  // TODO: Re-implement grade checking and submission for mock sessions
  // const effectiveSubjectId = subjectId || subjectLegacyId || null;
  // const currentSubjectGrades = React.useMemo(() => {
  //   if (!userSubjects || !effectiveSubjectId) return null;
  //   return userSubjects.find((s) => s.legacyId === effectiveSubjectId) || null;
  // }, [userSubjects, effectiveSubjectId]);

  const showGradeInputAtStart = false; // Disabled for now

  const nextLesson = React.useMemo(() => {
    if (
      !subjectData ||
      !lessonId ||
      sessionType !== SessionType.LessonSession
    ) {
      return null;
    }

    const lessonSequence: { legacyId: string; title: string }[] = [];
    subjectData.units.forEach((unit) => {
      unit.topics.forEach((topic) => {
        topic.lessons.forEach((lesson) => {
          lessonSequence.push({
            legacyId: lesson.legacyId,
            title: lesson.title,
          });
        });
      });
    });

    const currentIndex = lessonSequence.findIndex(
      (l) => l.legacyId === lessonId
    );
    return currentIndex >= 0 && currentIndex < lessonSequence.length - 1
      ? lessonSequence[currentIndex + 1]
      : null;
  }, [subjectData, lessonId, sessionType]);

  const snapPoints = ["0px", 0.7, 1];
  const [snap, setSnap] = useState<number | string | null>(snapPoints[0]);

  useEffect(() => {
    if (isTouchScreen && subjectLegacyId?.includes("Math")) {
      setInputMode(mathCanvasMode === "textbox" ? "math" : "pen");
    } else {
      setInputMode(sessionData?.inputMode || "text");
    }
  }, [sessionData?.inputMode, isTouchScreen, mathCanvasMode, subjectLegacyId]);

  // Set default based on screen type and lesson
  useEffect(() => {
    const saved = localStorage.getItem("mathCanvasMode");
    const isMath = lessonId?.includes("Math");

    // Non-touch screen (desktop): always textbox
    if (!isTouchScreen) {
      setMathCanvasMode("textbox");
      return;
    }

    // Touch screen logic
    if (!saved) {
      // No saved preference: Math → drawing, otherwise → textbox
      const newMode = isMath ? "drawing" : "textbox";
      setMathCanvasMode(newMode);
    } else if (saved === "drawing" && !isMath) {
      // Has 'drawing' saved but not on math lesson → force textbox
      setMathCanvasMode("textbox");
    } else {
      // Explicitly set to saved value to ensure consistency
      if (saved === "drawing" || saved === "textbox") {
        setMathCanvasMode(saved);
      }
    }
  }, [isTouchScreen, lessonId]);

  // Persist math canvas mode to localStorage
  useEffect(() => {
    localStorage.setItem("mathCanvasMode", mathCanvasMode);
  }, [mathCanvasMode]);

  // If a paper/mock is already finished when loading, or if it's past results day for mocks, start with results modal open (only once)
  useEffect(() => {
    if (
      (sessionType === SessionType.PaperSession ||
        sessionType === SessionType.MockSession) &&
      (sessionData?.timeFinished ||
        (sessionType === SessionType.MockSession && isAfterResultsDay)) &&
      !hasOpenedResultsModalRef.current &&
      sessionData?.resultsDayInsights
    ) {
      setIsResultsModalOpen(true);
      hasOpenedResultsModalRef.current = true;
    }
  }, [
    sessionType,
    sessionData?.timeFinished,
    sessionData?.resultsDayInsights,
    isAfterResultsDay,
  ]);

  // Auto-start all sessions except mock sessions
  useEffect(() => {
    if (
      sessionData &&
      !sessionData.timeStarted &&
      sessionType !== SessionType.MockSession
    ) {
      const autoStart = async () => {
        await startSession();
      };
      autoStart();
    }
  }, [sessionData, sessionType, startSession]);

  // Navigate to target question if provided (for deep linking)
  useEffect(() => {
    if (
      targetQuestionId &&
      sessionData?.pages &&
      sessionData.pages.length > 0
    ) {
      // Ensure session data is fully loaded by checking if questions are populated
      const hasQuestionsLoaded = sessionData.pages.some((page) => {
        if (page.type === QuestionSessionPageType.Question && page.content) {
          const questionGroup = page.content as QuestionGroup;
          return questionGroup.questions && questionGroup.questions.length > 0;
        }
        return false;
      });

      if (!hasQuestionsLoaded) {
        return;
      }

      // Find the page index that contains the target question
      const targetPageIndex = sessionData.pages.findIndex((page) => {
        if (page.type === QuestionSessionPageType.Question && page.content) {
          const questionGroup = page.content as QuestionGroup;
          return questionGroup.questions?.some(
            (question) => question.legacyId === targetQuestionId
          );
        }
        return false;
      });

      if (targetPageIndex !== -1 && targetPageIndex !== currentPageIndex) {
        handleSetCurrentPageIndex(targetPageIndex);
      }
    }
  }, [targetQuestionId, sessionData?.pages, currentPageIndex]);

  // Set initial page index for lesson sessions when session data loads
  // Restore based on global mode preference (textbook/learn/practice)
  // Only run this effect once on mount
  const hasRestoredLastQuestionRef = useRef(false);
  useEffect(() => {
    if (
      !hasRestoredLastQuestionRef.current &&
      sessionType === SessionType.LessonSession &&
      lessonId &&
      sessionData?.pages &&
      sessionData.pages.length > 0 &&
      !targetQuestionId // Don't override deep linking
    ) {
      const lastMode = getLastMode();
      let targetIndex = initialPageIndex ?? 0;

      if (lastMode) {
        if (lastMode === "learn") {
          // Textbook mode - go to page 0
          targetIndex = 0;
        } else if (lastMode === "learn-page") {
          // Learn page mode - find learn page
          const learnPageIndex = sessionData.pages.findIndex(
            (page) => page.type === QuestionSessionPageType.Learn
          );
          if (learnPageIndex !== -1) {
            targetIndex = learnPageIndex;
          }
        } else if (lastMode === "practice") {
          // Practice mode - use server's initialPageIndex if available (handles last question per lesson)
          // Otherwise restore last question for this lesson
          if (initialPageIndex === undefined) {
            const lastQuestionPageIndex = getLastQuestionViewed(lessonId);
            targetIndex = calculateInitialPageIndex(
              sessionData.pages,
              lastQuestionPageIndex
            );
          } else {
            // Server already provided the correct index based on last question for this lesson
            targetIndex = initialPageIndex;
          }
        }
      } else {
        // No saved mode preference, use server's initialPageIndex or fall back to last question logic
        if (initialPageIndex === undefined) {
          const lastQuestionPageIndex = getLastQuestionViewed(lessonId);
          targetIndex = calculateInitialPageIndex(
            sessionData.pages,
            lastQuestionPageIndex
          );
        } else {
          targetIndex = initialPageIndex;
        }
      }

      if (targetIndex !== currentPageIndex) {
        setCurrentPageIndex(targetIndex);
      }
      hasRestoredLastQuestionRef.current = true;
    }
  }, [
    sessionType,
    lessonId,
    sessionData?.pages,
    targetQuestionId,
    initialPageIndex,
    currentPageIndex,
    getLastQuestionViewed,
    getLastMode,
  ]);

  // Store initial mastery score for the lesson as soon as the component mounts
  useEffect(() => {
    if (
      !initialSubLessonMasteryScores &&
      sessionType === SessionType.PracticeSession &&
      lessonId &&
      sessionData?.masteryScores?.subLessonMasteryScores
    ) {
      const initialSubLessonMasteryScore =
        sessionData.masteryScores.subLessonMasteryScores.find(
          (ms) => ms.legacyId === lessonId
        );
      const initialLessonMasteryScore =
        sessionData.masteryScores.lessonMasteryScore;
      localStorage.setItem(
        "lastLessonPracticed",
        JSON.stringify({
          initialLessonMasteryScore: initialLessonMasteryScore,
          initialSubLessonMasteryScore: initialSubLessonMasteryScore,
          lessonId: lessonId,
          finished: false,
        })
      );
      setInitialSubLessonMasteryScores(
        sessionData.masteryScores.subLessonMasteryScores.map((ms) => ({
          legacyId: ms.legacyId,
          mastery: ms.mastery,
        }))
      );
    }
  }, [
    sessionType,
    lessonId,
    sessionData?.masteryScores,
    initialSubLessonMasteryScores,
  ]);

  // Add beforeunload event listener to warn about unsaved changes
  // Note: Learn flow persistence has its own beforeunload handler in the hook
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        saveState !== SaveState.SAVED ||
        (sessionType === SessionType.PracticeSession &&
          sessionData?.pages.some((page) => page.progress > 0))
      ) {
        e.preventDefault();
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveState, sessionType, sessionData?.pages]);

  const handleNextPage = async () => {
    const nextPageIndex = currentPageIndex + 1;
    if (sessionType === SessionType.PracticeSession && sessionData) {
      if (!sessionData.timeStarted) {
        const success = await startSession();

        if (!success) {
          toast.error("Failed to start session. Please try again.");
          return;
        }
      }
    }

    // Reset solve together mode when moving to next question
    setIsSolveTogether(false);
    handleSetCurrentPageIndex(nextPageIndex);
  };

  // Compute filtered question number (1-based) for a given page index,
  // matching the logic used by the dot navigation
  const getFilteredQuestionNumberForIndex = (pageIndex: number): number => {
    const pages = sessionData?.pages || [];
    if (!pages[pageIndex]) return 0;
    const page = pages[pageIndex];
    if (page.type !== QuestionSessionPageType.Question) return 0;

    const isLearnMode =
      sessionType === SessionType.LearnSession || pageIndex === 0;
    const questionPages = pages.filter(
      (p) => p.type === QuestionSessionPageType.Question
    );
    const currentStage = (page.content as QuestionGroup)?.stage;
    const filteredQuestionPages =
      !isLearnMode && currentStage !== undefined
        ? questionPages.filter((qp) => {
            const group = qp.content as QuestionGroup;
            return group?.stage === currentStage;
          })
        : questionPages;
    const filteredToActualIndex = filteredQuestionPages.map((fp) =>
      pages.findIndex((p) => p === fp)
    );
    const filteredIndex = filteredToActualIndex.findIndex(
      (idx) => idx === pageIndex
    );
    return filteredIndex >= 0 ? filteredIndex + 1 : 0;
  };

  const handlePreviousPage = () => {
    handleSetCurrentPageIndex(currentPageIndex - 1);
  };

  // Helper function to check for already-marked questions and emit their cards
  const checkForMarkedQuestionsAndEmitCards = useCallback(
    (pageIndex: number) => {
      setTimeout(() => {
        if (
          sessionData?.pages[pageIndex]?.type ===
          QuestionSessionPageType.Question
        ) {
          const questionGroup = sessionData.pages[pageIndex]
            .content as QuestionGroup;
          const questions =
            questionGroup.questions as QuestionWithMarkingResult[];

          // Find already-marked questions and emit cards for them
          questions.forEach((question, questionIndex) => {
            if (
              question.userMark !== undefined &&
              handleSendMessageRef.current
            ) {
              // Compute filtered question number (1-based)
              const questionPageNumber =
                getFilteredQuestionNumberForIndex(pageIndex);

              const cardData = {
                markedQuestion: { ...question, isMarked: true },
                markedQuestionIndex: questionIndex,
                currentPageIndex: pageIndex,
                questionNumber: questionPageNumber,
              };

              // Send cards message with data
              handleSendMessageRef.current(
                `cards_data:${JSON.stringify(cardData)}`
              );
            }
          });
        }
      }, 100); // Small delay to ensure page transition is complete
    },
    [sessionData?.pages]
  );

  const handleSetCurrentPageIndex = (index: number) => {
    // setIsResultsModalOpen(false);

    // Prevent navigation if session hasn't started
    if (!sessionData?.timeStarted) {
      return;
    }

    const actualIndex =
      index < 0
        ? 0
        : index > (sessionData?.pages.length || 0) - 1
          ? (sessionData?.pages.length || 0) - 1
          : index;

    // Return early if we're already on the requested page to prevent duplicate card emissions
    if (actualIndex === currentPageIndex) {
      return;
    }

    // Set flag to prevent double emission in useEffect
    skipNextEmissionRef.current = true;

    // Clear any previous marking result to prevent stale marking data from triggering on the new page
    clearMarkingResult();

    setCurrentPageIndex(actualIndex);

    // Save the current page index and mode for lesson sessions
    if (sessionType === SessionType.LessonSession && lessonId) {
      saveLastQuestionViewed(lessonId, actualIndex);
      const mode = getModeFromPageIndex(actualIndex);
      saveLastMode(mode); // Save mode globally (not per lesson)
    }

    // Scroll container fallback via data attribute in case ref isn't attached
    if (pageRendererRef.current) {
      pageRendererRef.current.scrollTop = 0;
    } else {
      const el = document.querySelector(
        "[data-session-scroll-container]"
      ) as HTMLDivElement | null;
      if (el) el.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    setIsSolveTogether(false);
    setIsQuestionStemHighlighted(false);
    setIsQuestionPartHighlighted(false);
    setHighlightedQuestionPartIndex(0);

    // Check for already-marked questions on the new page and emit their cards
    checkForMarkedQuestionsAndEmitCards(actualIndex);
  };

  const handleRetry = () => {
    // For mock sessions after results day, non-premium users cannot retry
    // Redirect them to the plan page instead
    if (
      sessionType === SessionType.MockSession &&
      isAfterResultsDay &&
      !hasActivePlan
    ) {
      router.push("/plan");
      return;
    }

    // Get current question group
    if (
      sessionData?.pages?.[currentPageIndex]?.type ===
      QuestionSessionPageType.Question
    ) {
      const questionGroup = sessionData.pages[currentPageIndex]
        .content as QuestionGroup;

      // Clear user data for the current question group
      resetQuestionGroup(questionGroup.id);
    }

    // Clear marking result to prevent it from being reapplied
    clearMarkingResult();

    // Clear AI chat messages
    try {
      if (clearMessagesRef.current) {
        clearMessagesRef.current();
      }
    } catch (error) {
      console.warn("Failed to clear messages:", error);
    }

    // Clear AI-related states
    setAiDecorations([]);
    setFloatingMessage(undefined);
    setIsOnLastSegment(false);
    setIsSolveTogether(false);
    setCanvasMessage(undefined);
    setHighlightedText([]);
  };

  const handleRetryQuestion = (
    questionGroupId: number,
    questionLegacyId: string
  ) => {
    // For mock sessions after results day, non-premium users cannot retry
    // Redirect them to the plan page instead
    if (
      sessionType === SessionType.MockSession &&
      isAfterResultsDay &&
      !hasActivePlan
    ) {
      router.push("/plan");
      return;
    }

    // Reset the individual question
    resetIndividualQuestion(questionGroupId, questionLegacyId);

    // Clear marking result to prevent it from being reapplied
    clearMarkingResult();

    // For mock sessions after results day, add this question to the retried set
    if (sessionType === SessionType.MockSession && isAfterResultsDay) {
      setRetriedQuestions((prev) => new Set(prev).add(questionLegacyId));
    }

    // Note: We don't clear AI-related states for individual retry
    // as other questions in the group might still be using them
  };

  // Helper to trigger save after undo/redo by exporting updated paths and calling updateQuestionCanvas
  const triggerSaveAfterUndoRedo = useCallback(
    async (questionId: string, canvasRef: any) => {
      if (!canvasRef?.exportPaths || !sessionData) return;

      // Use setTimeout to ensure the canvas state has settled after the stroke modification
      setTimeout(async () => {
        try {
          // Get the updated paths from the canvas
          const exportedPaths = await canvasRef.exportPaths();

          // Find the current question's canvas and group ID to preserve textboxes, maths, stemPaths
          let questionGroupId: number | undefined;
          let existingCanvas: QuestionWithMarkingResult | undefined;

          for (const page of sessionData.pages) {
            if (page.type !== QuestionSessionPageType.Question) continue;
            const group = page.content as QuestionGroup;
            const question = group.questions.find(
              (q) => q.legacyId === questionId
            );
            if (question) {
              questionGroupId = group.id;
              existingCanvas = question as QuestionWithMarkingResult;
              break;
            }
          }

          const currentCanvas = existingCanvas?.canvas;

          // Merge the updated paths with existing canvas data
          const mergedCanvas = {
            paths: exportedPaths.paths,
            textboxes: currentCanvas?.textboxes,
            maths: currentCanvas?.maths,
            stemPaths: currentCanvas?.stemPaths,
          };

          if (questionGroupId === undefined) {
            console.error(
              "Could not find question group for question:",
              questionId
            );
            return;
          }

          // Trigger the save by calling updateQuestionCanvas
          updateQuestionCanvas(questionGroupId, questionId, mergedCanvas);
          console.log(
            "💾 Triggered save after undo/redo for question:",
            questionId
          );
        } catch (error) {
          console.error("Failed to trigger save after undo/redo:", error);
        }
      }, 0);
    },
    [sessionData, updateQuestionCanvas]
  );

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
      `${lastAction.type}:[${lastAction.strokeIds.join(",")}]`
    );
    console.log(
      "↩️ Remaining actions:",
      actionHistory.current.map((a) => `${a.type}:[${a.strokeIds.join(",")}]`)
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
              `⚠️ Could not restore stroke ${strokeId}: data not found in repository or canvas method missing`
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
      "actions"
    );

    // Update undo/redo availability
    setCanUndo(actionHistory.current.length > 0);
    setCanRedo(redoHistory.current.length > 0);

    // Trigger save after the undo operation
    triggerSaveAfterUndoRedo(lastAction.questionId, lastAction.canvasRef);
  };

  const handleRedo = () => {
    console.log("🔄 SessionStructure handleRedo called");
    console.log("📊 Redo history length:", redoHistory.current.length);
    console.log(
      "📊 Redo history contents:",
      redoHistory.current.map((a) => `${a.type}:[${a.strokeIds.join(",")}]`)
    );

    if (redoHistory.current.length === 0) {
      console.log("↪️ No actions to redo");
      return;
    }

    // Get the most recent undone action
    const actionToRedo = redoHistory.current.pop();
    if (!actionToRedo) return;

    // Re-apply the action
    if (actionToRedo.type === "add") {
      // Add the strokes back - use batch method for atomic operation
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
              `⚠️ Could not redo stroke ${strokeId}: data not found in repository or canvas method missing`
            );
          }
        });
      }
    } else if (actionToRedo.type === "remove") {
      // Remove the strokes again - use batch method for atomic operation
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

    // Update undo/redo availability
    setCanUndo(actionHistory.current.length > 0);
    setCanRedo(redoHistory.current.length > 0);

    // Trigger save after the redo operation
    triggerSaveAfterUndoRedo(actionToRedo.questionId, actionToRedo.canvasRef);
  };

  const handleClearAll = () => {
    // Clear all non-readonly questions
    desmosScientificRefs.current.forEach(({ ref, isReadOnly }, id) => {
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

  const handleFinishSession = async () => {
    if (sessionType === SessionType.PracticeSession && lessonId) {
      setIsLoading(true);

      // Update the lastCompletedPractice to mark as finished
      const existingPractice = localStorage.getItem("lastLessonPracticed");
      if (existingPractice) {
        try {
          const practiceData = JSON.parse(existingPractice);
          localStorage.setItem(
            "lastLessonPracticed",
            JSON.stringify({
              ...practiceData,
              finished: true,
            })
          );
        } catch (error) {
          console.error(
            "Error updating lastCompletedPractice in localStorage:",
            error
          );
        }
      }

      // Remove the practiced lesson ID from weakLessonIds in localStorage
      const storedWeakLessonIds = localStorage.getItem("weakLessonIds");
      if (storedWeakLessonIds) {
        try {
          const parsedIds = JSON.parse(storedWeakLessonIds);
          const updatedIds = parsedIds.filter((id: string) => id !== lessonId);
          localStorage.setItem("weakLessonIds", JSON.stringify(updatedIds));
        } catch (error) {
          console.error("Error updating weakLessonIds in localStorage:", error);
        }
      }

      if (user && sessionData && lessonId) {
        const newLessonMasteryScore =
          sessionData.masteryScores?.lessonMasteryScore;

        if (newLessonMasteryScore !== undefined) {
          updateNumberOfStars(
            user,
            setUser,
            initialLessonMasteryScore || 0,
            newLessonMasteryScore
          );
        }
      }
    }

    const result = await finishSession();

    if (result.success) {
      if (sessionType === SessionType.MockSession) {
        setCurrentPageIndex(0);

        if (sessionData?.resultsDayInsights) {
          setIsResultsModalOpen(true);
          hasOpenedResultsModalRef.current = true;
        }

        track("mock_finished", {
          mock_id: paperId,
        });

        // Invalidate mocks data cache so sidebar shows updated progress
        queryClient.invalidateQueries({ queryKey: MOCKS_DATA_QUERY_KEY });
      } else if (sessionType === SessionType.PaperSession) {
        if (sessionData?.resultsDayInsights) {
          setIsResultsModalOpen(true);
          hasOpenedResultsModalRef.current = true;
        }
      } else {
        // Not a paper/mock session, go back to return URL
        router.push(returnUrl);
      }
    } else {
      setIsLoading(false);
    }

    // Always stop local loading state after attempting to finish
    setIsLoading(false);
  };

  const handleNavigateToQuestion = (questionGroupId: number) => {
    sessionData?.pages.map((page, index) => {
      if (
        page.type === QuestionSessionPageType.Question &&
        page.content &&
        (page.content as QuestionGroup).id === questionGroupId
      ) {
        handleSetCurrentPageIndex(index);
      }
    });
  };

  // Wrapper to handle Start button. Shows tutorial/grades modal for mock sessions
  const handleStartSessionWithModal = async () => {
    if (sessionType !== SessionType.MockSession) {
      await startSession();
      return;
    }

    setIsStartModalOpen(true);
    // Return a promise that resolves when modal confirms and session starts
    await new Promise<void>((resolve) => {
      startSessionResolveRef.current = resolve;
    });
  };

  useEffect(() => {
    if (markingAiError) {
      toast.error("Error remarking your answer. Please try again.");
    }
  }, [markingAiError]);

  useEffect(() => {
    if (
      markingResult &&
      (sessionData?.sessionType === SessionType.PracticeSession ||
        sessionData?.sessionType === SessionType.LessonSession ||
        sessionData?.sessionType === SessionType.PaperSession ||
        sessionData?.sessionType === SessionType.MockSession) &&
      sessionData.pages[currentPageIndex].type ===
        QuestionSessionPageType.Question
    ) {
      const questionGroup = sessionData.pages[currentPageIndex]
        .content as QuestionGroup;
      const questions = questionGroup.questions as QuestionWithMarkingResult[];

      const targetQuestion = questions.find(
        (question) =>
          question.legacyId === markingResult?.questionLegacyId &&
          // Allow if: not marked, OR marking data changed (reattempt with new result)
          (!question.isMarked ||
            question.markingTable !== markingResult.markingTable)
      );

      if (targetQuestion) {
        updateQuestionMarkingResult(
          questionGroup.id,
          targetQuestion.legacyId,
          markingResult
        );

        if (markingResult.userMark !== undefined) {
          // Capture current values to avoid closure issues with multiple async marking results
          const currentMarkingResult = { ...markingResult };
          const currentTargetQuestion = { ...targetQuestion };

          // Reset floating message and last segment state after marking
          setFloatingMessage(undefined);
          setIsOnLastSegment(false);
          setIsQuestionStemHighlighted(false);
          setIsQuestionPartHighlighted(false);
          setHighlightedQuestionPartIndex(0);

          setTimeout(() => {
            if (handleSendMessageRef.current) {
              // First, send 'marking_updated' if user didn't get full marks
              if (
                !isMarking &&
                !isAwaitingResponse &&
                currentMarkingResult.userMark !== undefined &&
                currentTargetQuestion.maxMark !== undefined &&
                currentMarkingResult.userMark < currentTargetQuestion.maxMark
              ) {
                handleSendMessageRef.current("marking_updated");
              }

              // Then send card data
              // Get the newly marked question with updated data using captured values
              const markedQuestion = {
                ...currentTargetQuestion,
                ...currentMarkingResult,
                isMarked: true,
              };

              // Find the index of the marked question in the questions array using captured values
              const markedQuestionIndex = questions.findIndex(
                (q) => q.legacyId === currentMarkingResult.questionLegacyId
              );

              // Prepare card data for emission (only the newly marked question)
              // Compute 1-based question number excluding non-question pages (e.g., cover)
              const questionPageNumber =
                getFilteredQuestionNumberForIndex(currentPageIndex);

              const cardData = {
                markedQuestion: markedQuestion,
                markedQuestionIndex: markedQuestionIndex,
                currentPageIndex,
                questionNumber: questionPageNumber,
              };

              // Send cards message with data
              handleSendMessageRef.current(
                `cards_data:${JSON.stringify(cardData)}`
              );

              // Mark that we've emitted cards for this page to prevent duplicate emission
              hasEmittedCardsForCurrentPageRef.current = true;
            }
          }, 10); // Small delay to ensure state updates complete
        }
      }
    }
  }, [
    markingResult,
    currentPageIndex,
    sessionData?.sessionType,
    sessionData?.pages,
    updateQuestionMarkingResult,
    isAwaitingResponse,
    isMarking,
    retriedQuestions,
    sessionType,
  ]);

  // Auto-send a placeholder "hello" message for first-time users
  useEffect(() => {
    if (autoHelloSentRef.current) return;
    if (!isTutorial) return;
    if (!hasActivePlan && featureUsage.isFreeUseFinished) return;

    const isPracticeOrLesson =
      sessionData.sessionType === SessionType.PracticeSession ||
      sessionData.sessionType === SessionType.LessonSession;
    if (!isPracticeOrLesson) return;

    const page = sessionData.pages[currentPageIndex];
    if (!page || page.type !== QuestionSessionPageType.Question) return;
    const group = page.content as QuestionGroup;
    if (!group?.questions || group.questions.length === 0) return;
    if (!isHandleSendReady) return;
    if (isAwaitingResponse) return;

    autoHelloSentRef.current = true;
    try {
      handleSendMessageRef.current?.("medly_tutorial");
      setIsSolveTogether(true);
      track("medly_tutorial_message_sent");
    } catch {
      // no retries required
    }
  }, [
    isTutorial,
    sessionData.sessionType,
    sessionData.pages,
    currentPageIndex,
    isHandleSendReady,
    isAwaitingResponse,
  ]);

  // Effect to handle any direct currentPageIndex changes that bypass handleSetCurrentPageIndex
  // This ensures cards are emitted even if setCurrentPageIndex is called directly somewhere
  const previousPageIndexRef = useRef<number>(currentPageIndex);
  const skipNextEmissionRef = useRef<boolean>(false);
  useEffect(() => {
    if (previousPageIndexRef.current !== currentPageIndex) {
      // Only emit cards if we didn't already emit them in handleSetCurrentPageIndex
      if (!skipNextEmissionRef.current) {
        checkForMarkedQuestionsAndEmitCards(currentPageIndex);
      }
      skipNextEmissionRef.current = false; // Reset the flag
      previousPageIndexRef.current = currentPageIndex;

      // Ensure scroll-to-top on any route to this index (header nav, keyboard, etc.)
      if (pageRendererRef.current) {
        pageRendererRef.current.scrollTop = 0;
      } else {
        const el = document.querySelector(
          "[data-session-scroll-container]"
        ) as HTMLDivElement | null;
        if (el) el.scrollTop = 0;
      }
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
      }
    }
  }, [currentPageIndex, checkForMarkedQuestionsAndEmitCards]);

  // Effect to emit cards for marked questions when handleSendMessage becomes ready
  // This fixes the issue where cards don't show on first load because handleSendMessageRef isn't ready yet
  const hasEmittedCardsForCurrentPageRef = useRef<boolean>(false);
  useEffect(() => {
    if (
      isHandleSendReady &&
      sessionData?.pages &&
      currentPageIndex >= 0 &&
      currentPageIndex < sessionData.pages.length &&
      !hasEmittedCardsForCurrentPageRef.current
    ) {
      // Check if current page has marked questions
      const currentPage = sessionData.pages[currentPageIndex];
      if (
        currentPage.type === QuestionSessionPageType.Question &&
        currentPage.content
      ) {
        const questionGroup = currentPage.content as QuestionGroup;
        const questions =
          questionGroup.questions as QuestionWithMarkingResult[];
        const hasMarkedQuestions = questions.some(
          (q) => q.userMark !== undefined
        );

        if (hasMarkedQuestions) {
          checkForMarkedQuestionsAndEmitCards(currentPageIndex);
          hasEmittedCardsForCurrentPageRef.current = true;
        }
      }
    }
  }, [
    isHandleSendReady,
    currentPageIndex,
    sessionData?.pages,
    checkForMarkedQuestionsAndEmitCards,
  ]);

  // Reset the flag when page changes
  useEffect(() => {
    hasEmittedCardsForCurrentPageRef.current = false;
  }, [currentPageIndex]);

  if (isLoadingSession || isLoading) {
    return <LoadingScreen />;
  }

  if (!sessionData || sessionData.pages.length === 0) {
    return (
      <div className="flex justify-center items-center w-full h-full bg-white">
        {/* Could not load session */}
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-full overflow-x-hidden" style={{ backgroundColor: isWideScreen ? accentBgColor : 'white' }}>
        {/* {sessionType === SessionType.PracticeSession && showTooltip && (
          <div className="absolute bottom-0 left-0 right-0 w-full h-dvh bg-[rgba(255,255,255,0.8)] justify-end items-end p-4 pr-48 animate-[fade-in_1s_ease-in_s] z-[1000]" />
        )} */}

        {sessionType === SessionType.PracticeSession &&
          showWhyTooltip &&
          isWideScreen &&
          sessionData.pages[currentPageIndex].type ===
            QuestionSessionPageType.Question &&
          (
            (sessionData.pages[currentPageIndex].content as QuestionGroup)
              .questions[0] as QuestionWithMarkingResult
          )?.isMarked &&
          (
            (sessionData.pages[currentPageIndex].content as QuestionGroup)
              .questions[0] as QuestionWithMarkingResult
          )?.userMark === 0 && (
            <div className="absolute bottom-0 left-0 right-0 w-full h-dvh bg-[rgba(255,255,255,0.8)] justify-end items-end p-4 pr-48 animate-[fade-in_1s_ease-in_s] z-[1000]" />
          )}

        <div className="flex flex-row flex-1 w-full h-full">
          <div
            className={`relative flex-1 flex flex-col h-full ${
              isResultsModalOpen ||
              sessionData.pages[currentPageIndex].type ===
                QuestionSessionPageType.Cover
                ? "overflow-y-auto"
                : "overflow-hidden"
            }`}
          >
            <Header
              currentPageIndex={currentPageIndex}
              handleSetCurrentPageIndex={handleSetCurrentPageIndex}
              pages={sessionData.pages}
              hasStarted={!!sessionData.timeStarted}
              hasFinished={!!sessionData.timeFinished}
              isTimed={sessionData.isTimed}
              durationInMinutes={sessionData.durationInMinutes}
              timeStarted={sessionData.timeStarted}
              setIsExitConfirmationModalOpen={setIsExitConfirmationModalOpen}
              saveState={saveState}
              sessionType={sessionType}
              handleSave={forceSave}
              sessionTitle={sessionData.sessionTitle}
              sessionSubtitle={sessionData.sessionSubtitle}
              isAnnotating={isAnnotating}
              setIsAnnotating={setIsAnnotating}
              returnUrl={returnUrl}
              setIsCalculatorOpen={() => setIsCalculatorOpen(!isCalculatorOpen)}
              setIsReferenceOpen={() => setIsReferenceOpen(!isReferenceOpen)}
              showCalculator={lessonId?.includes("sat1") || false}
              showReference={lessonId?.includes("sat1") || false}
              showStrategy={
                (sessionData.pages[currentPageIndex].type ===
                  QuestionSessionPageType.Question &&
                  (sessionData.pages[currentPageIndex].content as QuestionGroup)
                    .questions[0].strategy !== undefined &&
                  sessionType === SessionType.PracticeSession) ||
                false
              }
              setIsStrategyOpen={() => setIsStepsActive(!isStepsActive)}
              showCalculatorTooltip={
                !isCalculatorOpen &&
                isWideScreen &&
                floatingMessage?.targetAction === "use_desmos"
              }
              isReadOnly={getIsReadOnly(sessionType, sessionData)}
              lessonId={lessonId}
              paperId={paperId}
              subjectId={subjectId}
              gcseHigher={sessionData.gcseHigher}
              isResultsModalOpen={isResultsModalOpen}
              onToggleResults={() => {
                if (sessionData.resultsDayInsights) {
                  setIsResultsModalOpen((prev) => !prev);
                }
              }}
              resultsDayInsights={sessionData.resultsDayInsights}
            />

            <div
              className={`flex-1 flex flex-col relative z-0 ${
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
                {isResultsModalOpen ? (
                  <div className="flex-1 w-full overflow-y-auto relative">
                    <ResultsModal
                      isOpen={true}
                      onClose={() => setIsResultsModalOpen(false)}
                      pages={processedPages || sessionData.pages}
                      initialInsights={sessionData.initialInsights}
                      resultsDayInsights={sessionData.resultsDayInsights}
                      onNavigateToQuestion={handleSetCurrentPageIndex}
                      subjectData={subjectData}
                      timeStarted={sessionData.timeStarted}
                      timeFinished={sessionData.timeFinished}
                      paperId={paperId}
                    />
                  </div>
                ) : (
                  <PageRenderer
                    ref={pageRendererRef}
                    page={
                      processedPages?.[currentPageIndex] ||
                      sessionData.pages[currentPageIndex]
                    }
                    currentPageIndex={currentPageIndex}
                    inputMode={inputMode}
                    setInputMode={setInputMode}
                    updateQuestionUserAnswer={updateQuestionUserAnswer}
                    updateQuestionCanvas={updateQuestionCanvas}
                    updateQuestionDecorations={updateQuestionDecorations}
                    isReadOnly={getIsReadOnly(
                      sessionType,
                      sessionData,
                      (sessionData.pages[currentPageIndex].content &&
                        (
                          (
                            sessionData.pages[currentPageIndex]
                              .content as QuestionGroup
                          ).questions as QuestionWithMarkingResult[]
                        )?.every((q) => q.isMarked)) ||
                        isMarking
                    )}
                    handleSendMessageRef={handleSendMessageRef}
                    canvasMessage={canvasMessage}
                    isAwaitingResponse={isAwaitingResponse}
                    isMarking={isMarking}
                    shimmerTextboxIndices={shimmerTextboxIndices}
                    fadeInTextboxIndices={fadeInTextboxIndices}
                    handleMarkAnswer={(markingContext) =>
                      handleMarkQuestionGroup([markingContext])
                    }
                    highlightedText={highlightedText}
                    isAiChatOpen={isAiChatOpen}
                    floatingMessage={floatingMessage}
                    isOnLastSegment={isOnLastSegment}
                    isSolveTogether={isSolveTogether}
                    socket={socket}
                    socketError={error}
                    setSocketError={setError}
                    sessionType={sessionType}
                    subjectId={subjectId}
                    lessonId={lessonId}
                    paperId={paperId}
                    aiDecorations={aiDecorations}
                    setAiDecorations={setAiDecorations}
                    setFloatingMessage={setFloatingMessage}
                    isStepsActive={isStepsActive}
                    setCurrentStepIndex={(step: number | undefined) => {
                      if (step !== undefined) {
                        setCurrentStepIndex(step);
                      }
                    }}
                    currentStepIndex={currentStepIndex}
                    setIsStepsActive={setIsStepsActive}
                    updateQuestionMarkedForReview={
                      updateQuestionMarkedForReview
                    }
                    pages={sessionData.pages}
                    handleSetCurrentPageIndex={handleSetCurrentPageIndex}
                    sessionTitle={sessionData.sessionTitle}
                    sessionSubtitle={sessionData.sessionSubtitle}
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
                    updateQuestionDesmosExpressions={
                      updateQuestionDesmosExpressions
                    }
                    isQuestionStemHighlighted={isQuestionStemHighlighted}
                    isQuestionPartHighlighted={isQuestionPartHighlighted}
                    highlightedQuestionPartIndex={highlightedQuestionPartIndex}
                    handleRetryQuestion={handleRetryQuestion}
                    scrollToNextQuestionRef={scrollToNextQuestionRef}
                    registerDesmosRef={registerDesmosRef}
                    onStrokeAdded={onStrokeAdded}
                    onStrokeRemoved={onStrokeRemoved}
                    onEraseAction={onEraseAction}
                    getIsQuestionReadOnly={getIsQuestionReadOnly}
                    mathCanvasMode={mathCanvasMode}
                    onLearnPageBlockIndexChange={setCurrentLearnBlockIndex}
                    onLearnPageWhyClick={() => {
                      if (handleSendMessageRef.current) {
                        handleSendMessageRef.current("Why?");
                      }
                    }}
                    onLearnPageExplainClick={(stepIndex, stepMath) => {
                      if (handleSendMessageRef.current) {
                        handleSendMessageRef.current(
                          `Can you explain this step to me? ${stepMath}`
                        );
                      }
                    }}
                    learnFlowProgress={getCurrentData()}
                    updateBlockIndex={updateBlockIndex}
                    updateMcqAnswer={updateMcqAnswer}
                    updateCanvas={updateLearnFlowCanvas}
                    markLearnFlowCompleted={markLearnFlowCompleted}
                  />
                )}
              </div>

              {!isResultsModalOpen && (
                <Footer
                  hasStarted={!!sessionData.timeStarted}
                  hasFinished={!!sessionData.timeFinished}
                  pages={sessionData.pages}
                  questionGroup={
                    sessionData.pages[currentPageIndex].type ===
                    QuestionSessionPageType.Question
                      ? (sessionData.pages[currentPageIndex]
                          .content as QuestionGroup)
                      : null
                  }
                  currentPageIndex={currentPageIndex}
                  handlePreviousPage={handlePreviousPage}
                  handleNextPage={handleNextPage}
                  handleStartSession={handleStartSessionWithModal}
                  handleMarkAnswer={() => {
                    const questionGroup = sessionData.pages[currentPageIndex]
                      .content as QuestionGroup;
                    const markingContexts = (
                      (questionGroup.questions as QuestionWithMarkingResult[]) ||
                      []
                    )
                      .filter((question) => {
                        // For mock sessions, only mark retried questions
                        if (
                          sessionType === SessionType.MockSession &&
                          !retriedQuestions.has(question.legacyId)
                        ) {
                          return false;
                        }

                        return (
                          question.userMark === undefined &&
                          ((question.canvas?.textboxes &&
                            question.canvas?.textboxes?.length > 0 &&
                            question.canvas.textboxes.some(
                              (textbox) => textbox.text.trim().length > 0
                            )) ||
                            (question.userAnswer &&
                              question.userAnswer !== "") ||
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
                        questionStem: question.questionStem,
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

                    handleMarkQuestionGroup(markingContexts);
                  }}
                  handleSolveTogether={() => {
                    if (!isSolveTogether) {
                      handleSendMessageRef.current?.(
                        "Help me solve this question"
                      );
                    }
                    setSnap(snapPoints[2]); // Open bottomsheet to top
                  }}
                  handleGetFeedback={() => {
                    if (!isSolveTogether) {
                      handleSendMessageRef.current?.(
                        "Explain why I got this question wrong"
                      );
                    }
                    setSnap(snapPoints[2]); // Open bottomsheet to top
                  }}
                  handleRetry={handleRetry}
                  setIsStepsActive={setIsStepsActive}
                  handleCheckWork={() => {
                    handleSendMessageRef.current?.("Check my work");
                  }}
                  setIsPostPracticeModalOpen={() => {
                    setIsPostPracticeModalOpen(true);
                    setFloatingMessage(undefined);
                    setIsOnLastSegment(false);
                    setCurrentPageIndex(0);
                  }}
                  isInsertVisible={isInsertOpen}
                  setIsInsertVisible={setIsInsertOpen}
                  hasInsert={sessionData.hasInsert}
                  insertType={sessionData.insertType}
                  inputMode={inputMode}
                  setInputMode={setInputMode}
                  isStartingSession={isLoadingSession}
                  isReadOnly={getIsReadOnly(sessionType, sessionData)}
                  sessionType={sessionType}
                  currentQuestionWithMarkingResult={
                    (sessionData.pages[currentPageIndex].type ===
                      QuestionSessionPageType.Question &&
                      ((
                        sessionData.pages[currentPageIndex]
                          .content as QuestionGroup
                      ).questions[0] as QuestionWithMarkingResult)) ||
                    null
                  }
                  isMarking={isMarking}
                  isToolbarVisible={false}
                  isSolveTogether={isSolveTogether}
                  setIsSolveTogether={setIsSolveTogether}
                  handleSetCurrentPageIndex={handleSetCurrentPageIndex}
                  sessionTitle={sessionData.sessionTitle}
                  sessionSubtitle={sessionData.sessionSubtitle}
                  handleFinishSession={handleFinishSession}
                  setIsExitConfirmationModalOpen={
                    setIsExitConfirmationModalOpen
                  }
                  isStepsActive={isStepsActive}
                  isCalculatorOpen={isCalculatorOpen}
                  // Breakdown props from state
                  breakdownButtonText={breakdownButtonText}
                  breakdownButtonState={breakdownButtonState}
                  breakdownIsDisabled={breakdownIsDisabled}
                  breakdownOnClick={breakdownOnClick}
                  breakdownIsMarked={breakdownIsMarked}
                  breakdownUserMark={breakdownUserMark}
                  breakdownMaxMark={breakdownMaxMark}
                  breakdownIsMarking={breakdownIsMarking}
                  showTooltip={false}
                  showWhyTooltip={false}
                  handleDismiss={handleDismiss}
                  handleDismissWhy={handleDismissWhy}
                  paperId={paperId}
                  nextLesson={nextLesson}
                  scrollToNextQuestionRef={scrollToNextQuestionRef}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onClearAll={handleClearAll}
                  hasRetriedQuestions={
                    sessionType === SessionType.MockSession &&
                    sessionData?.pages[currentPageIndex]?.type ===
                      QuestionSessionPageType.Question &&
                    (
                      (
                        sessionData.pages[currentPageIndex]
                          .content as QuestionGroup
                      ).questions as QuestionWithMarkingResult[]
                    )?.some((question) =>
                      retriedQuestions.has(question.legacyId)
                    )
                  }
                  retriedQuestions={retriedQuestions}
                  setIsCanvasTutorialOpen={setIsCanvasTutorialOpen}
                  isSidebarOpen={isSidebarOpen}
                  isAwaitingResponse={isAwaitingResponse}
                  mathCanvasMode={mathCanvasMode}
                  setMathCanvasMode={setMathCanvasMode}
                />
              )}
            </div>
          </div>

          {(sessionData.sessionType === SessionType.PracticeSession ||
            sessionData.sessionType === SessionType.LessonSession ||
            sessionData.sessionType === SessionType.PaperSession ||
            (sessionData.sessionType === SessionType.MockSession &&
              isAfterResultsDay)) &&
              (sessionData.pages[currentPageIndex].type ===
                QuestionSessionPageType.Question ||
                sessionData.pages[currentPageIndex].type ===
                  QuestionSessionPageType.Textbook ||
                sessionData.pages[currentPageIndex].type ===
                  QuestionSessionPageType.Learn) &&
              !isStepsActive &&
              (() => {
                // Check if current page is textbook or learn
                const isTextbookPage =
                  sessionData.pages[currentPageIndex].type ===
                  QuestionSessionPageType.Textbook;
                const isLearnPage =
                  sessionData.pages[currentPageIndex].type ===
                  QuestionSessionPageType.Learn;

                // For question pages, prepare hints
                const questionGroup =
                  !isTextbookPage && !isLearnPage
                    ? (sessionData.pages[currentPageIndex]
                        .content as QuestionGroup)
                    : null;

                // For learn pages, get learn flow data
                const learnContent = isLearnPage
                  ? (sessionData.pages[currentPageIndex]
                      .content as LearnContent)
                  : null;
                const learnFlow = learnContent?.flows?.[0];
                const allLearnBlocks = learnFlow
                  ? (() => {
                      const blocks: LearnFlowBlock[] = [];
                      learnFlow.chunks.forEach((chunk) => {
                        chunk.blocks
                          .sort((a, b) => a.order - b.order)
                          .forEach((block) => blocks.push(block));
                      });
                      return blocks;
                    })()
                  : undefined;
                const hints =
                  !isTextbookPage && questionGroup
                    ? (questionGroup.questions as QuestionWithMarkingResult[])
                        .map((question, originalIndex) => ({
                          question,
                          originalIndex,
                        }))
                        .filter(
                          ({ question }) => question.userMark === undefined
                        )
                        .map(
                          ({ originalIndex }) =>
                            `Help me solve question ${questionGroup.order + 1}.${
                              originalIndex + 1
                            }`
                        )
                    : [];

                return (
                  <div
                    className={`hidden md:block h-full md:flex flex-col overflow-hidden relative ${
                      isAiChatOpen && !isResultsModalOpen
                        ? "w-1/4 max-w-[400px]"
                        : "w-0"
                    }`}
                  >
                    {isTextbookPage ? (
                      lessonId && user ? (
                        <LearnAiSidebar
                          socket={socket}
                          socketError={error}
                          setSocketError={setError}
                          lessonData={{
                            id: 0,
                            legacyId: lessonId,
                            title: sessionData.sessionTitle,
                            textbookContent:
                              (sessionData.pages.find(
                                (p) =>
                                  p.type === QuestionSessionPageType.Textbook
                              )?.content as string) || "",
                          }}
                          user={user}
                          lessonId={lessonId}
                          refetchUser={refetchUser}
                        />
                      ) : null
                    ) : (
                      // Render AI sidebar for question pages and learn pages
                      <div className="border-l border-[#F0F0F0] h-full overflow-hidden">
                        {sessionData.pages[currentPageIndex].type ===
                          QuestionSessionPageType.Question &&
                        questionGroup &&
                        (questionGroup.questions as QuestionWithMarkingResult[])
                          .length === 0 ? (
                          <div className="flex justify-center items-center h-full">
                            <Spinner />
                          </div>
                        ) : (
                          <AiGroupCard
                            ref={aiGroupCardRef}
                            currentPageType={
                              sessionData.pages[currentPageIndex].type
                            }
                            questionsWithMarkingResults={
                              sessionData.pages[currentPageIndex].type ===
                              "question"
                                ? ((
                                    sessionData.pages[currentPageIndex]
                                      .content as QuestionGroup
                                  ).questions as QuestionWithMarkingResult[])
                                : []
                            }
                            currentQuestionWithMarkingResult={
                              sessionData.pages[currentPageIndex].type ===
                              "question"
                                ? ((
                                    sessionData.pages[currentPageIndex]
                                      .content as QuestionGroup
                                  ).questions[0] as QuestionWithMarkingResult)
                                : ({} as QuestionWithMarkingResult)
                            }
                            setHighlightedText={setHighlightedText}
                            setDecorations={setAiDecorations}
                            setCanvasMessage={setCanvasMessage}
                            setFloatingMessage={(message) => {
                              setFloatingMessage(message);
                              // if (message?.targetAction === "use_desmos") {
                              //   setIsCalculatorOpen(true)
                              // }
                            }}
                            currentPageIndex={currentPageIndex}
                            setHandleSendMessage={(fn) => {
                              handleSendMessageRef.current = fn;
                              setIsHandleSendReady(true);
                            }}
                            setClearMessages={(fn) => {
                              clearMessagesRef.current = fn;
                            }}
                            sessionType={sessionData.sessionType}
                            updateQuestionCanvas={updateQuestionCanvas}
                            questionGroupId={
                              (
                                sessionData.pages[currentPageIndex]
                                  .content as QuestionGroup
                              ).id || 0
                            }
                            onIsAwaitingResponseChange={(isAwaiting) => {
                              setIsAwaitingResponse(isAwaiting);
                              if (isAwaiting) {
                                setFloatingMessage(undefined);
                                setIsOnLastSegment(false);
                              }
                            }}
                            onShimmerTextboxIndicesChange={
                              setShimmerTextboxIndices
                            }
                            onFadeInTextboxIndicesChange={
                              setFadeInTextboxIndices
                            }
                            isSolveTogether={isSolveTogether}
                            setIsSolveTogether={setIsSolveTogether}
                            currentStepIndex={currentStepIndex}
                            setCurrentStepIndex={setCurrentStepIndex}
                            setIsQuestionStemHighlighted={
                              setIsQuestionStemHighlighted
                            }
                            setIsQuestionPartHighlighted={
                              setIsQuestionPartHighlighted
                            }
                            setHighlightedQuestionPartIndex={
                              setHighlightedQuestionPartIndex
                            }
                            learnFlow={learnFlow}
                            allLearnBlocks={allLearnBlocks}
                            currentLearnBlockIndex={currentLearnBlockIndex}
                            initialLearnFlowMessages={
                              getCurrentData()?.messages?.map((m) => ({
                                message: m.message,
                                type: m.type as "apiMessage" | "userMessage",
                                card_data: m.card_data,
                                source_docs: m.source_docs,
                              })) ?? []
                            }
                            onLearnFlowMessagesChange={
                              handleLearnFlowMessagesChange
                            }
                            learnFlowProgress={learnFlowProgress}
                            updateLearnFlowCanvas={updateLearnFlowCanvas}
                            userMessageColor={accentBgColor}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

          {/* Lock overlay below the header, covering the entire content area (including AI chat), and behind the sidebar */}
          {(sessionType === SessionType.LessonSession ||
            sessionType === SessionType.PaperSession) &&
            !hasActivePlan &&
            featureUsage.isFreeUseFinished && <LockOverlay />}
        </div>
      </div>

      {false && (isCalculatorOpen || !isWideScreen) && (
        <SpeechBubble
          floatingMessage={floatingMessage}
          sessionData={sessionData}
          currentPageIndex={currentPageIndex}
          isOnLastSegment={isOnLastSegment}
          onSegmentChange={setIsOnLastSegment}
          handleSendMessage={(message) => {
            handleSendMessageRef.current?.(message);
          }}
          // searchContainer={pageRendererRef.current}
          isHidden={isAwaitingResponse}
        />
      )}

      {sessionType === SessionType.PracticeSession &&
        lessonId &&
        initialSubLessonMasteryScores !== undefined && (
          <PostPracticeModal
            isOpen={isPostPracticeModalOpen}
            onClickConfirm={handleFinishSession}
            lessonLegacyId={lessonId}
            initialLessonMasteryScore={initialLessonMasteryScore || 0}
            initialSubLessonMasteryScores={initialSubLessonMasteryScores}
            lessonMasteryScore={
              sessionData.masteryScores?.lessonMasteryScore || 0
            }
            subLessonMasteryScores={
              sessionData.masteryScores?.subLessonMasteryScores || []
            }
          />
        )}

      {!isWideScreen && (
        <BottomSheet
          snapPoints={snapPoints}
          activeSnapPoint={snap || snapPoints[0]}
          setActiveSnapPoint={setSnap}
          open={true}
        >
          {/* {true && (
            <button
              onClick={() => {
                setIsStepsActive(false);
              }}
              className="absolute right-0 top-8 mr-2 p-0 z-[10000]"
            >
              <CloseIcon />
            </button>
          )} */}
          <div
            onClick={() => {
              if (snap === 0) {
                setSnap(1);
              }
            }}
            className={`flex flex-col max-w-md mx-auto w-full`}
            style={{
              marginBottom: snap === 1 ? "240px" : "0px",
            }}
            data-annotation-enabled
          >
            <AiGroupCard
              currentPageType={sessionData.pages[currentPageIndex].type}
              questionsWithMarkingResults={
                sessionData.pages[currentPageIndex].type === "question"
                  ? ((
                      sessionData.pages[currentPageIndex]
                        .content as QuestionGroup
                    ).questions as QuestionWithMarkingResult[])
                  : []
              }
              currentQuestionWithMarkingResult={
                sessionData.pages[currentPageIndex].type === "question"
                  ? ((
                      sessionData.pages[currentPageIndex]
                        .content as QuestionGroup
                    ).questions[0] as QuestionWithMarkingResult)
                  : ({} as QuestionWithMarkingResult)
              }
              setHighlightedText={setHighlightedText}
              setDecorations={setAiDecorations}
              setCanvasMessage={setCanvasMessage}
              setFloatingMessage={(message) => {
                setFloatingMessage(message);
                // if (message?.targetAction === "use_desmos") {
                //   setIsCalculatorOpen(true)
                // }
              }}
              currentPageIndex={currentPageIndex}
              setHandleSendMessage={(fn) => {
                handleSendMessageRef.current = fn;
              }}
              setClearMessages={(fn) => {
                clearMessagesRef.current = fn;
              }}
              sessionType={sessionData.sessionType}
              updateQuestionCanvas={updateQuestionCanvas}
              questionGroupId={
                sessionData.pages[currentPageIndex].type ===
                QuestionSessionPageType.Question
                  ? (
                      sessionData.pages[currentPageIndex]
                        .content as QuestionGroup
                    )?.id || 0
                  : 0
              }
              onIsAwaitingResponseChange={(isAwaiting) => {
                setIsAwaitingResponse(isAwaiting);
                if (isAwaiting) {
                  setFloatingMessage(undefined);
                  setIsOnLastSegment(false);
                }
              }}
              onShimmerTextboxIndicesChange={setShimmerTextboxIndices}
              onFadeInTextboxIndicesChange={setFadeInTextboxIndices}
              isSolveTogether={isSolveTogether}
              setIsSolveTogether={setIsSolveTogether}
              currentStepIndex={currentStepIndex}
              setCurrentStepIndex={setCurrentStepIndex}
              userMessageColor={accentBgColor}
            />
          </div>
        </BottomSheet>
      )}

      {/* Reference Frame */}
      {!isStepsActive && (
        <>
          {/* sessionData.pages[1].content.questions[0].questionStem */}
          <FrameContainer
            type="insert"
            group={null}
            highlightedText={[]}
            triggerCenter={isInsertOpen}
            triggerHide={!isInsertOpen}
            onClose={() => setIsInsertOpen(false)}
            isAwaitingResponse={isAwaitingResponse}
            isPracticeMode={
              sessionData.sessionType === SessionType.PracticeSession
            }
            insertText={
              sessionData.pages?.[1]?.content?.questions?.[0]?.questionStem ||
              ""
            }
          />
          <FrameContainer
            type="reference"
            group={null}
            highlightedText={[]}
            triggerCenter={isReferenceOpen}
            triggerHide={!isReferenceOpen}
            onClose={() => setIsReferenceOpen(false)}
            isAwaitingResponse={isAwaitingResponse}
            isPracticeMode={
              sessionData.sessionType === SessionType.PracticeSession
            }
          />
          <FrameContainer
            type="calculator"
            group={null}
            highlightedText={[]}
            triggerCenter={isCalculatorOpen}
            triggerHide={!isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
            showMedlyLayer={isSolveTogether}
            onPressCheckDesmos={() => {
              handleSendMessageRef.current?.("Check my work");
            }}
            isAwaitingResponse={isAwaitingResponse}
            hideScientificCalculator={
              sessionData.sessionType === SessionType.PracticeSession
            }
            isPracticeMode={
              sessionData.sessionType === SessionType.PracticeSession
            }
          />
        </>
      )}

      <ExitConfirmationModal
        isOpen={isExitConfirmationModalOpen}
        onClose={() => setIsExitConfirmationModalOpen(false)}
        onClickConfirm={() => {
          setIsExitConfirmationModalOpen(false);
          handleFinishSession();
        }}
        sessionType={sessionType}
      />

      {/* Start-session tutorial/confirmation modal (mock sessions) */}
      <PaperTutorialModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onClickStartSession={async (current, target) => {
          try {
            // TODO: Re-implement grade submission for mock sessions
            const started = await startSession();
            if (!started) return;

            setIsStartModalOpen(false);
            setCurrentPageIndex(1);
            // Resolve Footer's awaiting start to allow it to navigate next
            if (startSessionResolveRef.current) {
              startSessionResolveRef.current();
              startSessionResolveRef.current = null;
            }
          } catch {
            // Errors/toasts handled by hooks
          }
        }}
        showGradeInput={false}
        currentGrade=""
        targetGrade=""
        setCurrentGrade={() => {}}
        setTargetGrade={() => {}}
        gradeOptions={[]}
      />

      {/* TODO: Re-enable Math Mode tutorial when ready
      {sessionType === SessionType.LessonSession &&
        lessonId?.includes("Math") &&
        isTouchScreen && (
          <IntroTutorial
            storageKey="math_mode_intro_seen"
            steps={[
              {
                id: "welcome",
                title: `Introducing Math Mode!`,
                description: "Let's quickly go through how to use it.",
                imageUrl:
                  "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fwrite_working_animation.gif?alt=media&token=04549379-1ce9-4c14-ace7-63e92013e10b",
                hasSkip: false,
              },
              {
                id: "instructions",
                title: "Write one equation per line",
                description:
                  "Keep each mathematical expression on its own line.",
                imageUrl:
                  "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fhandwriting.gif?alt=media&token=a30a3985-afa6-48db-bcce-e7e88017a90a",
                hasSkip: false,
              },
              {
                id: "problem-example",
                title: "Stuck on a problem?",
                description:
                  "Just tap 'Send' to ask Medly for help on your work.",
                imageUrl:
                  "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fcheck_work.gif?alt=media&token=82d75ea2-f698-4620-97e0-7f6f78a72d20",
                hasSkip: false,
                isFinal: true,
              },
            ]}
            isSkippable={false}
            onComplete={() => setShowSwipeTutorial(true)}
          />
        )}
      */}

      {/* TODO: Re-enable SwipeTutorial when ready
      {sessionType === SessionType.LessonSession &&
        lessonId?.includes("Math") &&
        isTouchScreen &&
        showSwipeTutorial && <SwipeTutorial />}
      */}

      <div className="fixed bottom-6 left-6 z-[1000]">
        <GettingStartedPopover
          hideTail={true}
          variant="toast"
          showToast={!isSidebarOpen}
        />
      </div>

      <CanvasTutorialModal
        isOpen={isCanvasTutorialOpen}
        onClose={() => setIsCanvasTutorialOpen(false)}
      />
    </>
  );
};

export default SessionStructure;
