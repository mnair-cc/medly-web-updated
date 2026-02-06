import QuickFixesCard from "./QuickFixesCard";
import FoundationGapsCard from "./FoundationGapsCard";
import QuestionReviewCard from "./QuestionReviewCard";
import { MockPage } from "@/app/(protected)/sessions/types";
import {
  QuestionGroup,
  QuestionWithMarkingResult,
  SubjectWithUnits,
} from "@/app/types/types";
import { useState } from "react";
import { getExamBoardFromPages, generateQuestionId } from "./utils";
import { getAnswerAttempts, getMarksGained } from "@/app/_lib/utils/utils";

interface Question {
  id: string;
  marks: string;
  topic: string;
  question: string;
  color: string;
  retryMarksGained?: string; // Shows marks gained from retry attempts (e.g., "+2")
  isSkipped?: boolean;
  isQuickFix?: boolean;
  isFoundationGap?: boolean;
}

interface ReviewQuestionsProps {
  pages?: MockPage[];
  onQuestionClick?: (questionId: string) => void;
  subjectData?: SubjectWithUnits | null;
}

const ReviewQuestions = ({
  pages,
  onQuestionClick,
  subjectData,
}: ReviewQuestionsProps) => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showSkipped, setShowSkipped] = useState<boolean>(true);

  const examBoard = getExamBoardFromPages(pages);

  // Function to lookup lesson and topic titles from subject data
  const getLessonInfo = (
    lessonLegacyId: string
  ): { topicTitle: string; lessonTitle: string } => {
    if (!subjectData || !lessonLegacyId) {
      return { topicTitle: "General", lessonTitle: "Unknown" };
    }

    // Search through the subject hierarchy to find the lesson
    for (const unit of subjectData.units) {
      for (const topic of unit.topics) {
        for (const lesson of topic.lessons) {
          if (lesson.legacyId === lessonLegacyId) {
            return { topicTitle: topic.title, lessonTitle: lesson.title };
          }
        }
      }
    }

    // Fallback if lesson not found
    return { topicTitle: "General", lessonTitle: "Unknown" };
  };

  // Extract questions from pages data
  const extractQuestionsFromPages = (): Question[] => {
    const questions: Question[] = [];
    let groupCounter = 1;

    (pages || []).forEach((page) => {
      if (
        page.content &&
        typeof page.content === "object" &&
        "questions" in page.content
      ) {
        const questionGroup = page.content as QuestionGroup;

        questionGroup.questions.forEach((question, questionIndex) => {
          const q = question as QuestionWithMarkingResult;

          // Determine mark color based on performance
          const userMark = q.userMark || 0;
          const maxMark = q.maxMark || 1;

          let color = "#FF4444"; // Red for 0 marks
          if (userMark === maxMark) {
            color = "#7CC500"; // Green for full marks
          } else if (userMark > 0) {
            color = "#FFA935"; // Orange for partial marks
          }

          // Generate proper question ID based on exam board and group/question index
          const questionId = generateQuestionId(
            groupCounter,
            questionIndex,
            examBoard
          );

          // Get topic and lesson titles from subject data
          const lessonLegacyId =
            q.lessonLegacyIds && q.lessonLegacyIds.length > 0
              ? q.lessonLegacyIds[0]
              : "";
          const { topicTitle, lessonTitle } = getLessonInfo(lessonLegacyId);
          const topic = `${topicTitle} · ${lessonTitle}`;

          // Calculate marks gained from retry attempts
          const attempts = getAnswerAttempts(q);
          const marksGained = getMarksGained(attempts);
          const hasRetries = attempts.length > 1;

          // Use boolean properties directly from question data
          const isQuickFix = q.isQuickFix || false;
          const isFoundationGap = q.isFoundationalGap || false;

          questions.push({
            id: questionId,
            marks: `${userMark}/${maxMark}`,
            topic: topic,
            question: q.questionText || "Question text not available",
            color,
            retryMarksGained:
              hasRetries && marksGained > 0 ? `+${marksGained}` : undefined,
            isSkipped:
              userMark === 0 &&
              !q.userAnswer &&
              !(
                q.canvas?.textboxes &&
                q.canvas.textboxes.length > 0 &&
                q.canvas.textboxes.some(
                  (textbox) => textbox.text.trim().length > 0
                )
              ) &&
              !(q.desmosExpressions && q.desmosExpressions.length > 0), // Question was skipped if no marks, no userAnswer, no canvas textboxes with text, and no desmos expressions
            isQuickFix,
            isFoundationGap,
          });
        });

        groupCounter++;
      }
    });

    return questions;
  };

  const questionsData = extractQuestionsFromPages();

  // Calculate stats from the extracted questions data (single source of truth)
  const calculateFoundationGapsStats = () => {
    const foundationGapQuestions = questionsData.filter(
      (q) => q.isFoundationGap && !q.isSkipped
    );

    const additionalMarks = foundationGapQuestions.reduce((sum, q) => {
      const [userMark, maxMark] = q.marks.split("/").map(Number);
      return sum + (maxMark - userMark);
    }, 0);

    const attemptedCount = foundationGapQuestions.filter(
      (q) => q.retryMarksGained !== undefined
    ).length;

    return { additionalMarks, attemptedCount };
  };

  const foundationGapsStats = calculateFoundationGapsStats();

  const calculateQuickFixesStats = () => {
    const quickFixQuestions = questionsData.filter(
      (q) => q.isQuickFix && !q.isSkipped
    );

    const additionalMarks = quickFixQuestions.reduce((sum, q) => {
      const [userMark, maxMark] = q.marks.split("/").map(Number);
      return sum + (maxMark - userMark);
    }, 0);

    const attemptedCount = quickFixQuestions.filter(
      (q) => q.retryMarksGained !== undefined
    ).length;

    return { additionalMarks, attemptedCount };
  };

  const quickFixesStats = calculateQuickFixesStats();

  // Filter questions based on active filter and showSkipped toggle
  let filteredQuestions = questionsData;

  // Apply filter based on active tab
  if (activeFilter === "quick-fixes") {
    // Always exclude skipped questions for quick-fixes
    filteredQuestions = questionsData.filter(
      (question) => question.isQuickFix && !question.isSkipped
    );
  } else if (activeFilter === "foundation-gaps") {
    // Always exclude skipped questions for foundation-gaps
    filteredQuestions = questionsData.filter(
      (question) => question.isFoundationGap && !question.isSkipped
    );
  }

  // Apply showSkipped toggle (only for "all" filter)
  const questionsToShow =
    activeFilter === "quick-fixes" || activeFilter === "foundation-gaps"
      ? filteredQuestions // Always exclude skipped for these filters
      : showSkipped
        ? filteredQuestions
        : filteredQuestions.filter((question) => !question.isSkipped);

  const filters = [
    { id: "all", label: "All" },
    {
      id: "quick-fixes",
      label: "Quick fixes",
      count: questionsData.filter((q) => q.isQuickFix && !q.isSkipped).length,
    },
    {
      id: "foundation-gaps",
      label: "Foundation gaps",
      count: questionsData.filter((q) => q.isFoundationGap && !q.isSkipped)
        .length,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="font-rounded-heavy text-2xl">Review Questions</div>

      {/* Filter Buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            const isQuickFixes = filter.id === "quick-fixes";
            const isFoundationGaps = filter.id === "foundation-gaps";

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`${filter.id === "all" ? "px-4" : "px-3"} py-2.5 bg-white rounded-[10px] outline outline-1 outline-offset-[-1px] outline-gray-100 inline-flex items-center gap-2 transition-all duration-200 hover:bg-gray-50`}
                style={{
                  ...(isActive &&
                    filter.id === "all" && {
                      backgroundColor: "#F8F8FA",
                      outlineColor: "#E5E5EA",
                    }),
                  ...(isActive &&
                    isQuickFixes && {
                      backgroundColor: "#F9FFF0",
                      outlineColor: "#7CC5004D",
                    }),
                  ...(isActive &&
                    isFoundationGaps && {
                      backgroundColor: "#06B0FF0D",
                      outlineColor: "#06B0FF33",
                    }),
                }}
              >
                {isQuickFixes && (
                  <svg width="18" height="14" fill="none">
                    <path
                      d="M7.47273 13.4014V8.46973C7.47273 8.12793 7.26765 7.94238 6.92585 7.94238C6.77937 7.94238 6.61335 8.00098 6.49616 8.09863L3.57624 10.5596C3.3321 10.7647 3.31257 11.0869 3.57624 11.3115L6.49616 13.7725C6.61335 13.8701 6.77937 13.9287 6.92585 13.9287C7.26765 13.9287 7.47273 13.7432 7.47273 13.4014ZM16.545 6.69238C16.1349 6.69238 15.8321 7.00488 15.8321 7.41504V8.15723C15.8321 9.40723 14.9239 10.2568 13.6056 10.2568H6.33991C5.94929 10.2568 5.62702 10.5791 5.62702 10.96C5.62702 11.3506 5.94929 11.6729 6.33991 11.6729H13.4591C15.7833 11.6729 17.2677 10.3447 17.2677 8.26465V7.41504C17.2677 7.00488 16.9552 6.69238 16.545 6.69238Z"
                      fill={isActive ? "#7CC500" : "black"}
                      fillOpacity="0.6"
                    />
                    <path
                      d="M10.2949 0.608398V5.54004C10.2949 5.88184 10.4902 6.06738 10.832 6.06738C10.9883 6.06738 11.1445 6.00879 11.2617 5.91113L14.1816 3.45996C14.4355 3.24512 14.4551 2.92285 14.1816 2.69824L11.2617 0.237305C11.1445 0.139648 10.9883 0.0810547 10.832 0.0810547C10.4902 0.0810547 10.2949 0.266601 10.2949 0.608398ZM1.22266 7.31738C1.62305 7.31738 1.93555 7.00488 1.93555 6.59473V5.85254C1.93555 4.60254 2.83398 3.75293 4.15234 3.75293H11.4277C11.8184 3.75293 12.1309 3.43067 12.1309 3.04981C12.1309 2.65918 11.8184 2.33691 11.4277 2.33691H4.30859C1.98438 2.33691 0.5 3.66504 0.5 5.74512V6.59473C0.5 7.00488 0.8125 7.31738 1.22266 7.31738Z"
                      fill={isActive ? "#7CC500" : "black"}
                      fillOpacity="0.6"
                    />
                  </svg>
                )}

                {isFoundationGaps && (
                  <svg width="17" height="16" fill="none">
                    <g clipPath="url(#clip0_777_4172)">
                      <path
                        d="M0.628906 6.59864C0.628906 10.0264 3.41211 12.7998 6.83985 12.7998C8.15821 12.7998 9.36914 12.3897 10.375 11.6865L14.0078 15.3291C14.2129 15.5244 14.4668 15.6123 14.7305 15.6123C15.2969 15.6123 15.707 15.1826 15.707 14.6162C15.707 14.3428 15.5996 14.0986 15.4336 13.9131L11.8203 10.29C12.5918 9.25488 13.041 7.98536 13.041 6.59864C13.041 3.1709 10.2676 0.387695 6.83985 0.387695C3.41211 0.387695 0.628906 3.1709 0.628906 6.59864ZM2.13282 6.59864C2.13282 3.99122 4.23243 1.89161 6.83985 1.89161C9.4375 1.89161 11.5469 3.99122 11.5469 6.59864C11.5469 9.19629 9.4375 11.3057 6.83985 11.3057C4.23243 11.3057 2.13282 9.19629 2.13282 6.59864Z"
                        fill={isActive ? "#06B0FF" : "black"}
                        fillOpacity="0.6"
                      />
                      <path
                        d="M6.84961 9.73339C6.97657 9.73339 7.08399 9.62597 7.12305 9.49902C7.51368 7.58496 7.70899 7.1455 9.72071 6.87207C9.87696 6.85253 9.97461 6.73535 9.97461 6.59863C9.97461 6.45214 9.87696 6.34472 9.72071 6.31542C7.71875 6.03222 7.40625 5.56347 7.12305 3.708C7.09375 3.56152 6.97657 3.4541 6.84961 3.4541C6.70313 3.4541 6.59571 3.55175 6.55664 3.708C6.17579 5.60253 5.98047 6.03222 3.95899 6.31542C3.8125 6.34472 3.70508 6.45214 3.70508 6.59863C3.70508 6.73535 3.8125 6.84277 3.95899 6.87207C5.98047 7.12597 6.27344 7.58496 6.55664 9.48925C6.58594 9.62597 6.69336 9.73339 6.84961 9.73339Z"
                        fill={isActive ? "#06B0FF" : "black"}
                        fillOpacity="0.6"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_777_4172">
                        <rect
                          width="15.4395"
                          height="15.2246"
                          fill="white"
                          transform="translate(0.628906 0.387695)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                )}

                <span
                  className="text-[14px] font-rounded-bold"
                  style={{
                    color:
                      isActive && isQuickFixes
                        ? "#7CC500"
                        : isActive && isFoundationGaps
                          ? "#06B0FF"
                          : isActive && filter.id === "all"
                            ? "rgba(0, 0, 0, 0.9)"
                            : "rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {filter.label}
                </span>

                {filter.count !== undefined && (
                  <span
                    className="px-1 rounded text-[12px] font-rounded-bold flex items-center"
                    style={{
                      backgroundColor:
                        isActive && isQuickFixes
                          ? "#7CC500"
                          : isActive && isFoundationGaps
                            ? "#06B0FF"
                            : isActive && filter.id === "all"
                              ? "#C7C7CC"
                              : "#F2F2F7CC",
                      color:
                        isActive && (isQuickFixes || isFoundationGaps)
                          ? "white"
                          : isActive && filter.id === "all"
                            ? "white"
                            : "#00000066",
                    }}
                  >
                    {filter.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side: Show skipped toggle - hide for quick-fixes and foundation-gaps */}
        {activeFilter !== "quick-fixes" &&
          activeFilter !== "foundation-gaps" && (
            <div className="px-3 py-2.5 bg-white rounded-[10px] inline-flex justify-center items-center gap-3">
              <div className="text-center justify-center text-black/80 text-[14px] font-rounded-bold">
                Show skipped
              </div>
              <button
                onClick={() => setShowSkipped(!showSkipped)}
                className="w-8 h-[18px] rounded-full transition-all duration-200 relative"
                style={{
                  backgroundColor: showSkipped ? "#06B0FF" : "#0000001A",
                  width: "32px",
                }}
              >
                <div
                  className="w-[14px] h-[14px] bg-white rounded-full shadow transition-all duration-200 absolute top-0.5"
                  style={{
                    left: showSkipped ? "16px" : "2px",
                  }}
                />
              </button>
            </div>
          )}
      </div>

      <div className="flex flex-col gap-3 w-full">
        {/* Show special card based on active filter */}
        {activeFilter === "quick-fixes" && (
          <QuickFixesCard
            questionCount={
              questionsData.filter((q) => q.isQuickFix && !q.isSkipped).length
            }
            additionalMarks={quickFixesStats.additionalMarks}
            attemptedCount={quickFixesStats.attemptedCount}
          />
        )}

        {activeFilter === "foundation-gaps" && (
          <FoundationGapsCard
            questionCount={
              questionsData.filter((q) => q.isFoundationGap && !q.isSkipped)
                .length
            }
            additionalMarks={foundationGapsStats.additionalMarks}
            attemptedCount={foundationGapsStats.attemptedCount}
          />
        )}

        {questionsToShow.length > 0 ? (
          questionsToShow.map((question, index) => (
            <QuestionReviewCard
              key={index}
              id={question.id}
              marks={question.marks}
              topic={question.topic}
              question={question.question}
              color={question.color}
              retryMarksGained={question.retryMarksGained}
              isFoundationGap={question.isFoundationGap}
              onClick={
                onQuestionClick ? () => onQuestionClick(question.id) : undefined
              }
            />
          ))
        ) : (
          <div className="w-full p-6 text-center text-[#8E8E93] text-[15px] min-h-[200px] flex items-center justify-center">
            No questions match the current filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQuestions;
