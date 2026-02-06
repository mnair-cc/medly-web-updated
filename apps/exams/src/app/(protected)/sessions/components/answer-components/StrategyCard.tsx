import React from "react";
import StrategyPoints from "../question-components/StrategyPoints";
import { StrategyStep } from "@/app/types/types";

interface StrategyCardProps {
    title?: string;
    strategySteps: StrategyStep[];
    currentStepIndex: number;
    isMarked: boolean;
    userMark: number;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
    title = "Strategy",
    strategySteps,
    currentStepIndex,
    isMarked,
    userMark,
}) => {
    return (
        <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[#F2F2F7] z-[100]">
            <p className="text-[15px] font-rounded-bold text-[#BCBCBE]">
                {title}
            </p>
            <StrategyPoints
                strategySteps={strategySteps}
                currentStepIndex={currentStepIndex}
                isMarked={isMarked}
                userMark={userMark}
            />
        </div>
    );
};

export default StrategyCard;
