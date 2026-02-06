import { useCallback, useState, useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  SessionData,
  SessionType,
  QuestionSessionPageType,
  MasteryScore,
} from "../types";
import { toast } from "sonner";
import {
  Canvas,
  MarkingResult,
  QuestionGroup,
  Question,
  QuestionWithMarkingResult,
  QuestionDifficulty,
  Decoration,
  AnswerAttempt,
} from "@/app/types/types";
import { Persister } from "../persisters/Persister";
import {
  calculateQuestionGroupProgress,
  updateFeaturesUsedToday,
  updateStreak,
} from "../utils";
import { knowledgeModelEvents } from "@/app/_lib/utils/knowledgeModelEvents";
import { useUser } from "@/app/_context/UserProvider";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useMedlyMondays } from "@/app/_hooks/useMedlyMondays";
import { calculateMasteryChange, markSatQuestion } from "./utils";
import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import { useGettingStartedProgress } from "@/app/_hooks/useGettingStartedSteps";
import { useKnowledgeModel } from "@/app/_hooks/useKnowledgeModel";
import { useSaveManager, SaveState } from "@/app/_context/SaveManagerProvider";
import {
  hasCanvasContentChanged,
  questionHasExistingAnswer,
} from "@/app/_context/saveManager/saveManager.utils";

export { SaveState };

interface UseSessionParams {
  initialSessionData: SessionData | undefined;
  sessionType: SessionType;
  subjectId?: string;
  paperId?: string;
  lessonId?: string;
  practiceSessionId?: string;
  initialPageIndex?: number;
}

interface FinishSessionResult {
  success: boolean;
  allPapersFinished?: boolean;
  nextPaperId?: string;
}

interface PendingSave {
  questionLegacyId: string;
  userAnswer?: string | string[] | { left?: string; right?: string };
  canvas?: Canvas;
  decorations?: Decoration[];
  markingResult?: MarkingResult;
  timestamp: number; // Timestamp when save was created
}

