import React from "react";
import { QuestionDifficulty } from "@/app/types/types";

interface TimingCardProps {
    durationSpentInSeconds: number;
    isMarked: boolean;
    subLessonId?: string;
    difficulty?: QuestionDifficulty;
}

const TimingCard: React.FC<TimingCardProps> = ({
    durationSpentInSeconds,
    isMarked,
    subLessonId,
    difficulty,
}) => {
    if (!durationSpentInSeconds || !isMarked) {
        return null;
    }

    // Calculate recommended time based on sublessonId and difficulty
    const getRecommendedTime = (): number => {
        const isSat0 = subLessonId?.includes('sat0');
        const isSat1 = subLessonId?.includes('sat1');

        if (isSat0) {
            // SAT0 (math): 30, 60, 90
            switch (difficulty) {
                case QuestionDifficulty.EASY: return 30;
                case QuestionDifficulty.MEDIUM: return 60;
                case QuestionDifficulty.HARD: return 90;
                default: return 60;
            }
        } else if (isSat1) {
            // SAT1 (math): 45, 90, 120
            switch (difficulty) {
                case QuestionDifficulty.EASY: return 45;
                case QuestionDifficulty.MEDIUM: return 90;
                case QuestionDifficulty.HARD: return 120;
                default: return 90;
            }
        } else {
            // Default fallback
            switch (difficulty) {
                case QuestionDifficulty.EASY: return 30;
                case QuestionDifficulty.MEDIUM: return 60;
                case QuestionDifficulty.HARD: return 90;
                default: return 60;
            }
        }
    };

    const recommendedTime = getRecommendedTime();
    const maxTime = 180;
    const timeSpent = durationSpentInSeconds;
    const progressPercentage = Math.min((timeSpent / maxTime) * 100, 100);
    const recommendedPercentage = (recommendedTime / maxTime) * 100;
    const progressColor = timeSpent <= recommendedTime ? '#98E339' : '#FF8E05';

    return (
        <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[#F2F2F7] z-[100]">
            <div className="flex flex-row justify-between">
                <p className="text-[15px] font-rounded-bold text-[#BCBCBE]">Timing</p>
                <p className="text-[24px] font-rounded-heavy">
                    {timeSpent}
                    <span className="text-[15px] font-rounded-bold">s</span>
                </p>
            </div>

            <div className="relative">
                <div className="h-4 w-full bg-[#F2F2F7] rounded-full overflow-hidden relative flex items-center">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${progressPercentage}%`,
                            backgroundColor: progressColor
                        }}
                    />
                    <div
                        className="h-3 w-3 bg-white rounded-full absolute m-1"
                        style={{
                            left: `calc(${recommendedPercentage}% - 20px)`
                        }}
                    />
                </div>
            </div>

            <div className="flex justify-between w-full -mt-1 px-1">
                {[0, 45, 90, 135, 180].map((time) => (
                    <span
                        key={time}
                        className="text-[12px] font-rounded-bold"
                        style={{
                            color: "#C0C0C9"
                        }}
                    >
                        {time}s
                    </span>
                ))}
            </div>

            <div
                className="w-full flex flex-col items-start justify-center -mt-2"
                style={{
                    marginLeft: `${recommendedPercentage}%`,
                    transform: 'translateX(-18%)'
                }}
            >
                <div className="flex flex-col items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.02853 6.31431L5.96854 6.31431C6.35777 6.31431 6.60889 6.02553 6.60889 5.67146C6.60889 5.56599 6.58126 5.45801 6.52602 5.35756L4.55225 1.83189C4.43171 1.61342 4.21575 1.50293 3.99979 1.50293C3.78383 1.50293 3.56536 1.61342 3.44482 1.83189L1.47356 5.35756C1.41832 5.46052 1.38818 5.56599 1.38818 5.67146C1.38818 6.02553 1.6393 6.31431 2.02853 6.31431Z" fill="#D3D3D3" />
                    </svg>
                    <p
                        className="text-[12px] leading-none font-rounded-bold"
                        style={{
                            color: "#C0C0C9"
                        }}
                    >
                        Recommended
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TimingCard;