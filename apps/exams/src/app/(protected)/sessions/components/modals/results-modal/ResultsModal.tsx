"use client";

import React from "react";
import { useState } from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import {
  PostMockInsights,
  ResultsDayInsights,
  MockPage,
  QuestionSessionPageType,
  CoverContent,
} from "@/app/(protected)/sessions/types";
import { SubjectWithUnits } from "@/app/types/types";
import { QuestionGroup } from "@/app/types/types";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import moment from "moment";
import TabSwitcher from "./TabSwitcher";
import ReviewQuestions from "./ReviewQuestions";
import FeedbackContent from "./FeedbackContent";
import { getExamBoardFromPages, generateQuestionId } from "./utils";

const ResultsModal = ({
  isOpen,
  onClose,
  pages,
  initialInsights,
  resultsDayInsights,
  onNavigateToQuestion,
  subjectData,
  timeStarted,
  timeFinished,
  paperId,
}: {
  isOpen: boolean;
  onClose: () => void;
  pages: MockPage[];
  initialInsights?: PostMockInsights;
  resultsDayInsights?: ResultsDayInsights;
  onNavigateToQuestion?: (pageIndex: number) => void;
  subjectData?: SubjectWithUnits | null;
  timeStarted?: string | null;
  timeFinished?: string | null;
  paperId?: string;
}) => {
  const [activeTab, setActiveTab] = useState<"feedback" | "review">("feedback");

  // Derive GCSE tier from paperId for fast loading
  const derivedGcseHigher = paperId
    ? paperId.includes("Higher")
      ? true
      : paperId.includes("Foundation")
        ? false
        : undefined
    : undefined;

  const handleQuestionClick = (questionId: string) => {
    // Find the page index and question index that contains this question
    let targetPageIndex = -1;
    let targetQuestionIndex = -1;

    const examBoard = getExamBoardFromPages(pages);
    let groupCounter = 1;

    pages.forEach((page, pageIndex) => {
      if (page.type === QuestionSessionPageType.Question && page.content) {
        const questionGroup = page.content as QuestionGroup;
        questionGroup.questions?.forEach((question, questionIndex) => {
          // Calculate the question ID based on exam board format
          const calculatedId = generateQuestionId(
            groupCounter,
            questionIndex,
            examBoard
          );

          if (calculatedId === questionId) {
            targetPageIndex = pageIndex;
            targetQuestionIndex = questionIndex;
          }
        });
        groupCounter++;
      }
    });

    // Close the modal first
    onClose();

    // Navigate to the question if found
    if (targetPageIndex !== -1 && onNavigateToQuestion) {
      onNavigateToQuestion(targetPageIndex);

      // Add scroll and highlight functionality after navigation
      setTimeout(() => {
        scrollToQuestionAndHighlight(targetQuestionIndex);
      }, 100); // Small delay to ensure page has navigated
    }
  };

  const scrollToQuestionAndHighlight = (questionIndex: number) => {
    // Find the question element by data attribute for scrolling
    const questionElement = document.querySelector(
      `[data-question-index="${questionIndex}"]`
    );

    if (questionElement) {
      // Scroll to the question with smooth behavior
      questionElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // Find white/light background elements within this question
      const whiteBackgrounds = questionElement.querySelectorAll(
        ".bg-white, .bg-\\[\\#FBFBFD\\]"
      );

      if (whiteBackgrounds.length > 0) {
        whiteBackgrounds.forEach((element) => {
          const htmlElement = element as HTMLElement;
          const originalBackground = htmlElement.style.backgroundColor;

          // Add blue highlight flash effect to white content areas
          htmlElement.style.backgroundColor = "#06B0FF20"; // Light blue
          htmlElement.style.transition = "background-color 0.3s ease";

          // Remove highlight after 1.5 seconds
          setTimeout(() => {
            htmlElement.style.backgroundColor = originalBackground;
            setTimeout(() => {
              htmlElement.style.transition = "";
            }, 300);
          }, 1500);
        });
      } else {
        // Fallback: if no white backgrounds found, try data attribute approach
        const contentElements = document.querySelectorAll(
          `[data-question-content="${questionIndex}"]`
        );

        if (contentElements.length > 0) {
          contentElements.forEach((contentElement) => {
            const element = contentElement as HTMLElement;
            const originalBackground = element.style.backgroundColor;

            element.style.backgroundColor = "#06B0FF20";
            element.style.transition = "background-color 0.3s ease";

            setTimeout(() => {
              element.style.backgroundColor = originalBackground;
              setTimeout(() => {
                element.style.transition = "";
              }, 300);
            }, 1500);
          });
        } else {
          // Final fallback: highlight the main container
          const originalBackground = (questionElement as HTMLElement).style
            .backgroundColor;
          (questionElement as HTMLElement).style.backgroundColor = "#06B0FF20";
          (questionElement as HTMLElement).style.transition =
            "background-color 0.3s ease";

          setTimeout(() => {
            (questionElement as HTMLElement).style.backgroundColor =
              originalBackground;
            setTimeout(() => {
              (questionElement as HTMLElement).style.transition = "";
            }, 300);
          }, 1500);
        }
      }
    }
  };

  // Get mock dates for display and conditional logic
  const { isAfterResultsDay, resultsDay } = useMockDates();

  const shouldShowResultsData = React.useMemo(() => {
    return isAfterResultsDay && !!resultsDayInsights;
  }, [isAfterResultsDay, resultsDayInsights]);

  const shouldShowInitialInsights = React.useMemo(() => {
    return !!initialInsights;
  }, [initialInsights]);

  // Hide review tab for English Literature and English Language (no auto-marking)
  const subjectName =
    (pages[0]?.content as CoverContent)?.subject?.toLowerCase() || "";
  const isEnglishSubject =
    subjectName.includes("english literature") ||
    subjectName.includes("english language");

  if (!isOpen) return null;

  // If no insights available yet (before Results Day for new mocks)
  if (!initialInsights && !resultsDayInsights) {
    const formattedDate = resultsDay.format("D MMMM");
    return (
      <div className="bg-[#FBFBFD] overflow-y-auto z-[9]">
        <div className="flex items-start justify-center w-full h-full pt-6 md:pt-8 pb-10">
          <div className="w-full">
            <div className="w-full md:max-w-[800px] bg-white mx-auto rounded-[16px] py-8 min-h-[60vh] relative mt-10 flex flex-col justify-center items-center border border-[#F2F2F7]">
              <div className="w-2/3 flex flex-col justify-center items-center">
                <h2 className="text-2xl font-rounded-heavy text-center">
                  Thanks for completing! 🎉
                </h2>
                <p className="mt-2 mb-5 text-center text-[15px] text-black/60">
                  Your results will be available on Results Day ({formattedDate}
                  ). Check back then to see your grade, feedback, and how you
                  compare to others.
                </p>
                <PrimaryButtonClicky
                  buttonText="Close"
                  onPress={onClose}
                  showKeyboardShortcut={false}
                  isLong={true}
                  buttonState="filled"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFBFD] overflow-y-auto z-[9]">
      <div className="flex items-start justify-center w-full h-full pb-10">
        <div className="w-full">
          <div className="w-full md:max-w-[800px] bg-white mx-auto rounded-[16px] py-8 min-h-[60vh] relative mt-10 pb-20 border border-[#F2F2F7]">
            <div className="flex flex-col items-center justify-center h-full px-20 pt-10">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex flex-row items-center justify-center gap-2">
                  {timeFinished && (
                    <p className="text-[10px] font-medium text-[#818181] uppercase">
                      {moment(timeFinished).format("MMM D, YYYY")}
                    </p>
                  )}
                  <p className="text-[10px] font-medium text-[#818181] uppercase">
                    CHRISTMAS
                  </p>
                  <p className="text-[10px] font-medium text-[#818181] uppercase">
                    MOCKS
                  </p>
                </div>
                <h2 className="text-4xl font-rounded-heavy">
                  {(pages[0].content as CoverContent)?.subject} Paper{" "}
                  {(pages[0].content as CoverContent)?.paper}
                </h2>
                <div className="flex flex-row items-center justify-center gap-2">
                  <p className="text-sm mt-1 text-[#000000CC]">
                    {(pages[0].content as CoverContent)?.course} ·{" "}
                    {(pages[0].content as CoverContent)?.examBoard}
                    {derivedGcseHigher !== undefined && (
                      <> · {derivedGcseHigher ? "Higher" : "Foundation"} Tier</>
                    )}
                  </p>
                </div>
              </div>

              {/* Tabs only show after results day, and not for English subjects */}
              {shouldShowResultsData && !isEnglishSubject && (
                <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
              )}

              {!shouldShowResultsData && (
                <div className="w-full items-center justify-center pb-5">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex flex-row items-center justify-center mb-2 gap-1">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 32 32"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_134_155)">
                          <path
                            d="M15.8193 25.9561C21.3174 25.9561 25.7803 21.4932 25.7803 15.9951C25.7803 10.4971 21.3174 6.03418 15.8193 6.03418C10.3213 6.03418 5.8584 10.4971 5.8584 15.9951C5.8584 21.4932 10.3213 25.9561 15.8193 25.9561ZM15.8193 24.2959C11.2295 24.2959 7.51856 20.585 7.51856 15.9951C7.51856 11.4053 11.2295 7.69434 15.8193 7.69434C20.4092 7.69434 24.1201 11.4053 24.1201 15.9951C24.1201 20.585 20.4092 24.2959 15.8193 24.2959Z"
                            fill="black"
                            fillOpacity="0.4"
                          />
                          <path
                            d="M10.7119 17.0498H15.8096C16.1904 17.0498 16.4932 16.7569 16.4932 16.3662V9.78418C16.4932 9.40332 16.1904 9.11035 15.8096 9.11035C15.4287 9.11035 15.1357 9.40332 15.1357 9.78418V15.6924H10.7119C10.3213 15.6924 10.0283 15.9854 10.0283 16.3662C10.0283 16.7569 10.3213 17.0498 10.7119 17.0498Z"
                            fill="black"
                            fillOpacity="0.4"
                          />
                        </g>
                      </svg>
                      <p className="text-[15px] text-[#818181] font-rounded-bold text-center">
                        Full results and insights will be released on{" "}
                        {resultsDay.tz("Europe/London").format("MMM Do ha")}.
                      </p>
                    </div>
                    {/* <MockCountdown targetDate={getMockDateInUTC("results_day")} /> */}
                  </div>
                </div>
              )}

              {/* Content based on tab state or initial view */}
              {shouldShowResultsData ? (
                // After results day - show tabbed content (both rendered, visibility controlled)
                <>
                  <div
                    className={`w-full ${
                      activeTab === "feedback" || isEnglishSubject
                        ? "block"
                        : "hidden"
                    }`}
                  >
                    <FeedbackContent
                      initialInsights={initialInsights}
                      resultsDayInsights={resultsDayInsights}
                      shouldShowResultsData={shouldShowResultsData}
                      pages={pages}
                      timeStarted={timeStarted}
                      timeFinished={timeFinished}
                      derivedGcseHigher={derivedGcseHigher}
                    />
                  </div>

                  {/* Review tab - hidden for English subjects */}
                  {!isEnglishSubject && (
                    <div
                      className={`w-full ${activeTab === "review" ? "block" : "hidden"}`}
                    >
                      <ReviewQuestions
                        pages={pages}
                        onQuestionClick={handleQuestionClick}
                        subjectData={subjectData}
                      />
                    </div>
                  )}
                </>
              ) : (
                // Before results day - show initial insights only
                shouldShowInitialInsights && (
                  <FeedbackContent
                    initialInsights={initialInsights}
                    resultsDayInsights={resultsDayInsights}
                    shouldShowResultsData={shouldShowResultsData}
                    pages={pages}
                    timeStarted={timeStarted}
                    timeFinished={timeFinished}
                    derivedGcseHigher={derivedGcseHigher}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;
