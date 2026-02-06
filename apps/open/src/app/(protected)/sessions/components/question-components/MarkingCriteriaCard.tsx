import MarkingPoints from "./MarkingPoints";
import { QuestionWithMarkingResult } from "@/app/types/types";

const MarkingCriteriaCard = ({
  questionWithMarkingResult,
  index,
  handleRemark,
  handleAskMedly,
  isMarking,
}: {
  questionWithMarkingResult: QuestionWithMarkingResult;
  index: number;
  handleRemark: () => void;
  handleAskMedly: () => void;
  isMarking: boolean;
}) => {
  return (
    <div
      className={`w-[280px] flex flex-col mb-10 ${
        questionWithMarkingResult.legacyId.includes("aqaGCSEEng")
          ? "justify-start mt-20"
          : "justify-end"
      }`}
    >
      {(questionWithMarkingResult.userAnswer ||
        (questionWithMarkingResult.canvas?.textboxes?.length !== undefined &&
          questionWithMarkingResult.canvas?.textboxes?.length > 0) ||
        questionWithMarkingResult.markingTable) && (
        <div
          className="bg-white border border-[#E9E9F0] rounded-[16px] p-4 flex flex-col gap-2 transition-all duration-300"
          style={{
            transform: "translateY(0)",
            opacity: 1,
            animation: `fadeInUp 0.3s ease-out ${index * 0.3}s both`,
          }}
        >
          <div className="flex flex-row gap-2 justify-between">
            <p
              className={`text-base font-rounded-heavy 
                                  ${
                                    questionWithMarkingResult.markingTable &&
                                    questionWithMarkingResult.markingTable
                                      .length > 10
                                      ? questionWithMarkingResult.userMark ===
                                        questionWithMarkingResult.maxMark
                                        ? "text-[#7CC500]" // Green for full marks
                                        : questionWithMarkingResult.userMark ===
                                            0
                                          ? "text-[#FF4B4C]" // Red for zero marks
                                          : "text-[#FFA935]" // Orange for partial marks
                                      : "text-[black]" // Blue if not yet answered
                                  }
                                  `}
            >
              {!questionWithMarkingResult.markingTable ||
              questionWithMarkingResult.markingTable.length < 10
                ? `/${questionWithMarkingResult.maxMark} marks`
                : `${questionWithMarkingResult.userMark}/${questionWithMarkingResult.maxMark} marks`}
            </p>
          </div>

          <MarkingPoints
            markingTable={questionWithMarkingResult.markingTable}
            markMax={questionWithMarkingResult.maxMark}
            userMark={questionWithMarkingResult.userMark}
          />

          <div className="flex w-full flex-row gap-2 justify-end">
            {!questionWithMarkingResult.markingTable ||
            questionWithMarkingResult.markingTable.length < 10 ? (
              <button
                disabled={isMarking}
                onClick={() => {
                  handleRemark();
                }}
                className="px-3 py-1.5 bg-[#F9F9FB] rounded-lg inline-flex justify-start items-center gap-1 hover:bg-[#F2F2F7] transition-all duration-150"
              >
                <div className="text-center justify-start text-black text-sm">
                  {isMarking ? "Marking..." : "Mark Answer"}
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  handleAskMedly();
                }}
                className="px-3 py-1.5 bg-[#F9F9FB] rounded-lg inline-flex justify-start items-center gap-1 hover:bg-[#F2F2F7] transition-all duration-150"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.33245 12.4785C7.71917 12.4785 8.01046 12.1922 8.01046 11.8005V10.0025H8.13602C9.96917 10.0025 11.0891 10.5399 11.8777 12.0064C12.0785 12.373 12.3196 12.4584 12.5858 12.4584C12.9374 12.4584 13.2086 12.127 13.2086 11.4891C13.2086 7.84291 11.5964 5.61802 8.13602 5.61802H8.01046V3.83008C8.01046 3.43834 7.71917 3.12695 7.3224 3.12695C7.05622 3.12695 6.86537 3.23744 6.57408 3.50865L2.5964 7.21512C2.40053 7.40095 2.3252 7.61189 2.3252 7.80273C2.3252 7.98856 2.40053 8.20452 2.5964 8.39035L6.57408 12.1219C6.84026 12.373 7.05622 12.4785 7.33245 12.4785ZM7.01102 11.1828C6.98591 11.1828 6.95578 11.1677 6.92564 11.1426L3.4954 7.89816C3.45522 7.85798 3.44015 7.83287 3.44015 7.80273C3.44015 7.7726 3.45522 7.74749 3.4954 7.70731L6.92564 4.43276C6.95075 4.40765 6.98089 4.39258 7.01102 4.39258C7.05622 4.39258 7.08636 4.42271 7.08636 4.46791V6.36635C7.08636 6.48186 7.13658 6.53209 7.25209 6.53209H7.89495C11.1293 6.53209 12.2644 8.66657 12.3497 11.0622C12.3497 11.0974 12.3347 11.1124 12.3096 11.1124C12.2895 11.1124 12.2794 11.0974 12.2644 11.0672C11.6667 9.81166 10.1952 9.08343 7.89495 9.08343H7.25209C7.13658 9.08343 7.08636 9.13365 7.08636 9.24916V11.1024C7.08636 11.1526 7.05622 11.1828 7.01102 11.1828Z"
                    fill="#1C1C1E"
                  />
                </svg>
                <div className="text-center justify-start text-black text-sm">
                  Ask Medly
                </div>
              </button>
            )}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            transform: translateY(16px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default MarkingCriteriaCard;
