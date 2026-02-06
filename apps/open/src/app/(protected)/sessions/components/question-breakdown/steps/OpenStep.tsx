import { useState, useEffect, useRef } from "react";
import { MarkingResult, MarkingContext, StrategyStep } from "@/app/types/types";

interface OpenStepProps {
    step: StrategyStep;
    userAnswer: string;
    updateAnswer: (stepId: string, answer: string) => void;
    isMarking: boolean;
    isMarked: boolean;
    markingResult: MarkingResult | null;
    setIsMarked?: (isMarked: boolean) => void;
}

export default function OpenStep({
    step,
    userAnswer,
    updateAnswer,
    isMarking,
    isMarked,
    markingResult,
    setIsMarked,
}: OpenStepProps) {
    const [textAnswer, setTextAnswer] = useState<string>(userAnswer || "");
    const [isJiggling, setIsJiggling] = useState<boolean>(false);
    const lastJiggleTimeRef = useRef<number>(0);
    const jiggleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset text when userAnswer prop changes (e.g., when switching steps)
    useEffect(() => {
        setTextAnswer(userAnswer || "");
    }, [userAnswer]);

    // Trigger jiggle animation when marked incorrectly
    useEffect(() => {
        if (isMarked && markingResult && markingResult.userMark !== (step.maxMark || 1)) {
            const now = Date.now();
            // Prevent jiggling if it happened within the last 5 seconds
            if (now - lastJiggleTimeRef.current < 5000) {
                return;
            }

            lastJiggleTimeRef.current = now;
            setIsJiggling(true);

            // Clear any existing timer
            if (jiggleTimerRef.current) {
                clearTimeout(jiggleTimerRef.current);
            }

            jiggleTimerRef.current = setTimeout(() => {
                setIsJiggling(false);
                jiggleTimerRef.current = null;
            }, 500); // Animation duration
        }
    }, [isMarked, markingResult, step.maxMark]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (jiggleTimerRef.current) {
                clearTimeout(jiggleTimerRef.current);
            }
        };
    }, []);

    const handleAnswerChange = (value: string) => {
        setTextAnswer(value);
        updateAnswer(step.legacyId || `step-${step.index}`, value);

        // Reset marking state if answer was marked incorrectly and user changes input
        if (isMarked && markingResult?.userMark !== (step.maxMark || 1) && setIsMarked) {
            setIsMarked(false);
        }
    };

    return (
        <div className={`relative ${isJiggling ? 'animate-jiggle' : ''}`}>
            <textarea
                value={textAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Enter your answer here..."
                className="w-full p-4 pb-8 bg-[#F7F7FB] border border-[#ECEBF2] rounded-[24px] focus:outline-none resize-none font-['Shantell_Sans'] font-[500]"
                rows={4}
                disabled={isMarking}
            />
            <div className="absolute bottom-4 right-4 text-sm font-rounded-bold text-black/20 pointer-events-none">
                {textAnswer.trim() ? textAnswer.trim().split(/\s+/).length : 0} words
            </div>

            {/* {isMarked && markingResult && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center">
                        {markingResult.userMark === questionData.maxMark ? (
                            <div className="text-green-600 font-medium">✓ Correct!</div>
                        ) : (
                            <div className="text-red-600 font-medium">✗ Incorrect</div>
                        )}
                    </div>
                    {markingResult.userMark !== questionData.maxMark && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">
                                Sample correct answer:
                            </p>
                            <p className="text-sm bg-white p-2 rounded border">
                                {questionData.correctAnswer}
                            </p>
                        </div>
                    )}
                </div>
            )} */}

            <style jsx>{`
                @keyframes jiggle {
                    0%, 100% { transform: translateX(0); }
                    10% { transform: translateX(-8px); }
                    20% { transform: translateX(8px); }
                    30% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    50% { transform: translateX(-4px); }
                    60% { transform: translateX(4px); }
                    70% { transform: translateX(-2px); }
                    80% { transform: translateX(2px); }
                    90% { transform: translateX(-1px); }
                }
                .animate-jiggle {
                    animation: jiggle 0.8s ease-in-out;
                }
            `}</style>
        </div>
    );
} 