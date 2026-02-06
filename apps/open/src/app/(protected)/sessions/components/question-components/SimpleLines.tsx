import { QuestionWithMarkingResult } from "@/app/types/types";

const SimpleLines = ({
  questionWithMarkingResult,
}: {
  questionWithMarkingResult: QuestionWithMarkingResult;
}) => {
  return (
    <div
      className="lined-paper"
      style={{
        height: `${
          (questionWithMarkingResult.maxMark || 1) *
          (questionWithMarkingResult.legacyId?.includes("Maths") ? 4 : 2) *
          30
        }px`,
        backgroundColor: "transparent",
        backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "100% 30px",
        backgroundPosition: "0 29px",
        lineHeight: "30px",
        paddingTop: "0px",
        marginBottom: "64px",
      }}
    />
  );
};

export default SimpleLines;
