import {
  QuestionWithMarkingResult,
  QuestionDifficulty,
  MarkingContext,
  Decoration,
} from "@/app/types/types";
import { QuestionTextRenderer } from "@/app/(protected)/sessions/components/question-components/QuestionTextRenderer";
import InputMethod from "@/app/(protected)/sessions/components/question-components/InputMethod";
import ShimmerEffect from "@/app/(protected)/sessions/components/question-components/ShimmerEffect";
import BookmarkIcon from "@/app/_components/icons/BookmarkIcon";
import TickIcon from "@/app/_components/icons/TickIcon";
import { SessionType } from "@/app/(protected)/sessions/types";
import { useExamLoggerContext } from "@/app/(protected)/sessions/contexts/ExamLoggerContext";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { toast } from "sonner";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import TickCircleIcon from "@/app/_components/icons/TickCircleIcon";
import CrossInCircleIcon from "@/app/_components/icons/CrossInCircleIcon";

interface QuestionAndAnswerContainerProps {
  question: QuestionWithMarkingResult;
  currentPageIndex: number;
  decorations: Decoration[];
  updateQuestionUserAnswer: (
    questionGroupId: number,
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  handleMarkAnswer: (markingContext: MarkingContext) => void;
  isReadOnly: boolean;
  showShimmer: boolean;
  updateQuestionMarkedForReview: (
    questionGroupId: number,
    questionLegacyId: string
  ) => void;
  sessionType: SessionType;
  hideOptions?: boolean;
  selectedDecorationIndex?: number | null;
  hideHeader?: boolean;
  isAnnotating?: boolean;
  hideElimination?: boolean;
  hideLines?: boolean;
  handleRetryQuestion?: (
    questionGroupId: number,
    questionLegacyId: string
  ) => void;
  handleSendMessage?: (message: string) => void;
  isAwaitingResponse?: boolean;
  isMarking?: boolean;
}

export default function QuestionAndAnswerContainer({
  question,
  currentPageIndex,
  decorations,
  updateQuestionUserAnswer,
  handleMarkAnswer,
  isReadOnly,
  showShimmer,
  updateQuestionMarkedForReview,
  sessionType,
  hideOptions,
  selectedDecorationIndex,
  hideHeader,
  isAnnotating,
  hideElimination,
  hideLines = false,
  handleRetryQuestion,
  handleSendMessage,
  isAwaitingResponse,
  isMarking,
}: QuestionAndAnswerContainerProps) {
  // Use exam logger context
  const { logMarkForReview, logUnmarkForReview, isMockSession } =
    useExamLoggerContext();
  const { track } = useTracking();
  const handleMarkForReviewClick = () => {
    // Call the original function
    updateQuestionMarkedForReview(question.questionGroupId, question.legacyId);

    // Log the action for exam sessions only
    if (isMockSession) {
      if (question.isMarkedForReview) {
        // Currently marked, so clicking will unmark it
        logUnmarkForReview(question.legacyId);
      } else {
        // Currently not marked, so clicking will mark it
        logMarkForReview(question.legacyId);
      }
    }
  };
  return (
    <>
      {!hideHeader && (
        <div className="flex flex-row justify-between items-center md:px-5">
          <div className="flex flex-row justify-between items-center gap-2 bg-[#F2F2F7] h-8 w-full rounded-[4px] overflow-hidden">
            <div className="bg-black text-white font-medium h-8 w-8 flex items-center justify-center rounded-[4px_0px_0px_4px]">
              {currentPageIndex + 1}
            </div>

            {(sessionType === SessionType.PaperSession ||
              sessionType === SessionType.MockSession) && (
                <div className="flex w-full">
                  {question.isMarkedForReview ? (
                    <button
                      className="flex gap-2"
                      onClick={handleMarkForReviewClick}
                      disabled={isReadOnly}
                    >
                      <BookmarkIcon />
                      <p>Marked for Review</p>
                    </button>
                  ) : (
                    <button
                      className="flex gap-2"
                      onClick={handleMarkForReviewClick}
                      disabled={isReadOnly}
                    >
                      <BookmarkIcon fill="#0000001A" stroke="none" />
                      <p>Mark for Review</p>
                    </button>
                  )}
                </div>
              )}

            {sessionType === SessionType.PracticeSession && (
              <div
                className="px-2 relative flex flex-row items-center"
                title={`Difficulty: ${question.difficulty
                  ? question.difficulty.charAt(0).toUpperCase() +
                  question.difficulty.slice(1).toLowerCase()
                  : "Unknown"
                  }`}
              >
                <svg
                  width="22"
                  height="18"
                  viewBox="0 0 22 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect y="8.5" width="6" height="9" rx="2" fill="#05B0FF" />
                  <rect
                    x="8"
                    y="4.5"
                    width="6"
                    height="13"
                    rx="2"
                    fill={
                      question.difficulty === QuestionDifficulty.EASY
                        ? "black"
                        : "#05B0FF"
                    }
                    fillOpacity={
                      question.difficulty === QuestionDifficulty.EASY
                        ? "0.1"
                        : "1"
                    }
                  />
                  <rect
                    x="16"
                    y="0.5"
                    width="6"
                    height="17"
                    rx="2"
                    fill={
                      question.difficulty === QuestionDifficulty.HARD
                        ? "#05B0FF"
                        : "black"
                    }
                    fillOpacity={
                      question.difficulty === QuestionDifficulty.HARD
                        ? "1"
                        : "0.1"
                    }
                  />
                </svg>

                {/* <div className="font-rounded-heavy text-[rgba(0,0,0,0.5)] text-[15px] ml-2" >
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </div> */}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="pt-4 md:pt-0 md:px-6">
          <QuestionTextRenderer
            text={(() => {
              // TODO: update database to split question
              if (question.subLessonId?.includes("sat0")) {
                const text = question.questionText;
                return text;
              }
              return question.questionText;
            })()}
            diagram={question.diagram || undefined}
            decorations={decorations}
            selectedDecorationIndex={selectedDecorationIndex}
            isAnnotating={isAnnotating}
          />
        </div>

        <div
          className={`text-[15px] font-rounded-bold flex flex-row items-center gap-2 justify-end mb-5
            ${question.userMark !== undefined
              ? question.userMark === question.maxMark
                ? "text-[#7CC500]" // Green for full marks
                : question.userMark === 0
                  ? "text-[#FF4B4C]" // Red for zero marks
                  : "text-[#FFA935]" // Orange for partial marks
              : "text-[black]" // Blue if not yet answered
            }
            `}
        >
          {question.userMark !== undefined && question.maxMark < 7 && (
            <div className="flex items-center mr-2">
              {/* Render correct answer icons */}
              {Array.from({ length: question.userMark ?? 0 }, (_, index) => (
                <svg
                  key={`correct-${index}`}
                  className="mr-[-8px]"
                  width="24"
                  height="24"
                  viewBox="0 0 20 19"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19.0879 9.6543C19.0879 14.6289 14.9746 18.7422 9.99121 18.7422C5.0166 18.7422 0.90332 14.6289 0.90332 9.6543C0.90332 4.67969 5.00781 0.566406 9.98242 0.566406C14.9658 0.566406 19.0879 4.67969 19.0879 9.6543Z"
                    fill="#E4FFB7"
                    stroke="white"
                  />
                  <path
                    d="M9.79785 13.1348C9.61328 13.4248 9.34082 13.583 9.01562 13.583C8.69043 13.583 8.43555 13.4424 8.19824 13.1436L6.12402 10.6211C5.97461 10.4277 5.89551 10.2344 5.89551 10.0234C5.89551 9.58398 6.23828 9.23242 6.67773 9.23242C6.93262 9.23242 7.14355 9.3291 7.35449 9.60156L8.98926 11.667L12.4873 6.08594C12.6719 5.78711 12.9092 5.6377 13.1729 5.6377C13.5947 5.6377 13.9814 5.92773 13.9814 6.36719C13.9814 6.56934 13.8848 6.78027 13.7617 6.96484L9.79785 13.1348Z"
                    fill="#7CC500"
                  />
                </svg>
              ))}

              {/* Render incorrect answer icons */}
              {Array.from(
                { length: question.maxMark - (question.userMark ?? 0) },
                (_, index) => (
                  <svg
                    key={`incorrect-${index}`}
                    className="mr-[-8px]"
                    width="24"
                    height="24"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 9C18 13.9265 13.9285 18 8.99565 18C4.07153 18 0 13.9265 0 9C0 4.0735 4.06283 0 8.98695 0C13.9198 0 18 4.0735 18 9Z"
                      fill="#FDEEEE"
                      stroke="white"
                    />
                    <path
                      d="M6.68848 12.1084C6.53906 12.2666 6.33691 12.3457 6.1084 12.3457C5.66016 12.3457 5.30859 11.9941 5.30859 11.5459C5.30859 11.335 5.39648 11.1328 5.55469 10.9922L7.85742 8.67188L5.55469 6.36035C5.39648 6.21094 5.30859 6.01758 5.30859 5.79785C5.30859 5.34961 5.66016 5.00684 6.1084 5.00684C6.33691 5.00684 6.52148 5.08594 6.6709 5.24414L8.99121 7.54688L11.3115 5.23535C11.4785 5.06836 11.6631 4.99805 11.8828 4.99805C12.3311 4.99805 12.6826 5.34961 12.6826 5.79785C12.6826 6.00879 12.6035 6.18457 12.4365 6.35156L10.125 8.67188L12.4365 10.9834C12.5859 11.1328 12.6738 11.3262 12.6738 11.5459C12.6738 11.9941 12.3223 12.3457 11.874 12.3457C11.6367 12.3457 11.4434 12.2578 11.2939 12.1084L8.99121 9.80566L6.68848 12.1084Z"
                      fill="#FF4B4C"
                    />
                  </svg>
                )
              )}
            </div>
          )}

          {question.questionType === "spot" &&
            question.userAnswer !== undefined &&
            question?.userMark === undefined && (
              <div className="flex items-center gap-2 text-[#7CC500]">
                <p>
                  {Array.isArray(question.userAnswer)
                    ? question.userAnswer.length
                    : 0}
                  /{question.maxMark}
                </p>
              </div>
            )}

          {question?.userMark === undefined ? (
            <>
              {"["}
              {question.maxMark} {question.maxMark === 1 ? "mark]" : "marks]"}
            </>
          ) : (
            <>
              {question.userMark}/{question.maxMark}{" "}
              {question.maxMark === 1 ? "mark" : "marks"}
            </>
          )}

          <div className="flex items-center gap-4 ml-2">
            {question.userMark !== undefined && (
              <button
                className={`flex items-center font-rounded-bold 
                                  ${question.annotatedAnswer
                    ? question.userMark === question.maxMark
                      ? "text-[#7CC500]" // Green for full marks
                      : question.userMark === 0
                        ? "text-[#FF4B4C]" // Red for zero marks
                        : "text-[#FFA935]" // Orange for partial marks
                    : "text-[black]" // Black if not yet answered
                  } } z-[5]`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Add a small delay to let all event processing complete
                  setTimeout(() => {
                    if (
                      question.questionGroupId &&
                      question.legacyId &&
                      handleRetryQuestion
                    ) {
                      handleRetryQuestion(
                        question.questionGroupId,
                        question.legacyId
                      );
                    }
                  }, 50);
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
                    d="M4.12988 12.8984C4.12988 13.5049 4.62207 13.9971 5.22852 13.9971C5.84375 13.9971 6.32715 13.5049 6.32715 12.8984V12.3271C6.32715 10.8945 7.31152 9.97168 8.80566 9.97168H15.4062V11.8086C15.4062 12.3359 15.7402 12.6699 16.2764 12.6699C16.5137 12.6699 16.7334 12.582 16.9092 12.4414L20.3721 9.55859C20.8027 9.21582 20.7939 8.63574 20.3721 8.28418L16.9092 5.39258C16.7334 5.24316 16.5137 5.15527 16.2764 5.15527C15.7402 5.15527 15.4062 5.48926 15.4062 6.0166V7.80957H8.98145C6.00195 7.80957 4.12988 9.4707 4.12988 12.1162V12.8984ZM12.5938 15.3066C12.5938 14.7793 12.2598 14.4365 11.7324 14.4365C11.4951 14.4365 11.2666 14.5332 11.0908 14.6738L7.63672 17.5566C7.20605 17.8994 7.20605 18.4707 7.63672 18.8311L11.0908 21.7227C11.2666 21.8721 11.4951 21.96 11.7324 21.96C12.2598 21.96 12.5938 21.626 12.5938 21.0986V19.2969H19.0273C22.0068 19.2969 23.8701 17.627 23.8701 14.9902V14.208C23.8701 13.5928 23.3867 13.1006 22.7715 13.1006C22.165 13.1006 21.6729 13.5928 21.6729 14.208V14.7793C21.6729 16.2031 20.6973 17.1348 19.1943 17.1348H12.5938V15.3066Z"
                    fill={
                      question.userMark === question.maxMark
                        ? "#7CC500"
                        : question.userMark === 0
                          ? "#FF4B4C"
                          : "#FFA935"
                    }
                  />
                </svg>
              </button>
            )}

            {(question.userMark !== undefined ||
              process.env.NEXT_PUBLIC_ADMIN_MODE === "true") && (
                <button
                  className={`flex items-center gap-1 font-rounded-bold
                  ${question.userMark === question.maxMark
                      ? "text-[#7CC500]"
                      : question.userMark === 0
                        ? "text-[#FF4B4C]"
                        : question.userMark !== undefined
                          ? "text-[#FFA935]"
                          : "text-black"
                    }
                  z-[5]`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Add a small delay to let all event processing complete
                    setTimeout(() => {
                      if (
                        question.questionGroupId &&
                        question.legacyId &&
                        handleRetryQuestion
                      ) {
                        track("question_flagged", {
                          question_id: question.legacyId,
                        });
                        toast.error("Question reported!");
                      }
                    }, 50);
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
                      d="M5.74218 23.1601C6.15234 23.1601 6.48437 22.8379 6.48437 22.4277V16.998C6.72851 16.8906 7.64648 16.539 9.08203 16.539C12.6953 16.539 14.9609 18.3066 18.3984 18.3066C19.9218 18.3066 20.4882 18.1406 21.2304 17.8086C21.9043 17.5058 22.3437 16.998 22.3437 16.0996V6.1875C22.3437 5.66015 21.8945 5.35742 21.3281 5.35742C20.8496 5.35742 19.9511 5.76757 18.2714 5.76757C14.834 5.76757 12.5781 4 8.95507 4C7.43164 4 6.85546 4.16602 6.11328 4.49805C5.43945 4.80078 5 5.30859 5 6.19726V22.4277C5 22.8281 5.3418 23.1601 5.74218 23.1601Z"
                      fill={
                        question.userMark === question.maxMark
                          ? "#7CC500"
                          : question.userMark === 0
                            ? "#FF4B4C"
                            : question.userMark !== undefined
                              ? "#FFA935"
                              : "black"
                      }
                    />
                  </svg>
                </button>
              )}
          </div>
        </div>

        {!hideOptions && (
          <InputMethod
            currentQuestionWithMarkingResult={question}
            updateQuestionUserAnswer={updateQuestionUserAnswer}
            handleMarkAnswer={handleMarkAnswer}
            hideElimination={hideElimination}
            hideLines={hideLines}
            handleSendMessage={handleSendMessage}
            isAwaitingResponse={isAwaitingResponse}
          />
        )}
      </div>

      {/* Check answer button - only show before marking */}
      {question.userMark === undefined && (
        <div className="-mr-5 mt-4 flex items-center justify-end gap-3 rounded-[20px] px-4 py-4 relative z-10">
          <PrimaryButtonClicky
            buttonText="Check answer"
            onPress={() => {
              handleMarkAnswer({
                questionLegacyId: question.legacyId,
                markMax: question.maxMark,
                userAnswer: question.userAnswer || "",
                canvas: question.canvas,
                question: question.questionText,
                questionStem: question.questionStem,
                correctAnswer: question.correctAnswer,
                questionType: question.questionType,
                markScheme: question.markScheme,
                desmosExpressions: question.desmosExpressions,
                options: question.options as string[] | undefined,
              });
            }}
            buttonState={question.canvas || question.userAnswer ? "filled" : "filled"}
            disabled={!question.canvas && !question.userAnswer}
            showKeyboardShortcut={false}
            isLong={true}
            isLoading={isMarking}
          />
        </div>
      )}

      {/* Feedback banner - only show after marking */}
      {question.userMark !== undefined && (
        <div
          className={`-mx-10 mt-4 flex items-center gap-3 rounded-[20px] px-4 py-4 relative z-10 ${
            question.userMark === question.maxMark ? "bg-[#efffd4]" : "bg-[#FDEEEE]"
          }`}
        >
          <div
            className={`flex items-center gap-2 font-rounded-bold flex-1 ${
              question.userMark === question.maxMark ? "text-[#7CC500]" : "text-[#FF4B4C]"
            }`}
          >
            {question.userMark === question.maxMark ? (
              <TickCircleIcon fillColor="#7CC500" className="w-12 h-12" />
            ) : (
              <CrossInCircleIcon fill="#FF4B4C" width={48} height={48} />
            )}
            {question.userMark === question.maxMark ? "Correct!" : "Incorrect"}
          </div>
        </div>
      )}


      {isReadOnly && (
        // easy way to prevent inputs when readonly
        <div className="absolute left-0 top-0 w-full h-full bg-transparent"></div>
      )}
      {showShimmer && <ShimmerEffect />}
    </>
  );
}
