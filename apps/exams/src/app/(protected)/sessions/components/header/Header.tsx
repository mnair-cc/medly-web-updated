import React, { useState, useEffect } from "react";
import CrossIcon from "@/app/_components/icons/CrossIcon";
import {
  MockPage,
  SessionType,
  QuestionSessionPageType,
} from "@/app/(protected)/sessions/types";
import ProgressBarDivided from "./ProgressBarDivided";
import { SaveState } from "@/app/(protected)/sessions/hooks/useSession";
import moment from "moment";
import { formatTime } from "@/app/(protected)/sessions/utils";
import XPIcon from "@/app/_components/icons/XPIcon";
import EyeIcon from "@/app/_components/icons/EyeIcon";
import EyeSlashIcon from "@/app/_components/icons/EyeSlashIcon";
import AnnotateIcon from "@/app/_components/icons/AnnotateIcon";
import HamburgerIcon from "@/app/_components/icons/HamburgerIcon";
import { useUser } from "@/app/_context/UserProvider";
import { useRouter } from "next/navigation";
import Tooltip from "@/app/_components/Tooltip";
import Link from "next/link";
import ArrowLeftIcon from "@/app/_components/icons/ArrowLeftIcon";
import QuestionDotNavigation from "./QuestionDotNavigation";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";
import { useSubjectTheme } from "@/app/_hooks/useSubjectTheme";
import {
  deconstructSubjectLegacyId,
  lessonIdToSubjectId,
} from "@/app/_lib/utils/utils";
import { useGettingStartedProgress } from "@/app/_hooks/useGettingStartedSteps";
import { getEquationSheetUrlBySubjectId } from "../../utils/equationSheets";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import DifficultyIcon from "@/app/_components/icons/DifficultyIcon";
import LearnIcon from "@/app/_components/icons/LearnIcon";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import MedlyLogoIcon from "@/app/_components/icons/MedlyLogoIcon";

