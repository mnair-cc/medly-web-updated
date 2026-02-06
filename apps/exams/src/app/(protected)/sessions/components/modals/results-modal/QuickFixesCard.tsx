import ImprovementCard from "./ImprovementCard";

interface QuickFixesCardProps {
  questionCount: number;
  additionalMarks: number;
  attemptedCount: number; // Number of questions that have been reattempted
}

const QuickFixesCard = ({
  questionCount,
  additionalMarks,
  attemptedCount,
}: QuickFixesCardProps) => {
  return (
    <ImprovementCard
      title="Quick Fixes"
      description="You answers were nearly there!"
      additionalDescription="Small improvements would gain you an additional"
      questionCount={questionCount}
      additionalMarks={additionalMarks}
      attemptedCount={attemptedCount}
      progressColor="#7CC500"
      progressBackgroundColor="#7CC50040"
      borderColor="#7CC50033"
      backgroundColor="#F9FFF0"
    />
  );
};

export default QuickFixesCard;
