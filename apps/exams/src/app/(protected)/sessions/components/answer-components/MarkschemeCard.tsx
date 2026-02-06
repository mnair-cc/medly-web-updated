import React from "react";
import MarkSchemePoints from "../question-components/MarkSchemePoints";
import MarkingPoints from "../question-components/MarkingPoints";
import { QuestionWithMarkingResult } from "@/app/types/types";

interface MarkschemeCardProps {
    currentQuestionWithMarkingResult: QuestionWithMarkingResult;
    question: QuestionWithMarkingResult;
    index: number;
    getQuestionHeading: (question: QuestionWithMarkingResult, index: number) => string;
    showMarkScheme?: boolean;
}

const MarkschemeCard: React.FC<MarkschemeCardProps> = ({
    currentQuestionWithMarkingResult,
    question,
    index,
    getQuestionHeading,
    showMarkScheme = false,
}) => {
    const shouldShowMarkScheme = currentQuestionWithMarkingResult.markScheme && showMarkScheme;
    return (
        <div className="flex flex-col gap-2 p-4 rounded-2xl border border-gray-100 z-[100] mb-2">
            {shouldShowMarkScheme ? (
                <>
                    <p className="text-[15px] font-rounded-bold text-[#BCBCBE]">
                        Explanation
                    </p>
                    <MarkSchemePoints
                        markScheme={currentQuestionWithMarkingResult.markScheme || []}
                    />
                </>
            ) : (
                <>
                    <p className="text-[15px] font-rounded-bold text-[#BCBCBE]">
                        {getQuestionHeading(question, index)}
                    </p>
                    <MarkingPoints
                        markingTable={question.markingTable || ""}
                        markMax={question.maxMark}
                        userMark={question.userMark || 0}
                    />
                </>
            )}
        </div>
    );
};

export default MarkschemeCard;
