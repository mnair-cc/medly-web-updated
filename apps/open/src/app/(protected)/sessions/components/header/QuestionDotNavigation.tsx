import React from "react";
import { QuestionWithMarkingResult, QuestionGroup } from "@/app/types/types";
import {
  MockPage,
  QuestionSessionPageType,
} from "@/app/(protected)/sessions/types";
import { useUser } from "@/app/_context/UserProvider";
import ChevronLeftIcon from "@/app/_components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/app/_components/icons/ChevronRightIcon";

import { useRef, useEffect, useMemo, useState } from "react";
import DifficultyIcon from "@/app/_components/icons/DifficultyIcon";
import LearnIcon from "@/app/_components/icons/LearnIcon";

const MobileChevronNavigation = ({
  currentIndex,
  isMarking,
  setCurrentQuestionIndex,
  pages,
  questionPages,
  textbookPageIndex,
  learnPageIndex,
}: {
  currentIndex: number;
  isMarking: boolean;
  setCurrentQuestionIndex: (index: number) => void;
  pages: MockPage[];
  questionPages: MockPage[];
  textbookPageIndex: number;
  learnPageIndex: number;
}) => {
  // Check if we're on a question page (not textbook or learn)
  const isOnQuestionPage =
    currentIndex !== textbookPageIndex && currentIndex !== learnPageIndex;

  // Calculate current question index (1-based) within question pages only
  const currentQuestionNumber = useMemo(() => {
    if (!isOnQuestionPage) return 0;
    const questionPagesBeforeCurrent = pages
      .slice(0, currentIndex + 1)
      .filter((page) => page.type === QuestionSessionPageType.Question).length;
    return questionPagesBeforeCurrent;
  }, [currentIndex, pages, isOnQuestionPage]);

  // Only show when on question pages
  if (!isOnQuestionPage) {
    return null;
  }

  return (
    <div className="flex flex-row items-center gap-1">
      <button
        onClick={() => {
          if (isMarking) return;
          // Find previous question page
          for (let i = currentIndex - 1; i >= 0; i--) {
            if (pages[i].type === QuestionSessionPageType.Question) {
              setCurrentQuestionIndex(i);
              break;
            }
          }
        }}
        className={`rounded-[8px] p-1 min-w-[24px] ${
          isMarking || currentQuestionNumber <= 1
            ? "cursor-not-allowed opacity-20"
            : "cursor-pointer hover:bg-[#F9F9FB]"
        }`}
        disabled={isMarking || currentQuestionNumber <= 1}
        aria-label="Previous question"
      >
        <ChevronLeftIcon />
      </button>

      <div className="font-rounded-bold text-[15px] text-center">
        {currentQuestionNumber}/{questionPages.length}
      </div>

      <button
        onClick={() => {
          if (isMarking) return;
          // Find next question page
          for (let i = currentIndex + 1; i < pages.length; i++) {
            if (pages[i].type === QuestionSessionPageType.Question) {
              setCurrentQuestionIndex(i);
              break;
            }
          }
        }}
        className={`rounded-[8px] p-1 ${
          isMarking || currentQuestionNumber >= questionPages.length
            ? "cursor-not-allowed opacity-20"
            : "cursor-pointer hover:bg-[#F9F9FB]"
        }`}
        disabled={isMarking || currentQuestionNumber >= questionPages.length}
        aria-label="Next question"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
};

const QuestionDotNavigation = ({
  currentIndex,
  isMarking,
  setCurrentQuestionIndex,
  pages,
  mode = "practice",
}: {
  currentIndex: number;
  isMarking: boolean;
  setCurrentQuestionIndex: (index: number) => void;
  pages: MockPage[];
  mode?: "learn" | "practice";
}) => {
  const { user } = useUser();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter only question pages (textbook is shown as separate button)
  const questionPages = useMemo(
    () =>
      pages.filter((page) => page.type === QuestionSessionPageType.Question),
    [pages]
  );

  // Check if there are any questions with stages (for difficulty levels)
  const hasQuestionsWithStages = useMemo(() => {
    return questionPages.some((page) => {
      const group = page.content as QuestionGroup;
      return group?.stage !== undefined;
    });
  }, [questionPages]);

  // Get current stage from current page
  const currentPage = pages[currentIndex];
  const currentStage =
    currentPage?.type === QuestionSessionPageType.Question
      ? (currentPage.content as QuestionGroup)?.stage
      : undefined;

  // Check if there's a textbook page in the pages array
  const textbookPageIndex = useMemo(() => {
    return pages.findIndex(
      (page) => page.type === QuestionSessionPageType.Textbook
    );
  }, [pages]);

  const hasTextbookPage = textbookPageIndex !== -1;

  // Check if we're on the textbook page
  const isOnTextbookPage =
    hasTextbookPage && currentIndex === textbookPageIndex;

  // Check if there's a learn page in the pages array
  const learnPageIndex = useMemo(() => {
    return pages.findIndex(
      (page) => page.type === QuestionSessionPageType.Learn
    );
  }, [pages]);

  const hasLearnPage = learnPageIndex !== -1;

  // Check if we're on the learn page
  const isOnLearnPage = hasLearnPage && currentIndex === learnPageIndex;

  // Filter question pages by current stage (only if in practice mode and stage is defined)
  const filteredQuestionPages = useMemo(() => {
    return mode === "practice" && currentStage !== undefined
      ? questionPages.filter((page) => {
        const group = page.content as QuestionGroup;
        return group.stage === currentStage;
      })
      : questionPages;
  }, [mode, currentStage, questionPages]);

  // Create mapping from filtered index to actual page index
  const filteredToActualIndex = useMemo(
    () =>
      filteredQuestionPages.map((filteredPage) =>
        pages.findIndex((page) => page === filteredPage)
      ),
    [filteredQuestionPages, pages]
  );

  // Find current index in filtered pages
  const currentFilteredIndex = useMemo(
    () =>
      filteredToActualIndex.findIndex(
        (actualIdx) => actualIdx === currentIndex
      ),
    [filteredToActualIndex, currentIndex]
  );

  useEffect(() => {
    dotRefs.current = dotRefs.current.slice(0, filteredQuestionPages.length);
  }, [filteredQuestionPages.length]);

  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (dotRefs.current[currentFilteredIndex] && currentFilteredIndex >= 0) {
      const behavior = didInitialScrollRef.current ? "smooth" : "auto";
      dotRefs.current[currentFilteredIndex]?.scrollIntoView({
        behavior: behavior as ScrollBehavior,
        block: "nearest",
        inline: "center",
      });
      didInitialScrollRef.current = true;
    }
  }, [currentFilteredIndex]);

  // Helper function to get difficulty level from stage
  const getDifficultyFromStage = (
    stage: number | undefined
  ): "easy" | "medium" | "hard" | null => {
    if (stage === 1) return "easy";
    if (stage === 2) return "medium";
    if (stage === 3) return "hard";
    return null;
  };

  // Get current, previous and next difficulty
  const currentDifficulty = getDifficultyFromStage(currentStage);
  const prevStage =
    currentStage !== undefined && currentStage > 1
      ? currentStage - 1
      : undefined;
  const prevDifficulty = getDifficultyFromStage(prevStage);
  const nextStage =
    currentStage !== undefined && currentStage < 3
      ? currentStage + 1
      : undefined;
  const nextDifficulty = getDifficultyFromStage(nextStage);

  // Helper function to determine if a question group is unanswered
  const isGroupUnanswered = (questionGroup: QuestionGroup): boolean => {
    if (!questionGroup.questions || questionGroup.questions.length === 0) {
      return true;
    }
    // A group is unanswered if at least one question has no userMark defined
    return !questionGroup.questions.some((q) => q.userMark !== undefined);
  };

  // Helper function to find first unanswered question of a specific stage
  const getFirstUnansweredQuestionIndexOfStage = (
    stage: number
  ): number | null => {
    // First, try to find the first unanswered question of the stage
    const firstUnansweredPageOfStage = questionPages.find((page) => {
      const group = page.content as QuestionGroup;
      return group?.stage === stage && isGroupUnanswered(group);
    });

    if (firstUnansweredPageOfStage) {
      return pages.findIndex((page) => page === firstUnansweredPageOfStage);
    }

    // If all questions are answered, return the first question of the stage
    const firstPageOfStage = questionPages.find((page) => {
      const group = page.content as QuestionGroup;
      return group.stage === stage;
    });

    if (!firstPageOfStage) return null;
    return pages.findIndex((page) => page === firstPageOfStage);
  };

  // Helper function to find first question of next stage
  const getNextStageFirstQuestionIndex = (): number | null => {
    if (nextStage === undefined) return null;

    const nextStageFirstPage = questionPages.find((page) => {
      const group = page.content as QuestionGroup;
      return group.stage === nextStage;
    });

    if (!nextStageFirstPage) return null;
    return pages.findIndex((page) => page === nextStageFirstPage);
  };

  // Helper function to find last question of previous stage
  const getPrevStageLastQuestionIndex = (): number | null => {
    if (prevStage === undefined) return null;

    // Find all questions of previous stage
    const prevStagePages = questionPages.filter((page) => {
      const group = page.content as QuestionGroup;
      return group.stage === prevStage;
    });

    if (prevStagePages.length === 0) return null;

    // Get the last page of previous stage
    const prevStageLastPage = prevStagePages[prevStagePages.length - 1];
    return pages.findIndex((page) => page === prevStageLastPage);
  };

  // Check if we're on the last question of the current stage
  const isOnLastQuestionOfStage =
    currentFilteredIndex === filteredQuestionPages.length - 1;

  // Check if we're on the first question of the current stage
  const isOnFirstQuestionOfStage = currentFilteredIndex === 0;

  // Helper function to determine the color status of a question group
  const getGroupStatus = (
    questionGroup: QuestionGroup
  ): "all-correct" | "all-incorrect" | "mixed" | "unanswered" => {
    if (!questionGroup.questions || questionGroup.questions.length === 0) {
      return "unanswered";
    }

    const questions = questionGroup.questions as QuestionWithMarkingResult[];

    // Check if all questions are marked (have userMark defined)
    const allMarked = questions.some((q) => q.userMark !== undefined);
    if (!allMarked) {
      return "unanswered";
    }

    // Calculate marking status for ALL questions in the group
    const isAllCorrect = questions.every((q) => q.userMark === q.maxMark);
    const isAllIncorrect = questions.every((q) => q.userMark === 0);

    if (isAllCorrect) {
      return "all-correct";
    } else if (isAllIncorrect) {
      return "all-incorrect";
    } else {
      return "mixed";
    }
  };

  // Defer expensive group-status calculation until after first paint to improve perceived TTI
  const [showStatuses, setShowStatuses] = useState(false);
  useEffect(() => {
    try {
      // Use idle time if available, otherwise schedule next tick
      // @ts-ignore - requestIdleCallback may not exist in all environments
      const ric = window.requestIdleCallback
        ? // @ts-ignore
        window.requestIdleCallback(() => setShowStatuses(true))
        : setTimeout(() => setShowStatuses(true), 0);
      return () => {
        // @ts-ignore
        if (window.cancelIdleCallback && typeof ric === "number") {
          // noop
        }
      };
    } catch {
      setShowStatuses(true);
    }
  }, []);

  return (
    <div className="flex flex-row items-center gap-1 overflow-y-hidden justify-center w-full">
      <div className="flex flex-row items-center gap-1">
        <div className="hidden sm:flex">
          <button
            onClick={() => {
              if (isMarking) return;
              // Simple sequential navigation: go to previous page
              if (currentIndex > 0) {
                setCurrentQuestionIndex(currentIndex - 1);
              }
            }}
            className={`rounded-[8px] p-1 ${isMarking || currentIndex === 0
              ? "cursor-not-allowed opacity-20"
              : "cursor-pointer hover:bg-[#F9F9FB]"
              }`}
            disabled={isMarking || currentIndex === 0}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2">
          {hasTextbookPage && (
            <button
              onClick={() => {
                if (isMarking) return;
                // Navigate to textbook page
                setCurrentQuestionIndex(textbookPageIndex);
              }}
              className={`flex items-center justify-center p-1 rounded-[8px] hover:bg-[#F9F9FB] ${isMarking ? "cursor-not-allowed opacity-20" : "cursor-pointer"}`}
              disabled={isMarking}
              aria-label="Textbook"
            >
              <div className="w-[28px] h-[28px] flex items-center justify-center">
                <svg
                  width="19"
                  height="18"
                  viewBox="0 0 19 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.5199 17.2046H15.1635C17.0619 17.2046 18.0463 16.2202 18.0463 14.3481V3.65184C18.0463 1.77098 17.0619 0.795395 15.1635 0.795395H4.5199C2.62146 0.795395 1.63708 1.77098 1.63708 3.65184V14.3481C1.63708 16.229 2.62146 17.2046 4.5199 17.2046ZM4.62536 15.4819C3.80797 15.4819 3.35974 15.0513 3.35974 14.1987V3.79246C3.35974 2.93992 3.80797 2.51805 4.62536 2.51805H15.058C15.8666 2.51805 16.3236 2.93992 16.3236 3.79246V14.1987C16.3236 15.0513 15.8666 15.4819 15.058 15.4819H4.62536ZM5.05603 4.86474V6.9038C5.05603 7.4751 5.39001 7.8003 5.95246 7.8003H7.99157C8.56287 7.8003 8.89687 7.4751 8.89687 6.9038V4.86474C8.89687 4.29345 8.56287 3.96825 7.99157 3.96825H5.95246C5.39001 3.96825 5.05603 4.29345 5.05603 4.86474ZM5.60094 10.727H14.0209C14.3373 10.727 14.5746 10.4809 14.5746 10.1645C14.5746 9.8569 14.3373 9.6196 14.0209 9.6196H5.60094C5.27575 9.6196 5.03844 9.8569 5.03844 10.1645C5.03844 10.4809 5.27575 10.727 5.60094 10.727ZM5.60094 13.6274H11.8236C12.14 13.6274 12.3773 13.3813 12.3773 13.0737C12.3773 12.7573 12.14 12.5112 11.8236 12.5112H5.60094C5.27575 12.5112 5.03844 12.7573 5.03844 13.0737C5.03844 13.3813 5.27575 13.6274 5.60094 13.6274Z"
                    fill={mode !== "learn" ? "#D2D2D5" : "#05B0FF"}
                  />
                </svg>
              </div>
            </button>
          )}

          {hasLearnPage && (
            <button
              onClick={() => {
                if (isMarking) return;
                // Navigate to learn page
                setCurrentQuestionIndex(learnPageIndex);
              }}
              className={`flex items-center justify-center p-1 rounded-[8px] hover:bg-[#F9F9FB] ${isMarking ? "cursor-not-allowed opacity-20" : "cursor-pointer"}`}
              disabled={isMarking}
              aria-label="Learn"
            >
              <div className="w-[28px] h-[28px] flex items-center justify-center">
                <LearnIcon
                  width={19}
                  height={18}
                  fill={currentIndex === learnPageIndex ? "#05B0FF" : "#D2D2D5"}
                />
              </div>
            </button>
          )}

          {mode === "learn" && hasQuestionsWithStages && (
            <div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center relative mr-2">
                <div className="absolute text-[32px]">{user?.avatar}</div>
              </div>
            </div>
          )}

          {hasQuestionsWithStages && (
            <button
              onClick={() => {
                if (isMarking || !currentStage) return;
                const firstQuestionIndex =
                  getFirstUnansweredQuestionIndexOfStage(currentStage);
                if (firstQuestionIndex !== null) {
                  setCurrentQuestionIndex(firstQuestionIndex);
                }
              }}
              className={`flex items-center justify-center p-1 rounded-[8px] hover:bg-[#F9F9FB] ${isMarking ? "cursor-not-allowed opacity-20" : "cursor-pointer"}`}
              disabled={isMarking}
            >
              <DifficultyIcon level={currentDifficulty || "easy"} />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex flex-1 flex-row justify-start items-center scrollbar-hide overflow-x-scroll overflow-y-hidden h-10 relative"
        ref={scrollContainerRef}
      >
        <div className="flex flex-row max-w-10">
          {filteredQuestionPages.map((page, filteredIndex) => {
            const questionGroup = page.content as QuestionGroup;
            const groupStatus = showStatuses
              ? getGroupStatus(questionGroup)
              : "unanswered";
            const actualIndex = filteredToActualIndex[filteredIndex];

            return (
              <div
                key={actualIndex}
                ref={(el) => {
                  dotRefs.current[filteredIndex] = el;
                }}
                onClick={() => {
                  if (!isMarking) {
                    setCurrentQuestionIndex(actualIndex);
                  }
                }}
                className={`flex items-center justify-center p-1 px-2 rounded-full h-8 ${actualIndex === currentIndex ? "bg-white" : "bg-white"
                  } ${isMarking ? "cursor-not-allowed" : "cursor-pointer"}`}
                disabled={isMarking}
                tabIndex={isMarking ? -1 : 0}
                aria-label={`Question group ${filteredIndex + 1}`}
              >
                {actualIndex === currentIndex ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center relative">
                    <div className="absolute text-[32px]">{user?.avatar}</div>
                  </div>
                ) : groupStatus === "all-correct" ? (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 20 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.0879 9.6543C19.0879 14.6289 14.9746 18.7422 9.99121 18.7422C5.0166 18.7422 0.90332 14.6289 0.90332 9.6543C0.90332 4.67969 5.00781 0.566406 9.98242 0.566406C14.9658 0.566406 19.0879 4.67969 19.0879 9.6543Z"
                      fill="#E4FFB7"
                    />
                    <path
                      d="M9.79785 13.1348C9.61328 13.4248 9.34082 13.583 9.01562 13.583C8.69043 13.583 8.43555 13.4424 8.19824 13.1436L6.12402 10.6211C5.97461 10.4277 5.89551 10.2344 5.89551 10.0234C5.89551 9.58398 6.23828 9.23242 6.67773 9.23242C6.93262 9.23242 7.14355 9.3291 7.35449 9.60156L8.98926 11.667L12.4873 6.08594C12.6719 5.78711 12.9092 5.6377 13.1729 5.6377C13.5947 5.6377 13.9814 5.92773 13.9814 6.36719C13.9814 6.56934 13.8848 6.78027 13.7617 6.96484L9.79785 13.1348Z"
                      fill="#7CC500"
                    />
                  </svg>
                ) : groupStatus === "mixed" ? (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 20 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.0879 9.6543C19.0879 14.6289 14.9746 18.7422 9.99121 18.7422C5.0166 18.7422 0.90332 14.6289 0.90332 9.6543C0.90332 4.67969 5.00781 0.566406 9.98242 0.566406C14.9658 0.566406 19.0879 4.67969 19.0879 9.6543Z"
                      fill="#FDEBD7"
                    />
                    <path
                      d="M13.5586 10.6523H6.90527C6.37793 10.6523 6 10.3447 6 9.83496C6 9.31641 6.36914 9 6.90527 9H13.5586C14.1035 9 14.4639 9.31641 14.4639 9.83496C14.4639 10.3447 14.0859 10.6523 13.5586 10.6523Z"
                      fill="#FFA935"
                    />
                  </svg>
                ) : groupStatus === "all-incorrect" ? (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 9C18 13.9265 13.9285 18 8.99565 18C4.07153 18 0 13.9265 0 9C0 4.0735 4.06283 0 8.98695 0C13.9198 0 18 4.0735 18 9Z"
                      fill="#FDEEEE"
                    />
                    <path
                      d="M6.68848 12.1084C6.53906 12.2666 6.33691 12.3457 6.1084 12.3457C5.66016 12.3457 5.30859 11.9941 5.30859 11.5459C5.30859 11.335 5.39648 11.1328 5.55469 10.9922L7.85742 8.67188L5.55469 6.36035C5.39648 6.21094 5.30859 6.01758 5.30859 5.79785C5.30859 5.34961 5.66016 5.00684 6.1084 5.00684C6.33691 5.00684 6.52148 5.08594 6.6709 5.24414L8.99121 7.54688L11.3115 5.23535C11.4785 5.06836 11.6631 4.99805 11.8828 4.99805C12.3311 4.99805 12.6826 5.34961 12.6826 5.79785C12.6826 6.00879 12.6035 6.18457 12.4365 6.35156L10.125 8.67188L12.4365 10.9834C12.5859 11.1328 12.6738 11.3262 12.6738 11.5459C12.6738 11.9941 12.3223 12.3457 11.874 12.3457C11.6367 12.3457 11.4434 12.2578 11.2939 12.1084L8.99121 9.80566L6.68848 12.1084Z"
                      fill="#FF4B4C"
                    />
                  </svg>
                ) : (
                  // 'unanswered' status - grey circle
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M23.0879 13.6543C23.0879 18.6289 18.9746 22.7422 13.9912 22.7422C9.0166 22.7422 4.90332 18.6289 4.90332 13.6543C4.90332 8.67969 9.00781 4.56641 13.9824 4.56641C18.9658 4.56641 23.0879 8.67969 23.0879 13.6543Z"
                      fill="#F2F2F7"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-row items-center gap-1">
        {mode === "practice" && nextDifficulty && nextStage && (
          <button
            onClick={() => {
              if (isMarking) return;
              const firstQuestionIndex =
                getFirstUnansweredQuestionIndexOfStage(nextStage);
              if (firstQuestionIndex !== null) {
                setCurrentQuestionIndex(firstQuestionIndex);
              }
            }}
            className={`hidden sm:flex items-center justify-center p-1 rounded-[8px] hover:bg-[#F9F9FB] ${isMarking ? "cursor-not-allowed opacity-20" : "cursor-pointer"}`}
            disabled={isMarking}
          >
            <DifficultyIcon level={nextDifficulty} />
          </button>
        )}

        {/* Desktop: Next page chevron */}
        <div className="hidden sm:flex">
          <button
            onClick={() => {
              if (isMarking) return;
              // Simple sequential navigation: go to next page
              if (currentIndex < pages.length - 1) {
                setCurrentQuestionIndex(currentIndex + 1);
              }
            }}
            className={`rounded-[8px] p-1 ${isMarking || currentIndex >= pages.length - 1
              ? "cursor-not-allowed opacity-20"
              : "cursor-pointer hover:bg-[#F9F9FB]"
              }`}
            disabled={isMarking || currentIndex >= pages.length - 1}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Mobile: Chevron navigation with question number - right side */}
        <div className="flex sm:hidden">
          <MobileChevronNavigation
            currentIndex={currentIndex}
            isMarking={isMarking}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            pages={pages}
            questionPages={questionPages}
            textbookPageIndex={textbookPageIndex}
            learnPageIndex={learnPageIndex}
          />
        </div>
      </div>

      {/* <div className="flex flex-row items-center justify-center gap-1 ml-0">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.76855 9.875C7.76855 7.27344 9.31543 5.70898 11.9082 5.70898H18.9307V5.39258C18.9131 3.52051 17.9463 2.55371 16.083 2.55371H7.7334C5.85254 2.55371 4.87695 3.53809 4.87695 5.43652V17.3545C4.87695 19.2178 5.82617 20.2021 7.6543 20.2285H7.76855V9.875ZM23.1143 9.875C23.1143 7.97656 22.1387 6.99219 20.2578 6.99219H11.9082C10.0273 6.99219 9.05176 7.97656 9.05176 9.875V21.8721C9.05176 23.7705 10.0361 24.7549 11.9082 24.7549H20.2578C22.1299 24.7549 23.1143 23.7705 23.1143 21.8721V9.875Z" fill="#05B0FF" />
        </svg>
        <div className="font-rounded-bold">
          <span className="text-[#05B0FF] text-[22px]">
            {currentIndex + 1}
          </span>
          <span className="text-[#05B0FF] text-[12px]">
            /{pages.length}
          </span>
        </div>
      </div> */}
    </div>
  );
};

export default QuestionDotNavigation;