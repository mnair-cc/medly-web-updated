import { getMockDateInUTC } from "@/app/(protected)/mocks/_utils/utils";
import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { useGenerateDocument } from "@/app/(protected)/open/_hooks/useGenerateDocument";
import ProgressBarDivided from "@/app/(protected)/sessions/components/header/ProgressBarDivided";
import QuestionDotNavigation from "@/app/(protected)/sessions/components/header/QuestionDotNavigation";
import { SaveState } from "@/app/(protected)/sessions/hooks/useSession";
import {
  MockPage,
  QuestionSessionPageType,
  SessionType,
} from "@/app/(protected)/sessions/types";
import { formatTime } from "@/app/(protected)/sessions/utils";
import { getEquationSheetUrlBySubjectId } from "@/app/(protected)/sessions/utils/equationSheets";
import ArrowLeftIcon from "@/app/_components/icons/ArrowLeftIcon";
import CrossIcon from "@/app/_components/icons/CrossIcon";
import DifficultyIcon from "@/app/_components/icons/DifficultyIcon";
import EyeIcon from "@/app/_components/icons/EyeIcon";
import EyeSlashIcon from "@/app/_components/icons/EyeSlashIcon";
import MedlyLogoIcon from "@/app/_components/icons/MedlyLogoIcon";
import XPIcon from "@/app/_components/icons/XPIcon";
import Tooltip from "@/app/_components/Tooltip";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useUser } from "@/app/_context/UserProvider";
import { useGettingStartedProgress } from "@/app/_hooks/useGettingStartedSteps";
import { useSubjectTheme } from "@/app/_hooks/useSubjectTheme";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import {
  deconstructSubjectLegacyId,
  lessonIdToSubjectId,
} from "@/app/_lib/utils/utils";
import moment from "moment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const MOHeader = ({
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
  pageType,
  setPageType,
  onStartFlashcardLearn,
  documentId,
  documentType,
  hasNotes,
  onSummaryButtonClick,
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
    isExitConfirmationModalOpen: boolean,
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
  pageType: QuestionSessionPageType;
  setPageType?: (pageType: QuestionSessionPageType) => void;
  onStartFlashcardLearn?: () => void;
  documentId?: string;
  documentType?: "document" | "practice" | "flashcards";
  hasNotes?: boolean;
  onSummaryButtonClick?: () => void;
}) => {
  const { user } = useUser();
  const router = useRouter();
  const { track } = useTracking();
  const { openSidebar, semiOpenSidebar, closeSidebar, scheduleClose, sidebarState } = useSidebar();
  const { generateFlashcardsFromDocument, generatePracticeFromDocument } = useGenerateDocument();
  const { progress: stepsProgress, markComplete } = useGettingStartedProgress();
  const { hasActivePlan } = useHasActivePlan();
  const [timeRemaining, setTimeRemaining] = useState(
    durationInMinutes ? formatTime(durationInMinutes) : "00:00",
  );
  const [showTimer, setShowTimer] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isCreateDropdownPinned, setIsCreateDropdownPinned] = useState(false);
  const [showTabUI, setShowTabUI] = useState(false);

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

  // Derive current mode from currentPageIndex
  const getCurrentMode = ():
    | "learn"
    | "practice"
    | "practice-easy"
    | "practice-medium"
    | "practice-hard" => {
    if (currentPageIndex === 0) return "learn";

    const currentPage = pages[currentPageIndex];
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
          true,
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
    stage: number,
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
    <div className="flex flex-row w-full items-center justify-center gap-5 py-4 z-10">
      <div
        className={`flex items-center justify-between gap-4 w-full mx-auto px-4`}
      >
        <div className="hidden flex-1 flex justify-start items-center gap-2">
          <button
            className="sm:hidden relative flex flex-row justify-center items-center p-1 rounded-[8px] hover:bg-[#F0F0F5]"
            onClick={() => {
              openSidebar();
            }}
            aria-label="Open sidebar"
          >
            <CrossIcon color="black" />
          </button>
          <div className="hidden sm:flex">
            <button
              className="relative flex flex-row justify-center items-center gap-1 pl-2 pr-4 py-1 bg-[#F9F9FB] rounded-[8px] transition-transform duration-150 active:scale-98 hover:bg-[#F0F0F5]"
              onMouseEnter={() => {
                setIsButtonHovered(true);
                semiOpenSidebar();
              }}
              onMouseLeave={() => {
                setIsButtonHovered(false);
                // Don't close immediately - let the mouse position tracking handle it
              }}
              onClick={() => {
                openSidebar();
              }}
            >
              {isButtonHovered || sidebarState !== "closed" ? (
                // Hover state - double chevron icon
                <div className="hover:bg-[#F9F9FB] rounded-[8px]">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_100_2658)">
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
                      <clipPath id="clip0_100_2658">
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
              ) : (
                // Default state - textbook icon
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.46777 21.8633H21.5234C23.4219 21.8633 24.4062 20.8877 24.4062 19.0156V8.31055C24.4062 6.43848 23.4219 5.46289 21.5234 5.46289H6.46777C4.56934 5.46289 3.58496 6.42969 3.58496 8.31055V19.0156C3.58496 20.8877 4.56934 21.8633 6.46777 21.8633ZM6.57324 20.1406C5.75586 20.1406 5.30762 19.7188 5.30762 18.8662V8.45996C5.30762 7.60742 5.75586 7.17676 6.57324 7.17676H21.418C22.2266 7.17676 22.6836 7.60742 22.6836 8.45996V18.8662C22.6836 19.7188 22.2266 20.1406 21.418 20.1406H6.57324ZM7.28516 18.8574H9.77246C10.2734 18.8574 10.4668 18.6553 10.4668 18.1543V9.17188C10.4668 8.6709 10.2734 8.45996 9.77246 8.45996H7.28516C6.78418 8.45996 6.59082 8.6709 6.59082 9.17188V18.1543C6.59082 18.6553 6.78418 18.8574 7.28516 18.8574Z"
                    fill="#1C1C1E"
                  />
                </svg>
              )}

              {isButtonHovered && sidebarState === "semi-open" && (
                <div className="absolute right-0 translate-x-32 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] z-10">
                  <div className="font-medium text-[12px] text-white">
                    Lock sidebar open
                  </div>
                </div>
              )}

              <p className="font-rounded-bold text-[14px] whitespace-nowrap">
                {sessionTitle}
              </p>
            </button>
          </div>
        </div>

        {/* Show sidebar hover button when sidebar is closed or semi-open */}
        {(sidebarState === "closed" || sidebarState === "semi-open") && (
          <div
            className="relative hidden md:flex"
            onMouseEnter={() => semiOpenSidebar()}
            onMouseLeave={() => scheduleClose(300)}
          >
            <div className="px-1 py-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] h-10 flex items-center pl-3">
              <MedlyLogoIcon />
              <div className="ml-3 flex items-center gap-2">
                <span className="font-rounded-bold text-[14px] truncate max-w-[150px]">
                  {sessionTitle || "Untitled Document"}
                </span>
                <button
                  onClick={() => openSidebar()}
                  className="group relative hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                >
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

                  {/* Tooltip - visible on hover when sidebar is semi-open */}
                  {sidebarState === "semi-open" && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                      <div className="font-medium text-[12px] text-white">
                        Show menu
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex justify-left items-center">
          {documentType === "document" ? (
            null
          ) : (
            <div className="w-full">
              {(sessionType === SessionType.LessonSession ||
                sessionType === SessionType.PaperSession ||
                sessionType === SessionType.LearnSession) && (
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
                )}
            </div>
          )}

          {(sessionType === SessionType.PracticeSession ||
            sessionType === SessionType.MockSession) && (
              <>
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
              </>
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
        </div>

        <div className="hidden flex flex-1 justify-end items-center gap-2">
          {/* Document/Summary tab switcher */}
          {documentType === "document" && (pageType === QuestionSessionPageType.Document || pageType === QuestionSessionPageType.Notes) && (
            hasNotes || showTabUI ? (
              <div className="relative hidden md:flex">
                <div className="p-1 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] gap-1 flex overflow-hidden h-10">
                  <button
                    onClick={() => setPageType?.(QuestionSessionPageType.Document)}
                    className={`flex flex-row items-center gap-1 font-rounded-bold text-[14px] px-3 h-8 rounded-[8px] ${pageType === QuestionSessionPageType.Document
                      ? "bg-[#F2F2F7]"
                      : "hover:bg-[#F0F0F5]"
                      }`}
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
                        fill="#05B0FF"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      track("header_summary_clicked", { document_id: documentId });
                      setPageType?.(QuestionSessionPageType.Notes);
                    }}
                    className={`flex flex-row items-center gap-1 font-rounded-bold text-[14px] px-3 h-8 rounded-[8px] ${pageType === QuestionSessionPageType.Notes
                      ? "bg-[#F2F2F7]"
                      : "hover:bg-[#F0F0F5]"
                      }`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.5251 6.22689C11.623 6.22689 11.6834 6.16663 11.6984 6.06869C11.9244 4.82566 11.9093 4.81059 13.2126 4.55446C13.3106 4.53939 13.3784 4.47913 13.3784 4.37366C13.3784 4.27572 13.3106 4.21545 13.2126 4.20039C11.9168 3.95178 11.947 3.92918 11.6984 2.68616C11.6834 2.58822 11.623 2.52795 11.5251 2.52795C11.4271 2.52795 11.3669 2.58822 11.3444 2.68616C11.1032 3.91412 11.1409 3.93671 9.83012 4.20039C9.73215 4.21545 9.67189 4.27572 9.67189 4.37366C9.67189 4.47913 9.73215 4.53939 9.83758 4.55446C11.1334 4.81059 11.1259 4.82566 11.3444 6.06869C11.3669 6.16663 11.4271 6.22689 11.5251 6.22689ZM7.87137 11.5003C8.02205 11.5003 8.13504 11.3948 8.15765 11.2442C8.42132 9.24785 8.48159 9.24031 10.5608 8.84851C10.704 8.82597 10.8169 8.72045 10.8169 8.56227C10.8169 8.41161 10.704 8.2986 10.5533 8.276C8.48912 7.98973 8.41379 7.92946 8.15765 5.89542C8.13504 5.73722 8.02205 5.63175 7.87137 5.63175C7.71317 5.63175 7.60017 5.73722 7.5851 5.90295C7.3365 7.89179 7.24609 7.89179 5.18192 8.276C5.03125 8.30613 4.92578 8.41161 4.92578 8.56227C4.92578 8.72799 5.03125 8.82597 5.21205 8.84851C7.25363 9.17251 7.3365 9.23277 7.5851 11.2291C7.60017 11.3948 7.71317 11.5003 7.87137 11.5003ZM13.0921 19.8248C13.3106 19.8248 13.4763 19.6666 13.5064 19.4407C14.0488 15.3575 14.6289 14.7171 18.6668 14.2727C18.9004 14.2425 19.0661 14.0693 19.0661 13.8508C19.0661 13.6323 18.9004 13.459 18.6668 13.4289C14.644 12.9619 14.0714 12.3591 13.5064 8.26094C13.4688 8.03493 13.3106 7.87672 13.0921 7.87672C12.8736 7.87672 12.7079 8.03493 12.6777 8.26094C12.1353 12.3441 11.5552 12.9844 7.5173 13.4289C7.27623 13.459 7.11803 13.6323 7.11803 13.8508C7.11803 14.0693 7.27623 14.2425 7.5173 14.2727C11.5251 14.8075 12.0826 15.3424 12.6777 19.4407C12.7154 19.6666 12.8736 19.8248 13.0921 19.8248Z" fill="#05B0FF" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative hidden md:flex">
                <button
                  onClick={() => {
                    setShowTabUI(true);
                    setPageType?.(QuestionSessionPageType.Notes);
                    onSummaryButtonClick?.();
                  }}
                  className="p-1 px-3 bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] flex items-center gap-2 h-10 font-rounded-bold text-[14px] hover:bg-[#F0F0F5]"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.5251 6.22689C11.623 6.22689 11.6834 6.16663 11.6984 6.06869C11.9244 4.82566 11.9093 4.81059 13.2126 4.55446C13.3106 4.53939 13.3784 4.47913 13.3784 4.37366C13.3784 4.27572 13.3106 4.21545 13.2126 4.20039C11.9168 3.95178 11.947 3.92918 11.6984 2.68616C11.6834 2.58822 11.623 2.52795 11.5251 2.52795C11.4271 2.52795 11.3669 2.58822 11.3444 2.68616C11.1032 3.91412 11.1409 3.93671 9.83012 4.20039C9.73215 4.21545 9.67189 4.27572 9.67189 4.37366C9.67189 4.47913 9.73215 4.53939 9.83758 4.55446C11.1334 4.81059 11.1259 4.82566 11.3444 6.06869C11.3669 6.16663 11.4271 6.22689 11.5251 6.22689ZM7.87137 11.5003C8.02205 11.5003 8.13504 11.3948 8.15765 11.2442C8.42132 9.24785 8.48159 9.24031 10.5608 8.84851C10.704 8.82597 10.8169 8.72045 10.8169 8.56227C10.8169 8.41161 10.704 8.2986 10.5533 8.276C8.48912 7.98973 8.41379 7.92946 8.15765 5.89542C8.13504 5.73722 8.02205 5.63175 7.87137 5.63175C7.71317 5.63175 7.60017 5.73722 7.5851 5.90295C7.3365 7.89179 7.24609 7.89179 5.18192 8.276C5.03125 8.30613 4.92578 8.41161 4.92578 8.56227C4.92578 8.72799 5.03125 8.82597 5.21205 8.84851C7.25363 9.17251 7.3365 9.23277 7.5851 11.2291C7.60017 11.3948 7.71317 11.5003 7.87137 11.5003ZM13.0921 19.8248C13.3106 19.8248 13.4763 19.6666 13.5064 19.4407C14.0488 15.3575 14.6289 14.7171 18.6668 14.2727C18.9004 14.2425 19.0661 14.0693 19.0661 13.8508C19.0661 13.6323 18.9004 13.459 18.6668 13.4289C14.644 12.9619 14.0714 12.3591 13.5064 8.26094C13.4688 8.03493 13.3106 7.87672 13.0921 7.87672C12.8736 7.87672 12.7079 8.03493 12.6777 8.26094C12.1353 12.3441 11.5552 12.9844 7.5173 13.4289C7.27623 13.459 7.11803 13.6323 7.11803 13.8508C7.11803 14.0693 7.27623 14.2425 7.5173 14.2727C11.5251 14.8075 12.0826 15.3424 12.6777 19.4407C12.7154 19.6666 12.8736 19.8248 13.0921 19.8248Z" fill="#05B0FF" />
                  </svg>
                  Summarize
                </button>
              </div>
            )
          )}

          {/* Create button */}
          {(pageType === QuestionSessionPageType.Document || pageType === QuestionSessionPageType.Notes) && (
            <div
              className="relative hidden md:flex"
              onMouseEnter={() => setIsCreateDropdownOpen(true)}
              onMouseLeave={() => {
                if (!isCreateDropdownPinned) setIsCreateDropdownOpen(false);
              }}
            >
              <button
                className="flex flex-row items-center justify-center gap-1 font-rounded-bold text-[14px] px-5 pl-3 h-10 rounded-[12px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                onClick={() => {
                  setIsCreateDropdownOpen(true);
                  setIsCreateDropdownPinned(true);
                }}
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.63672 14.6562H12.998V20.0176C12.998 20.5625 13.4463 21.0195 14 21.0195C14.5537 21.0195 15.002 20.5625 15.002 20.0176V14.6562H20.3633C20.9082 14.6562 21.3652 14.208 21.3652 13.6543C21.3652 13.1006 20.9082 12.6523 20.3633 12.6523H15.002V7.29102C15.002 6.74609 14.5537 6.28906 14 6.28906C13.4463 6.28906 12.998 6.74609 12.998 7.29102V12.6523H7.63672C7.0918 12.6523 6.63477 13.1006 6.63477 13.6543C6.63477 14.208 7.0918 14.6562 7.63672 14.6562Z"
                    fill="black" />
                </svg>

                Create
              </button>

              {isCreateDropdownPinned && (
                <div
                  className="fixed inset-0 z-[5]"
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    setIsCreateDropdownPinned(false);
                  }}
                />
              )}

              <div
                className={`absolute top-9 right-0 w-[240px] bg-white/95 backdrop-blur-[16px] sm:rounded-[16px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border-0 sm:border border-white p-2 gap-1 transition-all duration-150 ease-out z-10 ${isCreateDropdownOpen
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-90 pointer-events-none"
                  }`}
                style={{ transformOrigin: "top right" }}
              >
                <button
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    setIsCreateDropdownPinned(false);
                    track("header_create_clicked", {
                      document_type: "flashcards",
                      document_id: documentId,
                    });
                    if (documentId) generateFlashcardsFromDocument(documentId);
                  }}
                  className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB]"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_614_1247_moheader)">
                      <path d="M5.78223 18.5938H7.33789V19.9209C7.33789 21.8018 8.32227 22.7686 10.2207 22.7686H22.2178C24.1162 22.7686 25.1006 21.793 25.1006 19.9209V11.5713C25.1006 9.69043 24.1162 8.71484 22.2178 8.71484H20.583V7.39648C20.583 5.51562 19.5898 4.54004 17.7002 4.54004H5.78223C3.88379 4.54004 2.89941 5.51562 2.89941 7.39648V15.7461C2.89941 17.6182 3.88379 18.5938 5.78223 18.5938ZM5.8877 16.8711C5.07031 16.8711 4.62207 16.4492 4.62207 15.5967V7.53711C4.62207 6.68457 5.07031 6.2627 5.8877 6.2627H17.5947C18.4033 6.2627 18.8604 6.68457 18.8604 7.53711V8.71484H10.2207C8.32227 8.71484 7.33789 9.69043 7.33789 11.5713V16.8711H5.8877ZM10.3262 21.0547C9.50879 21.0547 9.06055 20.624 9.06055 19.7715V11.7207C9.06055 10.8682 9.50879 10.4375 10.3262 10.4375H22.1123C22.9209 10.4375 23.3779 10.8682 23.3779 11.7207V19.7715C23.3779 20.624 22.9209 21.0547 22.1123 21.0547H10.3262Z" fill="#05B0FF" />
                    </g>
                    <defs>
                      <clipPath id="clip0_614_1247_moheader">
                        <rect width="28" height="28" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  Flashcards
                </button>

                <button
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    setIsCreateDropdownPinned(false);
                    track("header_create_clicked", {
                      document_type: "practice",
                      document_id: documentId,
                    });
                    if (documentId) generatePracticeFromDocument(documentId);
                  }}
                  className="w-full rounded-[8px] p-2 font-rounded-bold text-[14px] flex items-center gap-2 hover:bg-[#F9F9FB]"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.31543 23.1816H18.6846C20.5742 23.1816 21.5498 22.1885 21.5498 20.29V12.3096C21.5498 11.0791 21.3916 10.5166 20.627 9.73438L16.0303 5.06738C15.2832 4.31152 14.668 4.13574 13.5605 4.13574H9.31543C7.43457 4.13574 6.4502 5.12891 6.4502 7.03613V20.29C6.4502 22.1885 7.43457 23.1816 9.31543 23.1816ZM9.46484 21.4238C8.62109 21.4238 8.19922 20.9844 8.19922 20.1758V7.1416C8.19922 6.3418 8.62109 5.89355 9.47363 5.89355H13.2002V10.6748C13.2002 11.9492 13.8242 12.5645 15.0898 12.5645H19.8008V20.1758C19.8008 20.9844 19.3789 21.4238 18.5264 21.4238H9.46484ZM15.2568 11.0264C14.8877 11.0264 14.7295 10.8682 14.7295 10.5078V6.12207L19.5635 11.0264H15.2568Z" fill="#05B0FF" />
                  </svg>
                  Practice Test
                </button>
              </div>
            </div>
          )}

          {pageType === QuestionSessionPageType.Flashcards && (
            <button
              className="hidden md:flex flex-row items-center gap-1 font-rounded-bold text-[14px] px-5 h-9 rounded-[8px] bg-[#05B0FF] hover:bg-[#05B0FF]/80 text-white"
              onClick={onStartFlashcardLearn}
            >
              Learn
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default MOHeader;
