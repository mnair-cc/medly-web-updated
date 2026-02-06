import React from "react";
import CircularProgressBar from "@/app/_components/CircularProgressBar";
import FeedbackPoints from "../question-components/FeedbackPoints";

interface FeedbackCardProps {
    label: string;
    score: number;
    maxScore: number;
    progress: number;
    strokeColor?: string;
    feedbackPoints: { text: string; mark: number }[];
    isLastCard?: boolean;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({
    label,
    score,
    maxScore,
    progress,
    strokeColor = "#06B0FF",
    feedbackPoints,
    isLastCard = false,
}) => {
    return (
        <div className="flex flex-col gap-2 px-4 z-[100] mt-2 mb-2">
            <div className="flex flex-row justify-between">
                <p className="text-[15px] font-rounded-bold text-[#BCBCBE]">
                    {label}
                </p>
                <div className="flex flex-row items-center gap-2">
                    <div className={`ml-2`}>
                        <span className="font-rounded-bold text-[15px]">
                            {score}
                        </span>
                        <span className="font-rounded-bold text-[10px]">
                            /{maxScore}
                        </span>
                    </div>
                    <CircularProgressBar
                        progress={progress}
                        strokeColor={strokeColor}
                        size={24}
                        strokeWidth={4}
                    />
                </div>
            </div>
            <FeedbackPoints feedbackPoints={feedbackPoints} />
            <div className={`${isLastCard ? "mb-2" : "border-t border-[#F2F2F7] mt-2 mb-2"}`} />
        </div>
    );
};

export default FeedbackCard;
