import { useState } from "react";
import { MarkingResult, MarkingContext, StrategyStep } from "@/app/types/types";

interface CalculateStepProps {
    step: StrategyStep;
    userAnswer: string;
    updateAnswer: (stepId: string, answer: string) => void;
    isMarking: boolean;
    isMarked: boolean;
    markingResult: MarkingResult | null;
}

export default function CalculateStep({
    step,
    userAnswer,
    updateAnswer,
    isMarking,
    isMarked,
    markingResult,
}: CalculateStepProps) {
    const [textAnswer, setTextAnswer] = useState<string>(userAnswer || "");

    const handleAnswerChange = (value: string) => {
        setTextAnswer(value);
        updateAnswer(step.legacyId || `step-${step.index}`, value);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">{step.heading}</h3>

                <div className="mb-4">
                    <textarea
                        value={textAnswer}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="Show your working and final answer here..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={6}
                        disabled={isMarked || isMarking}
                    />
                </div>

                <div className="text-xs text-gray-500 mb-4">
                    <p>Tips for calculation questions:</p>
                    <ul className="list-disc list-inside ml-2 mt-1">
                        <li>Show all your working steps</li>
                        <li>Include units where appropriate</li>
                        <li>Round your final answer appropriately</li>
                    </ul>
                </div>
            </div>

            {isMarked && markingResult && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center">
                        {markingResult.userMark === (step.maxMark || 1) ? (
                            <div className="text-green-600 font-medium">✓ Correct!</div>
                        ) : (
                            <div className="text-red-600 font-medium">✗ Incorrect</div>
                        )}
                    </div>
                    {markingResult.userMark !== (step.maxMark || 1) && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">
                                Sample solution:
                            </p>
                            <p className="text-sm bg-white p-2 rounded border font-mono">
                                {step.correctAnswer}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 