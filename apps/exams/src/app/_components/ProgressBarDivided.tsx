import {
  QuestionAnswer,
  QuestionCanvas,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import { useUser } from "../_context/UserProvider";

const ProgressBarDivided = ({
  currentPage,
  currentQuestionIndex,
  hasInsert = false,
  setCurrentQuestionIndex,
  setCurrentPage,
  questionGroupsWithMarkingResults,
  questionCanvases,
  questionAnswers,
}: {
  currentPage: "cover" | "question" | "insert";
  currentQuestionIndex: number;
  hasInsert: boolean;
  setCurrentQuestionIndex: (index: number) => void;
  setCurrentPage: (page: "cover" | "question" | "insert") => void;
  questionGroupsWithMarkingResults: QuestionWithMarkingResult[][];
  questionCanvases: QuestionCanvas;
  questionAnswers: QuestionAnswer;
}) => {
  const groupProgresses = questionGroupsWithMarkingResults.map((group) => {
    if (!group || group.length === 0) return 0;

    // Check if any 'EngLit' questions are answered
    const hasAnyEngLitAnswered = group.some((q) => {
      if (!q.legacyId.includes("EngLit")) return false;

      const legacyId = q.legacyId;
      const canvas = questionCanvases[legacyId];
      const hasCanvasContent =
        (canvas?.paths?.length ?? 0) > 0 ||
        ((canvas?.textboxes?.length ?? 0) > 0 &&
          canvas?.textboxes?.some(
            (textbox) => textbox.text.trim().length > 0
          )) ||
        (canvas?.maths?.length ?? 0) > 0;
      const hasAnswer = !!questionAnswers[legacyId];
      const hasMarkingResult =
        (q.canvas?.paths?.length ?? 0) > 0 ||
        ((q.canvas?.textboxes?.length ?? 0) > 0 &&
          q.canvas?.textboxes?.some(
            (textbox) => textbox.text.trim().length > 0
          )) ||
        (q.canvas?.maths?.length ?? 0) > 0 ||
        !!q.userAnswer;

      return hasCanvasContent || hasAnswer || hasMarkingResult;
    });

    const answeredCount = group.filter((q) => {
      // If it's an EngLit question and any EngLit question is answered, consider it answered
      if (q.legacyId.includes("EngLit") && hasAnyEngLitAnswered) {
        return true;
      }

      const legacyId = q.legacyId;
      const canvas = questionCanvases[legacyId];
      const hasCanvasContent =
        (canvas?.paths?.length ?? 0) > 0 ||
        ((canvas?.textboxes?.length ?? 0) > 0 &&
          canvas?.textboxes?.some(
            (textbox) => textbox.text.trim().length > 0
          )) ||
        (canvas?.maths?.length ?? 0) > 0;
      const hasAnswer = !!questionAnswers[legacyId];
      const hasMarkingResult =
        (q.canvas?.paths?.length ?? 0) > 0 ||
        ((q.canvas?.textboxes?.length ?? 0) > 0 &&
          q.canvas?.textboxes?.some(
            (textbox) => textbox.text.trim().length > 0
          )) ||
        (q.canvas?.maths?.length ?? 0) > 0 ||
        !!q.userAnswer;

      return hasCanvasContent || hasAnswer || hasMarkingResult;
    }).length;

    return Math.round((answeredCount / group.length) * 100);
  });

  const { user } = useUser();
  const avatar = user?.avatar;

  return (
    <div className="flex gap-2 w-full">
      <div
        onClick={() => {
          setCurrentPage("cover");
          setCurrentQuestionIndex(0);
        }}
        className={`h-3 rounded-full flex-1 max-w-12 relative cursor-pointer ${
          currentPage !== "cover" ? "bg-[#F2F2F7]" : ""
        }`}
      >
        {currentPage === "cover" && (
          <div className="absolute inset-[-5px] rounded-full border-2 border-[#B4E7FF]"></div>
        )}
        <div
          className={`h-full rounded-full ${
            currentPage !== "cover" ? "bg-[#F2F2F7]" : ""
          } relative`}
        >
          <div
            className="h-full rounded-full bg-[#00AEFF] absolute top-0 left-0"
            style={{
              width: "100%",
            }}
          />
          {avatar && currentPage == "cover" && (
            <div className="absolute top-1/2 -translate-y-1/2 ml-1.5 text-4xl z-[1000]">
              {avatar}
            </div>
          )}
        </div>
      </div>

      {hasInsert && (
        <div
          onClick={() => {
            setCurrentPage("insert");
            setCurrentQuestionIndex(0);
          }}
          className={`h-3 rounded-full flex-1 max-w-12 relative cursor-pointer ${
            currentPage !== "insert" ? "bg-[#F2F2F7]" : ""
          }`}
        >
          {currentPage === "insert" && (
            <div className="absolute inset-[-5px] rounded-full border-2 border-[#B4E7FF]"></div>
          )}
          <div
            className={`h-full rounded-full ${
              currentPage !== "insert" ? "bg-[#F2F2F7]" : ""
            } relative`}
          >
            <div
              className="h-full rounded-full bg-[#00AEFF] absolute top-0 left-0"
              style={{
                width: "100%",
              }}
            />
            {avatar && currentPage == "insert" && (
              <div className="absolute top-1/2 -translate-y-1/2 ml-1.5 text-4xl z-[1000]">
                {avatar}
              </div>
            )}
          </div>
        </div>
      )}

      {groupProgresses.map((groupProgress, index) => {
        return (
          <div
            onClick={() => {
              setCurrentQuestionIndex(index);
              setCurrentPage("question");
            }}
            key={index}
            className={`h-3 rounded-full flex-1 relative cursor-pointer ${
              index !== currentQuestionIndex ? "bg-[#F2F2F7]" : ""
            }`}
          >
            {currentPage !== "cover" &&
              currentPage !== "insert" &&
              index === currentQuestionIndex && (
                <div className="absolute inset-[-5px] rounded-full border-2 border-[#B4E7FF]"></div>
              )}
            <div
              className={`h-full rounded-full ${
                index === currentQuestionIndex ? "bg-[#F2F2F7]" : ""
              } relative`}
            >
              <div
                className="h-full rounded-full bg-[#00AEFF] absolute top-0 left-0"
                style={{
                  width: `${groupProgress}%`,
                }}
              />
              {avatar &&
                currentPage !== "cover" &&
                currentPage !== "insert" &&
                index === currentQuestionIndex && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-4xl z-[1000]"
                    style={{
                      left: `${Math.max(10, Math.min(groupProgress, 95))}%`,
                    }}
                  >
                    {avatar}
                  </div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressBarDivided;
