import React from "react";
import CircularProgressBar from "@/app/_components/CircularProgressBar";

interface ImprovementCardProps {
  title: string;
  description: string;
  additionalDescription: string;
  questionCount: number;
  additionalMarks: number;
  attemptedCount: number;
  progressColor: string; // Color for the actual progress bar
  progressBackgroundColor: string; // Background color for the progress circle
  borderColor: string;
  backgroundColor: string;
}

const ImprovementCard = ({
  title,
  description,
  additionalDescription,
  questionCount,
  additionalMarks,
  attemptedCount,
  progressColor,
  progressBackgroundColor,
  borderColor,
  backgroundColor,
}: ImprovementCardProps) => {
  const progressPercentage =
    questionCount > 0 ? (attemptedCount / questionCount) * 100 : 0;

  return (
    <div
      className={`p-6 border rounded-[24px] flex flex-col gap-4`}
      style={{ borderColor, backgroundColor }}
    >
      <div className="flex flex-row items-center justify-between">
        <h3 className="font-rounded-bold text-lg">{title}</h3>
        <div className="flex items-center gap-2">
          <CircularProgressBar
            progress={progressPercentage}
            size={20}
            strokeWidth={4}
            strokeColor={progressColor}
            backgroundStrokeColor={progressBackgroundColor}
          />
          <span className="text-sm text-[#000000] font-rounded-bold">
            {attemptedCount}
            <span className="text-[8px]">/{questionCount}</span>
          </span>
        </div>
      </div>
      <p className="text-[15px]">{description}</p>
      <p className="text-[15px]">
        {additionalDescription} <strong>{additionalMarks} marks</strong>.
      </p>
    </div>
  );
};

export default ImprovementCard;