const Header = ({
  currentPageIndex,
  handleSetCurrentPageIndex,
  pages,
  hasStarted,
  hasFinished,
  isTimed,
  durationInMinutes,
  timeStarted,
  setIsExitConfirmationModalOpen,
  saveState,
  sessionType,
  handleSave,
  sessionTitle,
  sessionSubtitle,
  isAnnotating,
  setIsAnnotating,
  returnUrl,
  showCalculator = false,
  showReference = false,
  setIsCalculatorOpen,
  setIsReferenceOpen,
  showStrategy,
  setIsStrategyOpen,
  showCalculatorTooltip = false,
  isReadOnly,
  lessonId,
  paperId,
  subjectId: providedSubjectId,
  gcseHigher,
  isResultsModalOpen = false,
  onToggleResults,
  resultsDayInsights,
}: {
  currentPageIndex: number;
  handleSetCurrentPageIndex: (index: number) => void;
  pages: MockPage[];
  hasStarted: boolean;
  hasFinished: boolean;
  isTimed: boolean;
  durationInMinutes: number | null;
  timeStarted: string | null;
  setIsExitConfirmationModalOpen: (
    isExitConfirmationModalOpen: boolean
  ) => void;
  saveState: SaveState;
  sessionType: SessionType;
  handleSave: () => void;
  sessionTitle: string;
  sessionSubtitle: string;
  isAnnotating: boolean;
  setIsAnnotating: (isAnnotating: boolean) => void;
  returnUrl: string;
  showCalculator: boolean;
  showReference: boolean;
  showStrategy: boolean;
  setIsCalculatorOpen: (isCalculatorOpen: boolean) => void;
  setIsReferenceOpen: (isReferenceOpen: boolean) => void;
  setIsStrategyOpen: (isStrategyOpen: boolean) => void;
  showCalculatorTooltip: boolean;
  isReadOnly: boolean;
  lessonId?: string;
  paperId?: string;
  subjectId?: string;
  gcseHigher?: boolean;
  isResultsModalOpen?: boolean;
  onToggleResults: () => void;
  resultsDayInsights?: any;
}) => {
  const { user } = useUser();
  const router = useRouter();
  const { track } = useTracking();
  const { openSidebar, semiOpenSidebar, sidebarState } = useSidebar();
  const { progress: stepsProgress, markComplete } = useGettingStartedProgress();
  const { hasActivePlan } = useHasActivePlan();
  const { isAfterResultsDay } = useMockDates();
  const [timeRemaining, setTimeRemaining] = useState(
    durationInMinutes ? formatTime(durationInMinutes) : "00:00"
  );
  const [showTimer, setShowTimer] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Detect which stages are available in the pages
  const getAvailableStages = (): number[] => {
    const stages = new Set<number>();
    pages.forEach((page) => {
      if (page.content && (page.content as any)?.stage) {
        stages.add((page.content as any).stage);
      }
    });
    return Array.from(stages).sort();
  };

  const availableStages = getAvailableStages();

  // Find learn page index
  const learnPageIndex = pages.findIndex(
    (page) => page.type === QuestionSessionPageType.Learn
  );
  const hasLearnPage = learnPageIndex !== -1;

  // Derive current mode from currentPageIndex
  const getCurrentMode = ():
    | "learn"
    | "learn-page"
    | "practice"
    | "practice-easy"
    | "practice-medium"
    | "practice-hard" => {
    const currentPage = pages[currentPageIndex];

    // Check if we're on the learn page
    if (currentPage?.type === QuestionSessionPageType.Learn) {
      return "learn-page";
    }

    if (currentPageIndex === 0) return "learn";

    if (currentPage?.content) {
      const stage = (currentPage.content as any)?.stage;

      // If no stages available or only one stage, use simple "practice" mode
      if (availableStages.length <= 1) {
        return "practice";
      }

      // Multiple stages available, use specific difficulty
      if (stage === 1) return "practice-easy";
      if (stage === 2) return "practice-medium";
      if (stage === 3) return "practice-hard";
    }
    return "learn";
  };

  const selectedMode = getCurrentMode();

  // Get subject title for the theme using lessonId prop - much more elegant!
  const subjectId =
    providedSubjectId || (lessonId ? lessonIdToSubjectId(lessonId) : "");

  const { subjectTitle: currentSubjectTitle } = lessonId
    ? deconstructSubjectLegacyId(subjectId)
    : { subjectTitle: "" };
  const theme = useSubjectTheme(currentSubjectTitle);

  // Mark first-time lesson practice visit (single source of truth)
  useEffect(() => {
    if (
      sessionType === SessionType.LessonSession &&
      lessonId &&
      !stepsProgress["select-subject-lesson"]
    ) {
      markComplete("select-subject-lesson");
    }
  }, [sessionType, lessonId, stepsProgress, markComplete]);

  useEffect(() => {
    if (hasStarted && durationInMinutes) {
      if (timeStarted) {
        // Paper has already been started, calculate remaining time
        const elapsedMinutes = moment().diff(
          moment(timeStarted),
          "minutes",
          true
        );
        const remainingMinutes = durationInMinutes - elapsedMinutes;
        setTimeRemaining(formatTime(remainingMinutes));
        // Force the page to question if paper was started
        // setCurrentPage("question");
      } else {
        // Paper hasn't been started yet
        setTimeRemaining(formatTime(durationInMinutes));
      }
    }
  }, [hasStarted, durationInMinutes, timeStarted]);

  // Add interval to update timer every second
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timeStarted && durationInMinutes) {
      const updateTimer = () => {
        if (timeStarted) {
          const elapsedMinutes = moment().diff(timeStarted, "minutes", true);
          const remainingMinutes = durationInMinutes - elapsedMinutes;
          setTimeRemaining(formatTime(remainingMinutes));
        }
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [hasStarted, durationInMinutes, timeStarted]);

  const handleExitSession = () => {
    if (hasStarted) {
      setIsExitConfirmationModalOpen(true);
    } else {
      router.push(returnUrl);
    }
  };

  // Helper function to determine if a question group is unanswered
  const isGroupUnanswered = (questionGroup: any): boolean => {
    if (!questionGroup.questions || questionGroup.questions.length === 0) {
      return true;
    }
    // A group is unanswered if at least one question has no userMark defined
    return !questionGroup.questions.some((q: any) => q.userMark !== undefined);
  };

  // Helper function to find first unanswered question of a specific stage
  const getFirstUnansweredQuestionIndexOfStage = (
    stage: number
  ): number | null => {
    const questionPages = pages;

    // First, try to find the first unanswered question of the stage
    const firstUnansweredPageOfStage = questionPages.find((page) => {
      const group = page.content as any;
      return group?.stage === stage && isGroupUnanswered(group);
    });

    if (firstUnansweredPageOfStage) {
      return pages.findIndex((page) => page === firstUnansweredPageOfStage);
    }

    // If all questions are answered, return the first question of the stage
    const firstPageOfStage = questionPages.find((page) => {
      const group = page.content as any;
      return group?.stage === stage;
    });

    if (!firstPageOfStage) return null;
    return pages.findIndex((page) => page === firstPageOfStage);
  };

  return (
    <div className="absolute top-0 left-0 right-0 flex flex-row w-full items-center justify-center gap-5 bg-white md:bg-transparent py-4 z-10">
      <div
        className={`flex items-center gap-4 w-full mx-auto px-4`}
      >
        <div
          className="relative hidden md:flex w-1/4 justify-start"
          onMouseEnter={() => semiOpenSidebar()}
        >
          <div className="px-1 py-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-12 flex items-center pl-3 pr-1.5 max-w-full overflow-hidden">
            <div className="flex-shrink-0">
              <MedlyLogoIcon />
            </div>
            <button
              onClick={() => openSidebar()}
              className="group relative ml-3 flex items-center gap-2 font-rounded-bold text-[15px] hover:bg-[#F2F2F7] px-2 pr-1 py-1 rounded-[6px] min-w-0"
            >
              <div className="flex flex-row items-center gap-2 min-w-0">
                <span className="truncate">
                  {sessionTitle || "Untitled Document"}
                </span>

                {/* Default icon - visible when not hovering */}
                <div className="group-hover:hidden">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_1179_1223)">
                      <path d="M10.7269 20.0191H11.9069V8.0038H10.7269V20.0191ZM8.1716 21H19.7382C21.6321 21 22.7219 19.8441 22.7219 17.7909V10.2167C22.7219 8.1635 21.6321 7 19.7382 7H8.1716C6.14989 7 5 8.1635 5 10.2167V17.7909C5 19.8441 6.14989 21 8.1716 21ZM8.17912 19.7756C6.93152 19.7756 6.21002 19.0532 6.21002 17.7909V10.2167C6.21002 8.95438 6.93152 8.22434 8.17912 8.22434H19.5428C20.7904 8.22434 21.5119 8.95438 21.5119 10.2167V17.7909C21.5119 19.0532 20.7904 19.7756 19.5428 19.7756H8.17912ZM9.28392 11.0532C9.50939 11.0532 9.71231 10.8479 9.71231 10.6274C9.71231 10.3992 9.50939 10.2015 9.28392 10.2015H7.66806C7.44259 10.2015 7.24718 10.3992 7.24718 10.6274C7.24718 10.8479 7.44259 11.0532 7.66806 11.0532H9.28392ZM9.28392 13.0228C9.50939 13.0228 9.71231 12.8175 9.71231 12.5894C9.71231 12.3612 9.50939 12.1711 9.28392 12.1711H7.66806C7.44259 12.1711 7.24718 12.3612 7.24718 12.5894C7.24718 12.8175 7.44259 13.0228 7.66806 13.0228H9.28392ZM9.28392 14.9848C9.50939 14.9848 9.71231 14.7947 9.71231 14.5665C9.71231 14.3384 9.50939 14.1407 9.28392 14.1407H7.66806C7.44259 14.1407 7.24718 14.3384 7.24718 14.5665C7.24718 14.7947 7.44259 14.9848 7.66806 14.9848H9.28392Z" fill="black" fillOpacity="0.85" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1179_1223">
                        <rect width="18" height="14" fill="white" transform="translate(5 7)" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>

                {/* Double chevron icon - visible on hover */}
                <div className="hidden group-hover:block">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_100_2659)">
                      <path
                        d="M14.2197 20.8115C14.4443 20.8115 14.6396 20.7236 14.7861 20.5674L20.8212 14.5713C20.9775 14.4053 21.0654 14.2099 21.0654 13.9951C21.0654 13.7803 20.9775 13.5654 20.8212 13.4189L14.7861 7.41307C14.6396 7.26659 14.4443 7.1787 14.2197 7.1787C13.7607 7.1787 13.4092 7.53026 13.4092 7.98925C13.4092 8.20409 13.5068 8.40917 13.6435 8.56542L19.5517 14.4443V13.5361L13.6435 19.4248C13.5068 19.581 13.4092 19.7764 13.4092 20.001C13.4092 20.4599 13.7607 20.8115 14.2197 20.8115Z"
                        fill="black"
                        fillOpacity="0.85"
                      />
                      <path
                        d="M7.38379 20.8115C7.6084 20.8115 7.80371 20.7236 7.95019 20.5674L13.9854 14.5713C14.1416 14.4053 14.2295 14.2099 14.2295 13.9951C14.2295 13.7803 14.1416 13.5654 13.9854 13.4189L7.95019 7.41307C7.80371 7.26659 7.6084 7.1787 7.38379 7.1787C6.9248 7.1787 6.57324 7.53026 6.57324 7.98925C6.57324 8.20409 6.6709 8.40917 6.80762 8.56542L12.7158 14.4443V13.5361L6.80762 19.4248C6.6709 19.581 6.57324 19.7764 6.57324 20.001C6.57324 20.4599 6.9248 20.8115 7.38379 20.8115Z"
                        fill="black"
                        fillOpacity="0.85"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_100_2659">
                        <rect
                          width="14.8535"
                          height="13.6426"
                          fill="white"
                          transform="translate(6.57324 7.1787)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Tooltip - visible on hover when sidebar is semi-open */}
              {sidebarState === "semi-open" && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                  <div className="font-medium text-[12px] text-white">
                    Lock sidebar open
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex justify-center items-center">
          {(sessionType === SessionType.LessonSession ||
            sessionType === SessionType.PaperSession ||
            sessionType === SessionType.LearnSession) && (
              <div className="px-1 py-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-12 flex items-center w-full max-w-[400px]">
                <button
                  className="sm:hidden relative flex flex-row justify-center items-center p-1 rounded-[8px] hover:bg-[#F0F0F5]"
                  onClick={() => {
                    openSidebar();
                  }}
                  aria-label="Open sidebar"
                >
                  <CrossIcon color="black" />
                </button>

                <QuestionDotNavigation
                  currentIndex={currentPageIndex}
                  isMarking={false}
                  setCurrentQuestionIndex={handleSetCurrentPageIndex}
                  pages={pages}
                  mode={
                    sessionType === SessionType.LearnSession ||
                      currentPageIndex === 0
                      ? "learn"
                      : "practice"
                  }
                />
              </div>
            )}

          {(sessionType === SessionType.PracticeSession ||
            sessionType === SessionType.MockSession) && (
              <div className="px-3 py-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-12 flex items-center gap-2 w-full max-w-[400px]">
                {user?.hasCompletedOnboarding &&
                  sessionType === SessionType.PracticeSession && (
                    <button onClick={handleExitSession}>
                      <CrossIcon color="black" />
                    </button>
                  )}

                <ProgressBarDivided
                  currentPageIndex={currentPageIndex}
                  handleSetCurrentPageIndex={handleSetCurrentPageIndex}
                  pages={pages}
                  hasStarted={hasStarted}
                  sessionType={sessionType}
                  isResultsModalOpen={isResultsModalOpen}
                />

                {sessionType === SessionType.PracticeSession && (
                  <div className="flex flex-row justify-center items-center">
                    <XPIcon width={28} height={28} />
                    <div className={`font-rounded-heavy text-[#05B0FF] text-2xl`}>
                      {currentPageIndex * 3}
                    </div>
                  </div>
                )}
              </div>
            )}

          {false && (
            <>
              {saveState === SaveState.SAVED ? (
                <div className="text-xs font-bold opacity-30">Saved</div>
              ) : saveState === SaveState.SAVING ? (
                <div className="text-xs font-bold opacity-30">Saving...</div>
              ) : (
                <button
                  className="text-xs font-bold opacity-30 underline"
                  onClick={handleSave}
                >
                  Save
                </button>
              )}
            </>
          )}

          {sessionType === SessionType.MockSession &&
            isTimed &&
            !hasFinished &&
            !isReadOnly && (
              <div className="px-3 py-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-12 flex items-center gap-1 flex-nowrap whitespace-nowrap ml-4">
                {showTimer ? (
                  <div
                    className={`font-bold whitespace-nowrap ${timeRemaining.startsWith("-")
                      ? "text-[#FF3B30]"
                      : "text-[#05B0FF]"
                      }`}
                  >
                    {timeRemaining}
                  </div>
                ) : (
                  <div className="font-bold whitespace-nowrap">--:--</div>
                )}
                <button
                  onClick={() => setShowTimer(!showTimer)}
                  className="flex-shrink-0"
                >
                  {showTimer ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            )}
        </div>

        <div className="flex hidden md:flex w-1/4 justify-end items-center gap-2">
          {showCalculator && !isReadOnly && (
            <>
              <button
                className="relative flex flex-col items-center px-2 font-rounded-semibold text-sm text-black/50"
                onClick={() => {
                  setIsCalculatorOpen(true);
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.54422 18.7399H18.4491C20.0763 18.7399 20.9201 17.9036 20.9201 16.299V7.12322C20.9201 5.51859 20.0763 4.68237 18.4491 4.68237H5.54422C3.91699 4.68237 3.07324 5.51106 3.07324 7.12322V16.299C3.07324 17.9036 3.91699 18.7399 5.54422 18.7399ZM5.63463 17.2633C4.93401 17.2633 4.5498 16.9017 4.5498 16.1709V7.25129C4.5498 6.52054 4.93401 6.1514 5.63463 6.1514H18.3587C19.0518 6.1514 19.4435 6.52054 19.4435 7.25129V16.1709C19.4435 16.9017 19.0518 17.2633 18.3587 17.2633H5.63463ZM16.1212 14.6944C17.4697 14.6944 18.3662 14.0088 18.3662 12.9617C18.3662 12.2159 17.8087 11.6282 17.0554 11.5604V11.5454C17.6731 11.455 18.1703 10.8824 18.1703 10.2119C18.1703 9.30793 17.3417 8.66759 16.174 8.66759C15.1645 8.66759 14.3584 9.14219 14.1701 9.88048C14.1399 9.98594 14.1324 10.0537 14.1324 10.1667C14.1324 10.4304 14.3207 10.6188 14.6145 10.6188C14.8556 10.6188 15.0063 10.5133 15.0967 10.2873C15.2398 9.83527 15.6316 9.5716 16.1589 9.5716C16.7465 9.5716 17.1081 9.86541 17.1081 10.3325C17.1081 10.8146 16.7013 11.1612 16.1363 11.1612H15.7672C15.511 11.1612 15.3227 11.342 15.3227 11.5906C15.3227 11.8467 15.511 12.0275 15.7672 12.0275H16.1664C16.8369 12.0275 17.2889 12.3816 17.2889 12.9089C17.2889 13.4363 16.8294 13.7828 16.1438 13.7828C15.5788 13.7828 15.1645 13.5267 15.0063 13.0747C14.8933 12.8411 14.7501 12.7432 14.5091 12.7432C14.2153 12.7432 14.0194 12.9391 14.0194 13.2253C14.0194 13.3157 14.0345 13.376 14.0571 13.4739C14.2379 14.1972 15.0967 14.6944 16.1212 14.6944ZM7.6762 14.6868C8.02274 14.6868 8.23368 14.4608 8.23368 14.0917V9.28533C8.23368 8.89359 8.00767 8.67512 7.631 8.67512C7.35979 8.67512 7.20159 8.75045 6.90778 8.94632L5.77776 9.69967C5.62709 9.80514 5.55929 9.92568 5.55929 10.0839C5.55929 10.3099 5.74009 10.4907 5.95103 10.4907C6.0565 10.4907 6.1243 10.4756 6.28251 10.3702L7.06599 9.85034H7.12626V14.0917C7.12626 14.4533 7.33719 14.6868 7.6762 14.6868ZM9.77804 14.5964H13.0325C13.3112 14.5964 13.5071 14.4006 13.5071 14.1294C13.5071 13.8506 13.3112 13.6623 13.0325 13.6623L10.8252 13.6698V13.6397L12.2716 12.1255C12.8517 11.5228 13.2434 11.0105 13.2434 10.3325C13.2434 9.33053 12.4524 8.67512 11.232 8.67512C10.328 8.67512 9.4993 9.20246 9.28836 9.94828C9.26576 10.0462 9.25823 10.1291 9.25823 10.2195C9.25823 10.4982 9.43903 10.679 9.72531 10.679C9.97391 10.679 10.117 10.5434 10.2301 10.3325C10.3807 9.95581 10.6971 9.58667 11.2697 9.58667C11.8271 9.58667 12.2114 9.91061 12.2114 10.4003C12.2114 10.8222 11.8573 11.1988 11.4881 11.583L9.4767 13.6774C9.3411 13.8054 9.26576 13.9486 9.26576 14.1218C9.26576 14.4081 9.46917 14.5964 9.77804 14.5964Z"
                    fill="#1C1C1E"
                  />
                </svg>
                Calculator
                {showCalculatorTooltip && (
                  <div
                    className="absolute"
                    style={{
                      top: 56,
                    }}
                  >
                    <Tooltip
                      text="Click to open the Desmos calculator"
                      type="top-middle"
                    />
                  </div>
                )}
              </button>
            </>
          )}
          {showReference && !isReadOnly && (
            <button
              className="flex flex-col items-center px-2 font-rounded-semibold text-sm text-black/50"
              onClick={() => {
                setIsReferenceOpen(true);
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.797 17.3538C12.1059 17.3538 12.3244 17.1805 12.3244 16.8792C12.3244 16.7435 12.2942 16.6607 12.1963 16.4497C11.3375 14.9882 10.8704 13.4288 10.8704 11.7187C10.8704 10.0613 11.3149 8.43412 12.1963 6.97262C12.2942 6.76168 12.3244 6.67882 12.3244 6.54321C12.3244 6.25694 12.1059 6.0686 11.797 6.0686C11.4731 6.0686 11.2169 6.22681 10.9231 6.63361C9.84584 8.03484 9.31097 9.79014 9.31097 11.7112C9.31097 13.6398 9.83831 15.3574 10.9231 16.7887C11.2094 17.2031 11.4731 17.3538 11.797 17.3538ZM20.2797 17.3538C20.6037 17.3538 20.8673 17.2031 21.1536 16.7887C22.246 15.3574 22.7658 13.6398 22.7658 11.7112C22.7658 9.79014 22.2234 8.03484 21.1536 6.63361C20.8673 6.21927 20.6037 6.0686 20.2797 6.0686C19.9708 6.0686 19.7524 6.25694 19.7524 6.54321C19.7524 6.67882 19.7825 6.76168 19.8804 6.97262C20.7619 8.43412 21.2063 10.0613 21.2063 11.7187C21.2063 13.4288 20.7393 14.9882 19.8804 16.4497C19.7825 16.6607 19.7524 16.7435 19.7524 16.8792C19.7524 17.1654 19.9708 17.3538 20.2797 17.3538ZM2.40276 17.3462C3.97726 17.3462 4.70801 16.6908 5.07715 14.943L5.90583 10.9804H7.25432C7.7214 10.9804 8.03781 10.7243 8.03781 10.2798C8.03781 9.88808 7.77414 9.65454 7.38239 9.65454H6.1921L6.38797 8.70532C6.57631 7.8013 6.85505 7.44723 7.63853 7.44723C7.7666 7.44723 7.8796 7.4397 7.97001 7.43216C8.38435 7.37943 8.58775 7.16849 8.58775 6.81442C8.58775 6.30967 8.18848 6.07614 7.36733 6.07614C5.81543 6.07614 5.03948 6.79182 4.69294 8.47178L4.44434 9.65454H3.52525C3.05064 9.65454 2.73424 9.91068 2.73424 10.3476C2.73424 10.7469 2.99791 10.9804 3.39718 10.9804H4.1656L3.37458 14.7095C3.17871 15.6361 2.89244 15.9751 2.12402 15.9751C2.02609 15.9751 1.92062 15.9751 1.84528 15.9827C1.43848 16.0429 1.22754 16.2765 1.22754 16.6155C1.22754 17.1127 1.62681 17.3462 2.40276 17.3462ZM13.6352 15.5081C13.929 15.5081 14.1173 15.4101 14.3509 15.0636L15.9781 12.7207H16.0082L17.6731 15.1088C17.8991 15.4177 18.0875 15.5081 18.3436 15.5081C18.7881 15.5081 19.0894 15.2143 19.0894 14.8074C19.0894 14.6342 19.0367 14.476 18.9162 14.3102L17.0027 11.7036L18.9011 9.16486C19.0367 8.98406 19.097 8.82586 19.097 8.62999C19.097 8.22318 18.7806 7.95197 18.3813 7.95197C18.0573 7.95197 17.8765 8.11018 17.6807 8.40398L16.1288 10.7017H16.0911L14.5241 8.39645C14.3283 8.09511 14.1324 7.95197 13.7783 7.95197C13.3489 7.95197 13.025 8.27591 13.025 8.66765C13.025 8.90873 13.1003 9.06693 13.2208 9.22513L15.059 11.6886L13.1304 14.3328C12.9798 14.5212 12.9421 14.6794 12.9421 14.8677C12.9421 15.2369 13.251 15.5081 13.6352 15.5081Z"
                  fill="#1C1C1E"
                />
              </svg>
              Reference
            </button>
          )}
          {showStrategy && (
            <button
              className="flex flex-col items-center px-2 font-rounded-semibold text-sm text-black/50"
              onClick={() => {
                setIsStrategyOpen(true);
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.4463 7.26465C13.5605 7.26465 13.6309 7.19434 13.6484 7.08008C13.9121 5.62988 13.8945 5.6123 15.415 5.31348C15.5293 5.2959 15.6084 5.22559 15.6084 5.10254C15.6084 4.98828 15.5293 4.91797 15.415 4.90039C13.9033 4.61035 13.9385 4.58398 13.6484 3.13379C13.6309 3.01953 13.5605 2.94922 13.4463 2.94922C13.332 2.94922 13.2617 3.01953 13.2354 3.13379C12.9541 4.56641 12.998 4.59277 11.4688 4.90039C11.3545 4.91797 11.2842 4.98828 11.2842 5.10254C11.2842 5.22559 11.3545 5.2959 11.4775 5.31348C12.9893 5.6123 12.9805 5.62988 13.2354 7.08008C13.2617 7.19434 13.332 7.26465 13.4463 7.26465ZM9.18359 13.417C9.35938 13.417 9.49121 13.2939 9.51758 13.1182C9.8252 10.7891 9.89551 10.7803 12.3213 10.3232C12.4883 10.2969 12.6201 10.1738 12.6201 9.98926C12.6201 9.81348 12.4883 9.68164 12.3125 9.65527C9.9043 9.32129 9.81641 9.25098 9.51758 6.87793C9.49121 6.69336 9.35938 6.57031 9.18359 6.57031C8.99902 6.57031 8.86719 6.69336 8.84961 6.88672C8.55957 9.20703 8.4541 9.20703 6.0459 9.65527C5.87012 9.69043 5.74707 9.81348 5.74707 9.98926C5.74707 10.1826 5.87012 10.2969 6.08105 10.3232C8.46289 10.7012 8.55957 10.7715 8.84961 13.1006C8.86719 13.2939 8.99902 13.417 9.18359 13.417ZM15.2744 23.1289C15.5293 23.1289 15.7227 22.9443 15.7578 22.6807C16.3906 17.917 17.0674 17.1699 21.7783 16.6514C22.0508 16.6162 22.2441 16.4141 22.2441 16.1592C22.2441 15.9043 22.0508 15.7021 21.7783 15.667C17.085 15.1221 16.417 14.4189 15.7578 9.6377C15.7139 9.37402 15.5293 9.18945 15.2744 9.18945C15.0195 9.18945 14.8262 9.37402 14.791 9.6377C14.1582 14.4014 13.4814 15.1484 8.77051 15.667C8.48926 15.7021 8.30469 15.9043 8.30469 16.1592C8.30469 16.4141 8.48926 16.6162 8.77051 16.6514C13.4463 17.2754 14.0967 17.8994 14.791 22.6807C14.835 22.9443 15.0195 23.1289 15.2744 23.1289Z"
                  fill="#1C1C1E"
                />
              </svg>
              Strategy
            </button>
          )}

          {false && sessionType === SessionType.MockSession && isReadOnly && (
            <Link
              href="/mocks/results"
              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm rounded-xl text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeftIcon />
              Return to Results
            </Link>
          )}

          {/* Place Equation Sheet immediately before Textbook button */}
          {(() => {
            const equationSheetUrl = subjectId
              ? getEquationSheetUrlBySubjectId(subjectId, gcseHigher)
              : null;
            if (!equationSheetUrl) return null;
            return (
              <a
                href={equationSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex flex-row items-center gap-1 font-rounded-bold text-[15px] px-3 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-12 hover:bg-gray-50 whitespace-nowrap"
                onClick={() => {
                  track("open_equation_sheet", { paper_id: paperId });
                }}
              >
                Equation Sheet
              </a>
            );
          })()}

          {sessionType === SessionType.MockSession &&
            isAfterResultsDay &&
            resultsDayInsights && (
              <button
                className="hidden md:flex flex-row items-center gap-1 font-rounded-bold text-[15px] px-3 h-12 rounded-[12px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] hover:bg-[#F9F9FB] whitespace-nowrap"
                onClick={() => {
                  track(
                    isResultsModalOpen
                      ? "mock_results_close"
                      : "mock_results_open",
                    { paper_id: paperId }
                  );
                  onToggleResults();
                }}
              >
                {isResultsModalOpen ? "View Paper" : "View Results"}
              </button>
            )}

          {/* {sessionType === SessionType.LessonSession &&
            !lessonId?.includes("EngLang") && (
              <Link
                href={`/lessons/${lessonId}/learn`}
                className="hidden md:flex flex-row items-center gap-1 font-rounded-bold text-[15px] px-2 pr-3 h-9 rounded-[8px] bg-[#F9F9FB] hover:bg-[#F0F0F5]"
                onClick={() => {
                  track("switch_to_textbook", {
                    lesson_id: lessonId,
                  });
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8.67383 21.8721H19.3174C21.2158 21.8721 22.2002 20.8877 22.2002 19.0156V8.31934C22.2002 6.43848 21.2158 5.46289 19.3174 5.46289H8.67383C6.77539 5.46289 5.79102 6.43848 5.79102 8.31934V19.0156C5.79102 20.8965 6.77539 21.8721 8.67383 21.8721ZM8.7793 20.1494C7.96191 20.1494 7.51367 19.7188 7.51367 18.8662V8.45996C7.51367 7.60742 7.96191 7.18555 8.7793 7.18555H19.2119C20.0205 7.18555 20.4775 7.60742 20.4775 8.45996V18.8662C20.4775 19.7188 20.0205 20.1494 19.2119 20.1494H8.7793ZM9.20996 9.53223V11.5713C9.20996 12.1426 9.54395 12.4678 10.1064 12.4678H12.1455C12.7168 12.4678 13.0508 12.1426 13.0508 11.5713V9.53223C13.0508 8.96094 12.7168 8.63574 12.1455 8.63574H10.1064C9.54395 8.63574 9.20996 8.96094 9.20996 9.53223ZM9.75488 15.3945H18.1748C18.4912 15.3945 18.7285 15.1484 18.7285 14.832C18.7285 14.5244 18.4912 14.2871 18.1748 14.2871H9.75488C9.42969 14.2871 9.19238 14.5244 9.19238 14.832C9.19238 15.1484 9.42969 15.3945 9.75488 15.3945ZM9.75488 18.2949H15.9775C16.2939 18.2949 16.5312 18.0488 16.5312 17.7412C16.5312 17.4248 16.2939 17.1787 15.9775 17.1787H9.75488C9.42969 17.1787 9.19238 17.4248 9.19238 17.7412C9.19238 18.0488 9.42969 18.2949 9.75488 18.2949Z"
                    fill="#1C1C1E"
                  />
                </svg>
                Textbook
            </Link>
          )} */}

          {sessionType === SessionType.LessonSession && (
            <div
              className="relative hidden md:flex px-2 py-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-12 items-center"
              onMouseEnter={() => {
                setIsDropdownOpen(true);
                // Tutorial tracking
                localStorage.setItem("has_hovered_mode_dropdown", "true");
                window.dispatchEvent(new CustomEvent("mode-dropdown-hovered"));
              }}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="flex flex-row items-center gap-1 font-rounded-bold text-[15px] px-2 pr-2 h-8 rounded-[8px]"
              >
                {selectedMode === "learn" ? (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.67383 21.8721H19.3174C21.2158 21.8721 22.2002 20.8877 22.2002 19.0156V8.31934C22.2002 6.43848 21.2158 5.46289 19.3174 5.46289H8.67383C6.77539 5.46289 5.79102 6.43848 5.79102 8.31934V19.0156C5.79102 20.8965 6.77539 21.8721 8.67383 21.8721ZM8.7793 20.1494C7.96191 20.1494 7.51367 19.7188 7.51367 18.8662V8.45996C7.51367 7.60742 7.96191 7.18555 8.7793 7.18555H19.2119C20.0205 7.18555 20.4775 7.60742 20.4775 8.45996V18.8662C20.4775 19.7188 20.0205 20.1494 19.2119 20.1494H8.7793ZM9.20996 9.53223V11.5713C9.20996 12.1426 9.54395 12.4678 10.1064 12.4678H12.1455C12.7168 12.4678 13.0508 12.1426 13.0508 11.5713V9.53223C13.0508 8.96094 12.7168 8.63574 12.1455 8.63574H10.1064C9.54395 8.63574 9.20996 8.96094 9.20996 9.53223ZM9.75488 15.3945H18.1748C18.4912 15.3945 18.7285 15.1484 18.7285 14.832C18.7285 14.5244 18.4912 14.2871 18.1748 14.2871H9.75488C9.42969 14.2871 9.19238 14.5244 9.19238 14.832C9.19238 15.1484 9.42969 15.3945 9.75488 15.3945ZM9.75488 18.2949H15.9775C16.2939 18.2949 16.5312 18.0488 16.5312 17.7412C16.5312 17.4248 16.2939 17.1787 15.9775 17.1787H9.75488C9.42969 17.1787 9.19238 17.4248 9.19238 17.7412C9.19238 18.0488 9.42969 18.2949 9.75488 18.2949Z"
                      fill="#05B0FF"
                    />
                  </svg>
                ) : selectedMode === "learn-page" ? (
                  <div className="w-[28px] h-[28px] flex items-center justify-center">
                    <LearnIcon width={18} height={18} fill="#05B0FF" />
                  </div>
                ) : selectedMode !== "practice" ? (
                  <DifficultyIcon
                    width={28}
                    height={28}
                    level={
                      selectedMode === "practice-easy"
                        ? "easy"
                        : selectedMode === "practice-medium"
                          ? "medium"
                          : selectedMode === "practice-hard"
                            ? "hard"
                            : "easy"
                    }
                  />
                ) : (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.31543 23.1816H18.6846C20.5742 23.1816 21.5498 22.1885 21.5498 20.29V12.3096C21.5498 11.0791 21.3916 10.5166 20.627 9.73438L16.0303 5.06738C15.2832 4.31152 14.668 4.13574 13.5605 4.13574H9.31543C7.43457 4.13574 6.4502 5.12891 6.4502 7.03613V20.29C6.4502 22.1885 7.43457 23.1816 9.31543 23.1816ZM9.46484 21.4238C8.62109 21.4238 8.19922 20.9844 8.19922 20.1758V7.1416C8.19922 6.3418 8.62109 5.89355 9.47363 5.89355H13.2002V10.6748C13.2002 11.9492 13.8242 12.5645 15.0898 12.5645H19.8008V20.1758C19.8008 20.9844 19.3789 21.4238 18.5264 21.4238H9.46484ZM15.2568 11.0264C14.8877 11.0264 14.7295 10.8682 14.7295 10.5078V6.12207L19.5635 11.0264H15.2568Z"
                      fill="#05B0FF"
                    />
                  </svg>
                )}

                {selectedMode === "learn" && "Textbook"}
                {selectedMode === "learn-page" && "Learn"}
                {selectedMode === "practice" && "Practice"}
                {selectedMode === "practice-easy" && "Practice (Easy)"}
                {selectedMode === "practice-medium" && "Practice (Medium)"}
                {selectedMode === "practice-hard" && "Practice (Exam-style)"}
                <div className="w-[28px] h-[28px] flex items-center justify-center">
                  <svg
                    width="12"
                    height="14"
                    viewBox="0 0 9 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.55273 10.2871L7.73631 7.17181C7.89261 7.02541 8.07811 6.96678 8.24411 6.96678C8.62501 6.96678 8.95701 7.27931 8.95701 7.66991C8.95701 7.88471 8.84961 8.07031 8.74221 8.16791L5.08008 11.7031C4.93359 11.8398 4.73828 11.9375 4.55273 11.9375C4.36719 11.9375 4.18164 11.8398 4.03515 11.7031L0.373043 8.16791C0.255863 8.07031 0.158203 7.88471 0.158203 7.66991C0.158203 7.27931 0.480473 6.96678 0.871093 6.96678C1.02734 6.96678 1.22265 7.01561 1.3789 7.17181L4.55273 10.2871Z"
                      fill="black"
                    />
                    <path
                      d="M0.373043 3.82225L4.03515 0.296862C4.1914 0.160142 4.36719 0.0624924 4.55273 0.0624924C4.73828 0.0624924 4.92383 0.160142 5.08008 0.296862L8.74221 3.82225C8.84961 3.92967 8.95701 4.10545 8.95701 4.33006C8.95701 4.72069 8.62501 5.02342 8.24411 5.02342C8.07811 5.02342 7.89261 4.97459 7.73631 4.82811L4.55273 1.71288L1.3789 4.82811C1.22265 4.98436 1.02734 5.02342 0.871093 5.02342C0.480473 5.02342 0.158203 4.72069 0.158203 4.33006C0.158203 4.10545 0.255863 3.92967 0.373043 3.82225Z"
                      fill="black"
                    />
                  </svg>
                </div>
              </button>

              <div
                className={`absolute top-8 right-0 w-[280px] bg-white/95 backdrop-blur-[16px] sm:rounded-[16px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border-0 sm:border border-white p-2 gap-1 transition-all duration-150 ease-out ${isDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-90 pointer-events-none"
                  }`}
                style={{
                  transformOrigin: "top right",
                }}
              >
                <button
                  onClick={() => {
                    handleSetCurrentPageIndex(0);
                    setIsDropdownOpen(false);
                    track("switch_to_textbook", {
                      lesson_id: lessonId,
                    });
                    markComplete("switch-mode");
                  }}
                  className={`w-full rounded-[8px] p-2 font-rounded-bold text-[15px] flex items-center gap-2 hover:bg-[#F9F9FB] ${selectedMode === "learn" ? "bg-[#F9F9FB]" : ""}`}
                >
                  <div className="w-[28px] h-[28px] flex items-center justify-center">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.67822 17.2046H14.3218C16.2202 17.2046 17.2046 16.2202 17.2046 14.3481V3.65184C17.2046 1.77098 16.2202 0.795395 14.3218 0.795395H3.67822C1.77978 0.795395 0.79541 1.77098 0.79541 3.65184V14.3481C0.79541 16.229 1.77978 17.2046 3.67822 17.2046ZM3.78369 15.4819C2.9663 15.4819 2.51806 15.0513 2.51806 14.1987V3.79246C2.51806 2.93992 2.9663 2.51805 3.78369 2.51805H14.2163C15.0249 2.51805 15.4819 2.93992 15.4819 3.79246V14.1987C15.4819 15.0513 15.0249 15.4819 14.2163 15.4819H3.78369ZM4.21435 4.86474V6.9038C4.21435 7.4751 4.54834 7.8003 5.11079 7.8003H7.14989C7.72119 7.8003 8.05519 7.4751 8.05519 6.9038V4.86474C8.05519 4.29345 7.72119 3.96825 7.14989 3.96825H5.11079C4.54834 3.96825 4.21435 4.29345 4.21435 4.86474ZM4.75927 10.727H13.1792C13.4956 10.727 13.7329 10.4809 13.7329 10.1645C13.7329 9.8569 13.4956 9.6196 13.1792 9.6196H4.75927C4.43408 9.6196 4.19677 9.8569 4.19677 10.1645C4.19677 10.4809 4.43408 10.727 4.75927 10.727ZM4.75927 13.6274H10.9819C11.2983 13.6274 11.5356 13.3813 11.5356 13.0737C11.5356 12.7573 11.2983 12.5112 10.9819 12.5112H4.75927C4.43408 12.5112 4.19677 12.7573 4.19677 13.0737C4.19677 13.3813 4.43408 13.6274 4.75927 13.6274Z"
                        fill="#05B0FF"
                      />
                    </svg>
                  </div>
                  Textbook
                </button>

                {hasLearnPage && (
                  <button
                    onClick={() => {
                      handleSetCurrentPageIndex(learnPageIndex);
                      setIsDropdownOpen(false);
                      track("switch_to_learn", {
                        lesson_id: lessonId,
                      });
                    }}
                    className={`w-full rounded-[8px] p-2 font-rounded-bold text-[15px] flex items-center gap-2 hover:bg-[#F9F9FB] ${selectedMode === "learn-page" ? "bg-[#F9F9FB]" : ""}`}
                  >
                    <div className="w-[28px] h-[28px] flex items-center justify-center">
                      <LearnIcon width={18} height={18} fill="#05B0FF" />
                    </div>
                    Learn
                  </button>
                )}

                {availableStages.length <= 1 ? (
                  // Simple mode: just show "Practice" for lessons with no stages or one stage
                  <button
                    onClick={() => {
                      // Find first question page
                      const firstQuestionPage = pages.find(
                        (page, index) =>
                          index > 0 &&
                          page.type === QuestionSessionPageType.Question
                      );
                      if (firstQuestionPage) {
                        const index = pages.indexOf(firstQuestionPage);
                        handleSetCurrentPageIndex(index);
                      }
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full rounded-[8px] p-2 font-rounded-bold text-[15px] flex items-center gap-2 hover:bg-[#F9F9FB] ${selectedMode === "practice" ? "bg-[#F9F9FB]" : ""}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9.31543 23.1816H18.6846C20.5742 23.1816 21.5498 22.1885 21.5498 20.29V12.3096C21.5498 11.0791 21.3916 10.5166 20.627 9.73438L16.0303 5.06738C15.2832 4.31152 14.668 4.13574 13.5605 4.13574H9.31543C7.43457 4.13574 6.4502 5.12891 6.4502 7.03613V20.29C6.4502 22.1885 7.43457 23.1816 9.31543 23.1816ZM9.46484 21.4238C8.62109 21.4238 8.19922 20.9844 8.19922 20.1758V7.1416C8.19922 6.3418 8.62109 5.89355 9.47363 5.89355H13.2002V10.6748C13.2002 11.9492 13.8242 12.5645 15.0898 12.5645H19.8008V20.1758C19.8008 20.9844 19.3789 21.4238 18.5264 21.4238H9.46484ZM15.2568 11.0264C14.8877 11.0264 14.7295 10.8682 14.7295 10.5078V6.12207L19.5635 11.0264H15.2568Z"
                          fill="#05B0FF"
                        />
                      </svg>
                      Practice
                    </div>
                  </button>
                ) : (
                  // Multiple stages: show difficulty-based options
                  <>
                    {availableStages.includes(1) && (
                      <button
                        onClick={() => {
                          const firstQuestionIndex =
                            getFirstUnansweredQuestionIndexOfStage(1);
                          if (firstQuestionIndex !== null) {
                            handleSetCurrentPageIndex(firstQuestionIndex);
                          }
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full rounded-[8px] p-2 font-rounded-bold text-[15px] flex items-center gap-2 hover:bg-[#F9F9FB] ${selectedMode === "practice-easy" ? "bg-[#F9F9FB]" : ""}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <DifficultyIcon level="easy" />
                          Practice (Easy)
                        </div>
                      </button>
                    )}

                    {availableStages.includes(2) && (
                      <button
                        onClick={() => {
                          const firstQuestionIndex =
                            getFirstUnansweredQuestionIndexOfStage(2);
                          if (firstQuestionIndex !== null) {
                            handleSetCurrentPageIndex(firstQuestionIndex);
                          }
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full rounded-[8px] p-2 font-rounded-bold text-[15px] flex items-center gap-2 hover:bg-[#F9F9FB] ${selectedMode === "practice-medium" ? "bg-[#F9F9FB]" : ""}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <DifficultyIcon level="medium" />
                          Practice (Medium)
                        </div>
                      </button>
                    )}

                    {availableStages.includes(3) && (
                      <button
                        onClick={() => {
                          const firstQuestionIndex =
                            getFirstUnansweredQuestionIndexOfStage(3);
                          if (firstQuestionIndex !== null) {
                            handleSetCurrentPageIndex(firstQuestionIndex);
                          }
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full rounded-[8px] p-2 font-rounded-bold text-[15px] flex items-center gap-2 hover:bg-[#F9F9FB] ${selectedMode === "practice-hard" ? "bg-[#F9F9FB]" : ""}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <DifficultyIcon level="hard" />
                          Practice (Exam-style)
                        </div>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {sessionType === SessionType.LearnSession && (
            <Link
              href={`/lessons/${lessonId}/practice`}
              className="hidden md:flex flex-row items-center gap-1 font-rounded-bold text-[15px] px-3 py-2 rounded-[8px] bg-[#F9F9FB] hover:bg-[#F0F0F5]"
              onClick={() => {
                track("switch_to_practice", {
                  lesson_id: lessonId,
                });
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.31543 23.1816H18.6846C20.5742 23.1816 21.5498 22.1885 21.5498 20.29V12.3096C21.5498 11.0791 21.3916 10.5166 20.627 9.73438L16.0303 5.06738C15.2832 4.31152 14.668 4.13574 13.5605 4.13574H9.31543C7.43457 4.13574 6.4502 5.12891 6.4502 7.03613V20.29C6.4502 22.1885 7.43457 23.1816 9.31543 23.1816ZM9.46484 21.4238C8.62109 21.4238 8.19922 20.9844 8.19922 20.1758V7.1416C8.19922 6.3418 8.62109 5.89355 9.47363 5.89355H13.2002V10.6748C13.2002 11.9492 13.8242 12.5645 15.0898 12.5645H19.8008V20.1758C19.8008 20.9844 19.3789 21.4238 18.5264 21.4238H9.46484ZM15.2568 11.0264C14.8877 11.0264 14.7295 10.8682 14.7295 10.5078V6.12207L19.5635 11.0264H15.2568Z"
                  fill="#1C1C1E"
                />
              </svg>
              Questions
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;