export const useSession = ({
  initialSessionData,
  sessionType,
  subjectId,
  paperId,
  lessonId,
  practiceSessionId,
  initialPageIndex,
}: UseSessionParams) => {
  const [sessionData, setSessionData] = useState<SessionData | undefined>(
    initialSessionData
  );
  const [isLoading, setIsLoading] = useState(
    !!initialSessionData ? false : true
  );
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndexState] = useState(
    () => initialPageIndex ?? 0
  );
  const sessionDataRef = useRef<SessionData | null>(null);

  const { user, setUser, refetchUser } = useUser();
  const { hasActivePlan } = useHasActivePlan();
  const { isSubjectUnlocked } = useMedlyMondays();
  const { markComplete } = useGettingStartedProgress();

  // Save manager handles all debounced/priority saving logic
  const { saveState, hasPendingSaves, addPendingSave, flushPendingSaves } =
    useSaveManager({
      paperId,
      lessonId,
      sessionType,
    });

  const { updateKnowledgeModel } = useKnowledgeModel({
    lessonId,
    subjectId,
    onUpdateComplete: (result) => {
      // Update session data with new knowledge model values
      if (result.lesson_store && lessonId) {
        const updatedModel = result.lesson_store[lessonId];
        if (updatedModel) {
          setSessionData((prev) =>
            prev
              ? {
                  ...prev,
                  mu: updatedModel.mu,
                  sigma: updatedModel.sigma,
                  p_mastery: updatedModel.p_mastery,
                  mastery_tier: updatedModel.mastery_tier,
                  rank: updatedModel.rank,
                }
              : prev
          );

          // Emit event for sidebar to update optimistically
          const currentSessionData = sessionDataRef.current;
          console.log("🔔 useSession: Emitting knowledge model update event", {
            lessonId,
            p_mastery: updatedModel.p_mastery,
            hasSessionInfo: !!currentSessionData,
          });
          knowledgeModelEvents.emit({
            lessonId,
            updates: {
              mu: updatedModel.mu,
              sigma: updatedModel.sigma,
              p_mastery: updatedModel.p_mastery,
              mastery_tier: updatedModel.mastery_tier,
              rank: updatedModel.rank,
            },
            sessionInfo: currentSessionData
              ? {
                  title: currentSessionData.sessionTitle,
                  subtitle: currentSessionData.sessionSubtitle,
                  questionCount: 1, // Always increment by 1 per question marked
                  timeStarted:
                    currentSessionData.timeStarted || new Date().toISOString(),
                }
              : undefined,
          });
        }
      }
    },
  });

  useEffect(() => {
    sessionDataRef.current = sessionData || null;
  }, [sessionData]);

  // Flush pending saves when changing pages
  const setCurrentPageIndex = useCallback(
    (index: number | ((prev: number) => number)) => {
      void flushPendingSaves();
      setCurrentPageIndexState(index);
    },
    [flushPendingSaves]
  );

  const startSession = useCallback(async () => {
    if (!sessionData) {
      return false;
    }

    if (sessionData.timeStarted) {
      return true;
    }

    try {
      const persister = new Persister();

      await persister.startSession(
        { subjectId, lessonId, paperId, practiceSessionId },
        sessionData
      );

      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          timeStarted: new Date().toISOString(),
        };
      });

      if (user && sessionType === SessionType.PracticeSession) {
        // Skip feature usage increment for premium users or Medly Mondays unlocked subjects
        const shouldSkipIncrement =
          hasActivePlan || isSubjectUnlocked(subjectId);
        if (!shouldSkipIncrement) {
          updateFeaturesUsedToday(user, setUser);
        }
        updateStreak(user, setUser);
      }

      return true;
    } catch (error) {
      console.error("Error starting session:", error);
      Sentry.captureException(error, {
        tags: { action: "start_session" },
        extra: { subjectId, paperId, lessonId, practiceSessionId },
      });
      return false;
    }
  }, [
    sessionData,
    subjectId,
    paperId,
    lessonId,
    practiceSessionId,
    sessionType,
    user,
    setUser,
    hasActivePlan,
    isSubjectUnlocked,
  ]);

  const finishSession = useCallback(async (): Promise<FinishSessionResult> => {
    setIsLoading(true);
    if (!sessionData) {
      return { success: false };
    }

    if (sessionData.timeFinished) {
      return { success: true };
    }

    try {
      const persister = new Persister();

      // For mock sessions, answers are already saved incrementally via SaveManager.
      // Just mark the session as finished - SaveManager continues saving in background.
      if (sessionType === SessionType.MockSession) {
        if (!paperId) {
          console.error("Cannot finish mock session: paperId is required");
          toast.error("Failed to finish session");
          return { success: false };
        }

        await persister.markSessionFinished({
          subjectId,
          paperId,
          lessonId,
          practiceSessionId,
        });

        // Update local state with finished time
        setSessionData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            timeFinished: new Date().toISOString(),
          };
        });

        return { success: true };
      }

      // For other session types (PaperSession, etc.), use existing behavior
      // which includes auto-marking MCQ/SPR questions
      const questionsWithMarkingResults = sessionData.pages.flatMap((page) =>
        page.type === QuestionSessionPageType.Question
          ? (page.content as QuestionGroup).questions.map((question) => {
              const q = question as QuestionWithMarkingResult;
              // mark if not already marked (only for paper sessions, not mocks)
              if (
                sessionType === SessionType.PaperSession &&
                !q.isMarked &&
                (q.questionType === "mcq" || q.questionType === "spr")
              ) {
                try {
                  const markingResult = markSatQuestion({
                    questionLegacyId: q.legacyId,
                    question: q.questionText,
                    correctAnswer: q.correctAnswer,
                    markMax: q.maxMark,
                    userAnswer: q.userAnswer,
                    canvas: q.canvas,
                    questionType: q.questionType,
                    subLessonId: q.subLessonId,
                  });
                  return { ...q, ...markingResult };
                } catch (error) {
                  console.error(`Error marking question ${q.legacyId}:`, error);
                }
              }
              return q;
            })
          : []
      );

      await persister.finishSession(
        { subjectId, paperId, lessonId, practiceSessionId },
        sessionData,
        questionsWithMarkingResults
      );

      // If any questions in this session are marked, refetch user to update feature usage
      const hasMarkedAnswer = questionsWithMarkingResults.some(
        (q) => q.isMarked || typeof q.userMark === "number"
      );

      if (hasMarkedAnswer) {
        void refetchUser();
      }

      // Update session state with marked questions and set finished time locally
      setSessionData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeFinished: prev.timeFinished || new Date().toISOString(),
          pages: prev.pages.map((page) => {
            if (page.type !== QuestionSessionPageType.Question) return page;
            const questionGroup = page.content as QuestionGroup;
            return {
              ...page,
              content: {
                ...questionGroup,
                questions: questionGroup.questions.map((question) => {
                  const markedQuestion = questionsWithMarkingResults.find(
                    (q) => q.legacyId === question.legacyId
                  );
                  return markedQuestion || question;
                }),
              },
            };
          }),
        };
      });

      return { success: true };
    } catch (error) {
      console.error("Error finishing session:", error);
      Sentry.captureException(error, {
        tags: { action: "finish_session" },
        extra: { subjectId, paperId, lessonId, practiceSessionId },
      });
      toast.error("Failed to finish session");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [
    sessionData,
    subjectId,
    paperId,
    lessonId,
    practiceSessionId,
    sessionType,
    refetchUser,
  ]);

  const updateQuestionUserAnswer = useCallback(
    (
      questionGroupId: number | null | undefined,
      questionLegacyId: string,
      answer: string | string[] | { left?: string; right?: string }
    ) => {
      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;
            const isTargetGroup =
              questionGroupId != null
                ? questionGroup.id === questionGroupId
                : questionGroup.questions.some(
                    (q) => q.legacyId === questionLegacyId
                  );
            if (!isTargetGroup) return page;
            const questions = questionGroup.questions.map((q) => {
              if (q.legacyId !== questionLegacyId) return q;
              return { ...q, userAnswer: answer };
            });
            const updatedGroup = { ...questionGroup, questions };
            if (sessionType === SessionType.PracticeSession) {
              return {
                ...page,
                content: updatedGroup,
              };
            }
            return {
              ...page,
              content: updatedGroup,
              progress: calculateQuestionGroupProgress(updatedGroup),
            };
          }),
        };
      });

      const existingQuestion = sessionDataRef.current?.pages
        .flatMap((page) =>
          page.type === QuestionSessionPageType.Question
            ? (page.content as QuestionGroup).questions
            : []
        )
        .find((q) => q.legacyId === questionLegacyId);

      if (existingQuestion) {
        const isFirstAnswer = !questionHasExistingAnswer(
          existingQuestion as QuestionWithMarkingResult
        );
        addPendingSave({
          ...existingQuestion,
          userAnswer: answer,
          questionLegacyId: questionLegacyId,
          timestamp: Date.now(),
          isFirstAnswer,
        } as QuestionWithMarkingResult);
      }
    },
    [sessionType, addPendingSave]
  );

  const updateQuestionCanvas = useCallback(
    (
      questionGroupId: number | null | undefined,
      questionLegacyId: string,
      canvas: Canvas
    ) => {
      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;
            const isTargetGroup =
              questionGroupId != null
                ? questionGroup.id === questionGroupId
                : questionGroup.questions.some(
                    (q) => q.legacyId === questionLegacyId
                  );
            if (!isTargetGroup) return page;
            const questions = questionGroup.questions.map((q) => {
              if (q.legacyId !== questionLegacyId) return q;
              return { ...q, canvas };
            });
            const updatedGroup = { ...questionGroup, questions };
            if (sessionType === SessionType.PracticeSession) {
              return {
                ...page,
                content: updatedGroup,
              };
            }
            return {
              ...page,
              content: updatedGroup,
              progress: calculateQuestionGroupProgress(updatedGroup),
            };
          }),
        };
      });

      // Get the question data from sessionDataRef for base properties, but use the fresh canvas
      const existingQuestion = sessionDataRef.current?.pages
        .flatMap((page) =>
          page.type === QuestionSessionPageType.Question
            ? (page.content as QuestionGroup).questions
            : []
        )
        .find((q) => q.legacyId === questionLegacyId);

      if (existingQuestion) {
        // Only save if meaningful canvas content actually changed
        // This prevents saving when user just clicks to add an empty textbox
        const existingQuestionWithResult =
          existingQuestion as QuestionWithMarkingResult;
        if (
          hasCanvasContentChanged(existingQuestionWithResult.canvas, canvas)
        ) {
          const isFirstAnswer = !questionHasExistingAnswer(
            existingQuestionWithResult
          );
          addPendingSave({
            ...existingQuestionWithResult,
            canvas, // Use the fresh canvas parameter, not existingQuestion.canvas!
            questionLegacyId: questionLegacyId,
            timestamp: Date.now(),
            isFirstAnswer,
          } as QuestionWithMarkingResult);
        }
      }
    },
    [sessionType, addPendingSave]
  );

  const updateQuestionDesmosExpressions = useCallback(
    (
      questionGroupId: number | null | undefined,
      questionLegacyId: string,
      expressions: any[]
    ) => {
      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;
            const isTargetGroup =
              questionGroupId != null
                ? questionGroup.id === questionGroupId
                : questionGroup.questions.some(
                    (q) => q.legacyId === questionLegacyId
                  );
            if (!isTargetGroup) return page;
            const questions = questionGroup.questions.map((q) => {
              if (q.legacyId !== questionLegacyId) return q;
              return { ...q, desmosExpressions: expressions };
            });
            const updatedGroup = { ...questionGroup, questions };
            if (sessionType === SessionType.PracticeSession) {
              return {
                ...page,
                content: updatedGroup,
              };
            }
            return {
              ...page,
              content: updatedGroup,
              progress: calculateQuestionGroupProgress(updatedGroup),
            };
          }),
        };
      });

      const existingQuestion = sessionDataRef.current?.pages
        .flatMap((page) =>
          page.type === QuestionSessionPageType.Question
            ? (page.content as QuestionGroup).questions
            : []
        )
        .find((q) => q.legacyId === questionLegacyId);

      if (existingQuestion) {
        const isFirstAnswer = !questionHasExistingAnswer(
          existingQuestion as QuestionWithMarkingResult
        );
        addPendingSave({
          ...existingQuestion,
          desmosExpressions: expressions,
          questionLegacyId: questionLegacyId,
          timestamp: Date.now(),
          isFirstAnswer,
        } as QuestionWithMarkingResult);
      }
    },
    [sessionType, addPendingSave]
  );

  const updateQuestionMarkedForReview = useCallback(
    (questionGroupId: number | null | undefined, questionLegacyId: string) => {
      // Capture the toggled value and question from within the updater to avoid
      // reading stale values from sessionDataRef (which is only synced after render)
      let newIsMarkedForReview: boolean | undefined;
      let questionToSave: QuestionWithMarkingResult | undefined;

      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;
            const isTargetGroup =
              questionGroupId != null
                ? questionGroup.id === questionGroupId
                : questionGroup.questions.some(
                    (question) => question.legacyId === questionLegacyId
                  );
            if (!isTargetGroup) return page;
            const questions = questionGroup.questions.map((question) => {
              if (question.legacyId !== questionLegacyId) return question;
              // Capture the question and toggled value for the save
              const questionWithMarkingResult =
                question as QuestionWithMarkingResult;
              questionToSave = questionWithMarkingResult;
              newIsMarkedForReview =
                !questionWithMarkingResult.isMarkedForReview;
              return { ...question, isMarkedForReview: newIsMarkedForReview };
            });
            const updatedGroup = { ...questionGroup, questions };
            if (sessionType === SessionType.PracticeSession) {
              return {
                ...page,
                content: updatedGroup,
              };
            }
            return {
              ...page,
              content: updatedGroup,
              progress: calculateQuestionGroupProgress(updatedGroup),
            };
          }),
        };
      });

      // Use the captured values from the updater to ensure we save the correct toggled value
      if (questionToSave && newIsMarkedForReview !== undefined) {
        // Mark-for-review is not an answer, so don't trigger statistics update
        addPendingSave({
          ...questionToSave,
          isMarkedForReview: newIsMarkedForReview,
          questionLegacyId: questionLegacyId,
          timestamp: Date.now(),
          isFirstAnswer: false,
        } as QuestionWithMarkingResult);
      }
    },
    [sessionType, addPendingSave]
  );

  const updateQuestionDecorations = useCallback(
    (
      questionGroupId: number | null | undefined,
      questionLegacyId: string,
      decorations: Decoration[]
    ) => {
      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;
            const isTargetGroup =
              questionGroupId != null
                ? questionGroup.id === questionGroupId
                : questionGroup.questions.some(
                    (q) => q.legacyId === questionLegacyId
                  );
            if (!isTargetGroup) return page;
            const questions = questionGroup.questions.map((q) => {
              if (q.legacyId !== questionLegacyId) return q;
              return { ...q, decorations };
            });
            const updatedGroup = { ...questionGroup, questions };
            if (sessionType === SessionType.PracticeSession) {
              return {
                ...page,
                content: updatedGroup,
              };
            }
            return {
              ...page,
              content: updatedGroup,
              progress: calculateQuestionGroupProgress(updatedGroup),
            };
          }),
        };
      });

      const existingQuestion = sessionDataRef.current?.pages
        .flatMap((page) =>
          page.type === QuestionSessionPageType.Question
            ? (page.content as QuestionGroup).questions
            : []
        )
        .find((q) => q.legacyId === questionLegacyId);

      if (existingQuestion) {
        // Decorations are not an answer, so don't trigger statistics update
        addPendingSave({
          ...existingQuestion,
          decorations,
          questionLegacyId: questionLegacyId,
          timestamp: Date.now(),
          isFirstAnswer: false,
        } as QuestionWithMarkingResult);
      }
    },
    [sessionType, addPendingSave]
  );

  // Helper function to update mastery scores
  const updateMasteryScores = useCallback(
    (
      currentSubLessonMasteryScores: MasteryScore[],
      question: Question | QuestionWithMarkingResult,
      markingResult: MarkingResult,
      lessonId?: string
    ) => {
      const newSubLessonMasteryScores = [...currentSubLessonMasteryScores];
      const isCorrect = question.correctAnswer === markingResult.userAnswer;
      const subLessonMasteryChange = calculateMasteryChange(
        question.difficulty || QuestionDifficulty.MEDIUM,
        isCorrect
      );

      // Update sublesson mastery
      const subLessonIndex = newSubLessonMasteryScores.findIndex(
        (ms) => ms.legacyId === question.subLessonId
      );
      const currentSubLessonMastery =
        subLessonIndex >= 0
          ? newSubLessonMasteryScores[subLessonIndex].mastery
          : 0;
      const newSubLessonMastery = Math.max(
        0,
        Math.min(1, currentSubLessonMastery + subLessonMasteryChange)
      );

      if (subLessonIndex >= 0) {
        newSubLessonMasteryScores[subLessonIndex].mastery = newSubLessonMastery;
      } else {
        newSubLessonMasteryScores.push({
          legacyId: question.subLessonId || "",
          mastery: newSubLessonMastery,
        });
      }

      // Calculate average mastery score
      const averageSubLessonMastery =
        newSubLessonMasteryScores.length > 0
          ? newSubLessonMasteryScores.reduce(
              (sum, mastery) => sum + mastery.mastery,
              0
            ) / newSubLessonMasteryScores.length
          : 0;

      // Calculate lesson mastery (but don't add it to the array)
      let lessonMastery = 0;
      if (lessonId) {
        if (user?.hasCompletedMapOnboarding) {
          lessonMastery = Math.max(0, Math.min(1, averageSubLessonMastery));
        } else {
          lessonMastery = 0.5;
        }
      }

      return {
        masteryScores: {
          subLessonMasteryScores: newSubLessonMasteryScores,
          lessonMasteryScore: lessonMastery,
        },
      };
    },
    [user?.hasCompletedMapOnboarding]
  );

  const updateQuestionMarkingResult = useCallback(
    async (
      questionGroupId: number | null | undefined,
      questionLegacyId: string,
      markingResult: MarkingResult
    ) => {
      // Get current session data
      const currentSessionData = sessionDataRef.current;
      if (!currentSessionData) return;

      // Update pages with marking result
      const updatedPages = currentSessionData.pages.map((page) => {
        if (page.type !== QuestionSessionPageType.Question) return page;
        const questionGroup = page.content as QuestionGroup;
        const isTargetGroup =
          questionGroupId != null
            ? questionGroup.id === questionGroupId
            : questionGroup.questions.some(
                (q) => q.legacyId === questionLegacyId
              );
        if (!isTargetGroup) return page;

        const questions = questionGroup.questions.map((q) => {
          if (q.legacyId !== questionLegacyId) return q;

          const qw = q as QuestionWithMarkingResult;

          // Detect transition from unmarked -> marked for optimistic feature-usage update
          const wasMarkedBefore =
            qw.isMarked === true || typeof qw.userMark === "number";
          const isMarkedNow =
            markingResult.isMarked === true ||
            typeof markingResult.userMark === "number";

          if (!wasMarkedBefore && isMarkedNow && user) {
            // Skip increment for premium users or Medly Mondays unlocked subjects
            // Papers should always count (no subject unlock for papers)
            const isPaperSession = sessionType === SessionType.PaperSession;
            const shouldSkipIncrement =
              hasActivePlan ||
              (!isPaperSession && isSubjectUnlocked(subjectId));

            if (!shouldSkipIncrement) {
              // Optimistically increment featuresUsedToday; backend is the source of truth
              // and will correct this value on the next refetchUser()
              updateFeaturesUsedToday(user, setUser);
            }
          }

          // Ensure answerAttempts reflect retries locally so Review tab can compute marks gained immediately
          let updatedAnswerAttempts: AnswerAttempt[] | undefined =
            qw.answerAttempts ? [...qw.answerAttempts] : undefined;

          // If no attempts recorded yet but question was previously marked, seed the first attempt from existing data
          if (!updatedAnswerAttempts && qw.isMarked) {
            const firstAttempt: AnswerAttempt = {
              attemptNumber: 1,
              timestamp: new Date().toISOString(),
              annotatedAnswer:
                typeof qw.annotatedAnswer === "string"
                  ? qw.annotatedAnswer
                  : undefined,
              markingTable: qw.markingTable,
              userAnswer: qw.userAnswer,
              userMark: qw.userMark,
              canvas: qw.canvas,
            };
            updatedAnswerAttempts = [firstAttempt];
          }

          // When a new marking result arrives with a userMark, append it as a new attempt locally
          if (markingResult.userMark !== undefined) {
            const nextAttemptNumber = (updatedAnswerAttempts?.length || 0) + 1;
            const newAttempt: AnswerAttempt = {
              attemptNumber: nextAttemptNumber,
              timestamp: new Date().toISOString(),
              annotatedAnswer:
                typeof markingResult.annotatedAnswer === "string"
                  ? markingResult.annotatedAnswer
                  : undefined,
              markingTable: markingResult.markingTable,
              userAnswer: markingResult.userAnswer,
              userMark: markingResult.userMark,
              canvas: markingResult.canvas,
            };
            updatedAnswerAttempts = [
              ...(updatedAnswerAttempts || []),
              newAttempt,
            ];
          }

          return {
            ...qw,
            ...markingResult,
            ...(updatedAnswerAttempts
              ? { answerAttempts: updatedAnswerAttempts }
              : {}),
          } as QuestionWithMarkingResult;
        });

        const updatedGroup = { ...questionGroup, questions };
        return {
          ...page,
          content: updatedGroup,
          ...(sessionType === SessionType.PracticeSession && {
            progress: calculateQuestionGroupProgress(updatedGroup),
          }),
        };
      });

      // Update mastery scores for PracticeSession
      let updatedSubLessonMasteryScores =
        currentSessionData.masteryScores?.subLessonMasteryScores || [];
      let updatedLessonMasteryScore = 0;

      // UK MASTERY TRACKING
      if (sessionType === SessionType.LessonSession) {
        // Find the question
        let foundQuestion;
        for (const page of updatedPages) {
          if (page.type !== "question") continue;
          const questionGroup = page.content as QuestionGroup;
          const isTargetGroup =
            questionGroupId != null
              ? questionGroup.id === questionGroupId
              : questionGroup.questions.some(
                  (q) => q.legacyId === questionLegacyId
                );
          if (!isTargetGroup) continue;
          foundQuestion = questionGroup.questions.find(
            (q) => q.legacyId === questionLegacyId
          );
          if (foundQuestion) break;
        }

        if (foundQuestion && markingResult.userMark !== undefined) {
          // Call knowledge modelling API for LessonSession only when we have an actual mark
          try {
            // Create temporary lesson_store with current lesson data
            const lesson_store = {
              [lessonId]: {
                lesson_id: lessonId,
                mu: currentSessionData.mu || 0,
                sigma: currentSessionData.sigma || 1,
                p_mastery: currentSessionData.p_mastery || 0,
                mastery_tier: Math.floor(currentSessionData.mastery_tier || 1),
                rank: Math.floor(currentSessionData.rank || 0),
              },
            };

            const lesson_ids =
              foundQuestion.lessonLegacyIds &&
              foundQuestion.lessonLegacyIds.length > 0
                ? foundQuestion.lessonLegacyIds
                : lessonId
                  ? [lessonId]
                  : [];

            // Only call the API if we have valid lesson IDs
            if (lesson_ids.length > 0) {
              updateKnowledgeModel(
                {
                  lesson_store,
                  lesson_ids,
                  marks: markingResult.userMark,
                  max_marks: foundQuestion.maxMark,
                  n_lessons: 5,
                },
                {
                  lessonId: lessonId,
                  questionId: foundQuestion.legacyId,
                  userMark: markingResult.userMark,
                  maxMark: foundQuestion.maxMark,
                }
              );
            }
          } catch (error) {
            // Error handling is done by the hook callbacks
            console.error("Failed to update knowledge model:", error);
          }
        }
      }

      // SAT MASTERY TRACKING
      if (
        sessionType === SessionType.PracticeSession &&
        currentSessionData.masteryScores
      ) {
        // Find the question
        let foundQuestion;
        for (const page of updatedPages) {
          if (page.type !== "question") continue;
          const questionGroup = page.content as QuestionGroup;
          const isTargetGroup =
            questionGroupId != null
              ? questionGroup.id === questionGroupId
              : questionGroup.questions.some(
                  (q) => q.legacyId === questionLegacyId
                );
          if (!isTargetGroup) continue;
          foundQuestion = questionGroup.questions.find(
            (q) => q.legacyId === questionLegacyId
          );
          if (foundQuestion) break;
        }

        if (foundQuestion) {
          const masteryResult = updateMasteryScores(
            currentSessionData.masteryScores.subLessonMasteryScores,
            foundQuestion,
            markingResult,
            lessonId
          );
          updatedSubLessonMasteryScores =
            masteryResult.masteryScores.subLessonMasteryScores;
          updatedLessonMasteryScore =
            masteryResult.masteryScores.lessonMasteryScore;
        }
      }

      // Calculate the new session data
      const newSessionData = {
        ...currentSessionData,
        pages: updatedPages,
        masteryScores: {
          subLessonMasteryScores: updatedSubLessonMasteryScores,
          lessonMasteryScore: updatedLessonMasteryScore,
        },
      };

      // Update session data with the pre-calculated result
      setSessionData(newSessionData);

      try {
        // If a question has just been marked, consider that as completing a question
        markComplete("complete-question");
      } catch (e) {
        // no-op
      }

      // Update pending saves and flush immediately (marking is a priority save)
      const existingQuestion = sessionDataRef.current?.pages
        .flatMap((page) =>
          page.type === QuestionSessionPageType.Question
            ? (page.content as QuestionGroup).questions
            : []
        )
        .find((q) => q.legacyId === questionLegacyId);

      if (existingQuestion) {
        const isFirstAnswer = !questionHasExistingAnswer(
          existingQuestion as QuestionWithMarkingResult
        );
        addPendingSave({
          ...existingQuestion,
          ...markingResult,
          questionLegacyId: questionLegacyId,
          timestamp: Date.now(),
          isFirstAnswer,
        } as QuestionWithMarkingResult);

        // Flush pending saves immediately (marking is critical)
        flushPendingSaves();
      }
    },
    [
      sessionType,
      lessonId,
      subjectId,
      updateMasteryScores,
      markComplete,
      flushPendingSaves,
      addPendingSave,
      user,
      setUser,
      hasActivePlan,
      isSubjectUnlocked,
    ]
  );

  const resetQuestionGroup = useCallback(
    (questionGroupId: number | null | undefined) => {
      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;
            const isTargetGroup =
              questionGroupId === null ||
              questionGroupId === undefined ||
              questionGroup.id === questionGroupId;

            if (!isTargetGroup) return page;

            return {
              ...page,
              content: {
                ...questionGroup,
                questions: questionGroup.questions.map((question) => {
                  // Clear user-generated data but preserve original question data using destructuring
                  const {
                    userAnswer,
                    canvas,
                    decorations,
                    userMark,
                    isMarked,
                    isMarkedForReview,
                    annotatedAnswer,
                    markingTable,
                    highlights,
                    annotations,
                    messages,
                    durationSpentInSeconds,
                    ao_analysis,
                    desmosExpressions,
                    ...resetQuestion
                  } = question;

                  return resetQuestion;
                }),
              },
            };
          }),
        };
      });
    },
    []
  );

  const resetIndividualQuestion = useCallback(
    (questionGroupId: number, questionLegacyId: string) => {
      setSessionData((prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pages: prev.pages.map((page) => {
            if (page.type !== "question") return page;
            const questionGroup = page.content as QuestionGroup;

            if (questionGroup.id !== questionGroupId) return page;

            return {
              ...page,
              content: {
                ...questionGroup,
                questions: questionGroup.questions.map((question) => {
                  if (question.legacyId !== questionLegacyId) return question;

                  // Clear user-generated data but preserve original question data using destructuring
                  const {
                    userAnswer,
                    canvas,
                    decorations,
                    userMark,
                    isMarked,
                    isMarkedForReview,
                    annotatedAnswer,
                    markingTable,
                    highlights,
                    annotations,
                    messages,
                    durationSpentInSeconds,
                    ao_analysis,
                    desmosExpressions,
                    ...resetQuestion
                  } = question;

                  return resetQuestion;
                }),
              },
            };
          }),
        };
      });
    },
    []
  );

  return {
    sessionData,
    isLoading,
    error,
    saveState,
    currentPageIndex,
    setCurrentPageIndex,
    startSession,
    finishSession,
    updateQuestionUserAnswer,
    updateQuestionCanvas,
    updateQuestionDecorations,
    updateQuestionMarkingResult,
    updateQuestionDesmosExpressions,
    updateQuestionMarkedForReview,
    resetQuestionGroup,
    resetIndividualQuestion,
    forceSave: flushPendingSaves,
  };
};
