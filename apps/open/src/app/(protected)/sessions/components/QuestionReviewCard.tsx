import { MockPage } from "@/app/(protected)/sessions/types";
import { useUser } from "@/app/_context/UserProvider";
import BookmarkIcon from "@/app/_components/icons/BookmarkIcon";
import { QuestionSessionPageType } from "@/app/(protected)/sessions/types";
import { QuestionGroup, QuestionWithMarkingResult } from "@/app/types/types";
import RoundCrossIcon from "@/app/_components/icons/RoundCrossIcon";
import { useEffect, useRef, RefObject } from "react";

const QuestionReviewCard = ({
  pages,
  currentPageIndex,
  handleSetCurrentPageIndex,
  sessionTitle,
  sessionSubtitle,
  setShowQuestionInfo,
  toggleQuestionInfoButtonRef,
  isReadOnly,
}: {
  pages: MockPage[];
  currentPageIndex: number;
  handleSetCurrentPageIndex: (index: number) => void;
  sessionTitle: string;
  sessionSubtitle: string;
  setShowQuestionInfo: (showQuestionInfo: boolean) => void;
  toggleQuestionInfoButtonRef: RefObject<HTMLButtonElement>;
  isReadOnly?: boolean;
}) => {
  const { user } = useUser();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        toggleQuestionInfoButtonRef.current &&
        !toggleQuestionInfoButtonRef.current.contains(event.target as Node)
      ) {
        setShowQuestionInfo(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowQuestionInfo, toggleQuestionInfoButtonRef]);

  return (
    <div
      className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-50"
      ref={modalRef}
    >
      <div className="flex flex-col justify-center items-center bg-white rounded-2xl shadow-lg p-8">
        <button
          className="absolute top-4 right-4"
          onClick={() => setShowQuestionInfo(false)}
        >
          <RoundCrossIcon />
        </button>
        <div className="flex flex-col justify-center items-center gap-4">
          <div className="flex flex-col justify-center items-center">
            <p className="text-xs text-black/50">{sessionSubtitle}</p>
            <h3 className="font-rounded-semibold">{sessionTitle} Questions</h3>
          </div>
          <div className="border-t border-b border-[#F2F2F7] py-4 gap-4 w-full">
            <div className="flex flex-row gap-4 w-fit mx-auto mb-2">
              <div className="flex gap-1 items-center">
                <p className="bg-[#F2F2F7] rounded-full w-6 h-6 flex justify-center items-center">
                  {user?.avatar}
                </p>
                <p className="text-xs text-black/50">Current</p>
              </div>

              {isReadOnly ? (
                // Read-only mode: Show unanswered, correct, and incorrect
                <>
                  <div className="flex gap-1 items-center ">
                    <p className="text-xs text-black/50 bg-[#F2F2F7] rounded-full w-6 h-6 flex justify-center items-center"></p>
                    <p className="text-xs text-black/50">Unanswered</p>
                  </div>

                  <div className="flex gap-1 items-center ">
                    <p className="text-xs bg-[#E6F9E6] rounded-full w-6 h-6 flex justify-center items-center"></p>
                    <p className="text-xs text-black/50">Correct</p>
                  </div>

                  <div className="flex gap-1 items-center ">
                    <p className="text-xs bg-[#FDEEEE] rounded-full w-6 h-6 flex justify-center items-center"></p>
                    <p className="text-xs text-black/50">Incorrect</p>
                  </div>
                </>
              ) : (
                // Active mode: Show unanswered
                <div className="flex gap-1 items-center ">
                  <p className="text-xs text-black/50 bg-[#F2F2F7] rounded-full w-6 h-6 flex justify-center items-center"></p>
                  <p className="text-xs text-black/50">Unanswered</p>
                </div>
              )}

              <div className="flex gap-1 items-center">
                <BookmarkIcon />
                <p className="text-xs text-black/50">For Review</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[repeat(10,2.5rem)] gap-2">
            {pages
              .filter((page) => page.type === QuestionSessionPageType.Question)
              .map((page, questionIndex) => {
                // Get the original index in the full pages array
                const index = pages.findIndex((p) => p === page);
                const containsUnansweredQuestions = (
                  page.content as QuestionGroup
                ).questions.some((question) => {
                  const q = question as QuestionWithMarkingResult;
                  return (
                    !q.userAnswer &&
                    !(
                      q.canvas &&
                      ((q.canvas.paths && q.canvas.paths.length > 0) ||
                        (q.canvas.textboxes && q.canvas.textboxes.length > 0))
                    )
                  );
                });
                const isCurrentPage = index === currentPageIndex;
                const question = (page.content as QuestionGroup)
                  .questions[0] as QuestionWithMarkingResult;

                console.log(question);

                // Determine color based on marking results
                const getQuestionColorClasses = () => {
                  // First check if the question is unanswered (regardless of mode)
                  if (containsUnansweredQuestions) {
                    return isCurrentPage
                      ? "bg-[#F2F2F7] border-transparent"
                      : "bg-[#F2F2F7] border-white";
                  }

                  if (question.markMax !== undefined) {
                    // If no userMark found, assume as incorrect (userMark = 0)
                    const userMark = question.userMark ?? 0;

                    if (userMark === question.markMax) {
                      // Full marks - Green
                      return isCurrentPage
                        ? "bg-[#e4ffb7] border-transparent"
                        : "bg-[#E6F9E6] border-white";
                    } else {
                      // No marks or partial marks - Red
                      return isCurrentPage
                        ? "bg-[#FDEEEE] border-transparent"
                        : "bg-[#FDEEEE] border-white";
                    }
                  } else {
                    // Not marked yet - use original logic for answered questions
                    return isCurrentPage
                      ? "bg-[#06B0FF]/40 border-transparent"
                      : "bg-[#06B0FF] border-white";
                  }
                };

                const getTextColorClasses = () => {
                  // First check if the question is unanswered (regardless of mode)
                  if (containsUnansweredQuestions) {
                    return "text-black/25";
                  }

                  if (question.markMax !== undefined) {
                    if (isCurrentPage) {
                      // Current page text doesn't matter as it's covered by emoji
                      return "text-black";
                    } else {
                      // Non-current marked questions use colored text
                      // If no userMark found, assume as incorrect (userMark = 0)
                      const userMark = question.userMark ?? 0;
                      return userMark === question.markMax
                        ? "text-[#7CC500]"
                        : "text-[#FF4B4C]";
                    }
                  } else {
                    // Not marked yet - use white text for answered questions
                    return "text-white";
                  }
                };

                return (
                  <button
                    key={index}
                    className={`relative flex justify-center items-center rounded-full w-10 h-10 border-2 ${getQuestionColorClasses()}`}
                    disabled={isCurrentPage}
                    onClick={() => {
                      handleSetCurrentPageIndex(index);
                    }}
                  >
                    <p className={`font-bold ${getTextColorClasses()}`}>
                      {questionIndex + 1}
                    </p>
                    {isCurrentPage && (
                      <p className="absolute text-[32px]">{user?.avatar}</p>
                    )}
                    {question.isMarkedForReview && (
                      <div className="absolute top-[-5px] right-[-10px]">
                        <BookmarkIcon />
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        <button
          className="text-[#06B0FF] mt-4"
          onClick={() => {
            setShowQuestionInfo(false);
            // Navigate to the review page (last page in the array)
            handleSetCurrentPageIndex(pages.length - 1);
          }}
        >
          Go to Review Page
        </button>
      </div>
      <div className="absolute left-[50%] translate-x-[-50%] top-[100%] translate-y-[-25%]">
        <svg
          width="104"
          height="78"
          viewBox="0 0 104 78"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#filter0_d_95_6)">
            <path
              d="M53.4691 47.4096C52.6772 48.2668 51.3227 48.2668 50.5309 47.4096L24.2871 19L79.7128 19L53.4691 47.4096Z"
              fill="white"
            />
          </g>
          <defs>
            <filter
              id="filter0_d_95_6"
              x="0.287109"
              y="0"
              width="103.426"
              height="77.0525"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="5" />
              <feGaussianBlur stdDeviation="12" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"
              />
              <feBlend
                mode="normal"
                in2="BackgroundImageFix"
                result="effect1_dropShadow_95_6"
              />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="effect1_dropShadow_95_6"
                result="shape"
              />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default QuestionReviewCard;
