import React from "react";
import ImprovementCard from "./ImprovementCard";

interface FoundationGapsCardProps {
  questionCount: number;
  additionalMarks: number;
  attemptedCount: number; // Number of questions that have been reattempted
}

const FoundationGapsCard = ({
  questionCount,
  additionalMarks,
  attemptedCount,
}: FoundationGapsCardProps) => {
  return (
    <ImprovementCard
      title="Foundation Gaps"
      description="You demonstrated a basic level of understanding in these questions."
      additionalDescription="Furthering your knowledge would gain you an additional"
      questionCount={questionCount}
      additionalMarks={additionalMarks}
      attemptedCount={attemptedCount}
      progressColor="#06B0FF"
      progressBackgroundColor="#06B0FF33"
      borderColor="#06B0FF33"
      backgroundColor="#06B0FF0D"
    />
  );
};

export default FoundationGapsCard;
